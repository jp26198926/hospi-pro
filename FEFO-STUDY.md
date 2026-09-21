# FEFO Study — hospi-pro inventory

**Status:** **Implemented** (full delivery, no product phasing).  
Defaults: null expiry = FEFO last; optional manual batch on releasing; inventory history truncated via `npm run db:truncate-inventory`. Runtime rules: AGENTS.md FEFO bullet.

This document remains the design reference.

---

## 1. Your question (short answer)

> Receiving has a batch # — should releasing scan use that batch?

**Recommendation: do not make batch scanning the primary FEFO path.**

| Approach | Fit for your system |
|----------|---------------------|
| **Scan batch # on every release line** | Accurate but slow; easy to mis-scan; fails when staff only have product barcode |
| **Scan product only; system allocates FEFO on Complete** (recommended) | Matches current scan UX; expiry order enforced in the posting transaction |
| **Hybrid (recommended long-term)** | Default **auto-FEFO** on Complete; optional **manual batch pick** (or batch scan mode) when the user must force a lot |

Batch # today is **not a real inventory key** — it is a **display label** derived from the receiving line id (`BATCH-######`). That is not enough for FEFO by itself.

---

## 2. What exists today (evidence)

### 2.1 Products (`lib/db/schema.ts` ~336–358)

- Aggregates only: `stock`, `minStock`, `lastCost`, `avgCost`, uom/category, etc.
- **No** expiry or batch on the product master (correct — expiry is per lot, not per SKU).

### 2.2 Receiving items (`receiving_items` ~157–178)

| Field | Notes |
|-------|--------|
| `qty`, `unitCost`, `totalCost` | Costed lines |
| **`dateExpiry`** | `timestamp with time zone`, **nullable** — already captured in receiving item form (`DatePicker` “Expiry”) |
| **Batch #** | **No `batchNo` column.** UI/print shows `item.batchNo` **or** `BATCH-${id padded}` (`receiving-items-columns.tsx`, `receiving-detail-client.tsx`) |

So: **expiry data is entered** on receive, but **not used** when stock is posted or released.

### 2.3 Releasing items (`releasing_items` ~201–220)

- `qty`, optional **`dateExpiry`**, remarks.
- Form has an **Expiry DatePicker** (optional) — **not** a batch picker, **not** FEFO-driven.
- Complete path does **not** read `dateExpiry`.

### 2.4 Stock balance model

| Table | Key | Qty meaning |
|-------|-----|-------------|
| **`stock_levels`** | unique `(productId, locationId)` | Single on-hand qty per SKU+location |
| **`products.stock`** | per product | Running total (all locations) |
| **`stock_movements`** | trail | Signed qty; `referenceTransId` / `referenceItemId`; **no batch/expiry columns** |

There is **no lot ledger**. FEFO cannot be computed from `stock_levels` alone.

### 2.5 Posting behavior

**Complete receiving** (`lib/receiving-stock.ts`):

- For each draft item: insert `stock_movements` (+qty, trans **Receiving**), upsert `stock_levels.qty`, update `products.stock` / costs.
- **Does not** persist `dateExpiry` or batch into any balance table.

**Complete releasing** (`lib/releasing-stock.ts`):

- Validates **`stock_levels.qty >= item.qty`** at `fromLocationId` (total, not by expiry).
- Inserts movement (−qty), reduces `stock_levels` + `products.stock`.
- **Ignores** expiry; any stock can leave regardless of lot age.

### 2.6 Scan (`app/api/products/scan/route.ts`)

- Resolves **product by barcode** (with `5*CODE` qty syntax historically).
- **No batch/expiry** in the scan contract.

### 2.7 Transfers / adjustments / conversions

- Transfer items have optional `dateExpiry` (same as releasing) — not used in `transfer-stock.ts`.
- Adjustments/conversions are product+location only — **no lot dimension**.

---

## 3. Gaps for true FEFO

1. **No on-hand by batch/expiry** — need a lot balance (or reconstruct from receive lines + all outbound allocations — fragile).
2. **Receive complete drops expiry** — `dateExpiry` stays on the document line only.
3. **Release complete is FIFO-less / FEFO-less** — single `stock_levels` bucket.
4. **Scan is product-only** — fine if allocation is server-side; insufficient if you want staff to pick lot at the scanner.
5. **Batch # is synthetic** — not stable inventory identity if you delete/re-enter lines; better a real `batchNo` or lot id on receive.
6. **Other stock ops** (transfer, adj, conversion, cancel reverse) must touch the **same lot balances** or sums drift from `stock_levels`/`products.stock`.
7. **Historical data** — existing `stock_levels.qty` has no lot split; migration strategy required.
8. **Expiry optional** — many lines may have `dateExpiry = null`; define sort: nulls last (or treat as far future) then earliest expiry first.

---

## 4. Target design (recommended)

### 4.1 New table: `inventory_batches` (or `stock_level_batches`)

Project conventions: `bigserial` PK, `decimal(10, 4)` qty, `timestamp withTimezone`, soft delete optional (balances usually hard row + qty 0).

```
inventory_batches
  id
  productId      FK products
  locationId     FK locations
  batchNo        text not null          -- user-facing; unique per product+location optional
  dateExpiry     timestamp tz null      -- null = no expiry / FEFO last
  qty            decimal(10,4) not null default 0
  unitCost       decimal(10,4) optional -- if you want batch costing later
  sourceType     text                   -- 'Receiving' | 'Transfer' | 'Adjustment' | ...
  sourceItemId   bigint null            -- receiving_items.id etc.
  status         Active/Deleted        -- or omit; qty=0 is enough
  created/updated audit columns
  UNIQUE or index (productId, locationId, batchNo)  -- business key
```

**Invariant (after every complete posting):**

```
SUM(inventory_batches.qty) for (product, location) = stock_levels.qty
SUM over locations ≈ products.stock  (same as today)
```

### 4.2 Receiving

- On item save: encourage **Batch No** (prefill `BATCH-{receivingId}-{line}` or supplier lot) + **Expiry** (optional but recommended for inventoriable goods).
- On **Complete receiving** (`lib/receiving-stock.ts`):
  - Upsert batch row for `(productId, locationId, batchNo)` **+qty**
  - Set/copy `dateExpiry` from the receiving line
  - Keep existing `stock_movements` / `stock_levels` / `products.stock` updates
  - Optionally stamp movement `remarks` or future column with batchNo for trail readability

### 4.3 Releasing — FEFO allocation (core)

On **Complete releasing** (inside the same `db.transaction`):

```
for each draft releasing item:
  need = item.qty
  candidates = batches where productId, locationId = fromLocation
               and qty > 0
               order by (dateExpiry nulls last), dateExpiry asc, id asc  -- FEFO
  if sum(qty) < need: throw Insufficient stock for product X (by lot)
  for each candidate while need > 0:
    take = min(batch.qty, need)
    batch.qty -= take
    need -= take
    insert stock_movements (−take) tied to releasing + batch (see below)
  update stock_levels / products.stock as today (total −item.qty once)
```

**UI:**

- Default: user enters **product + qty** only; system shows **preview** “Will allocate from: BATCH-A exp 2026-03-01 qty 10; BATCH-B …” after qty (API like `/api/releasings/preview-fefo?productId&locationId&qty`).
- Optional advanced: **Manual batch lines** (override FEFO) for controlled drugs / forced lot.
- Optional later: **scan batch barcode** to pin `batchNo` on the line; still validate remaining qty on that lot.

### 4.4 Stock movements & traceability

Minimum viable:

- Keep one movement per take **or** one movement per releasing line + `remarks` listing batches consumed.
- Better: add nullable **`batchId`** / **`batchNo`** / **`dateExpiry`** on `stock_movements` (migration) so Stock Movement trail and Report Inventory can show lots later.

Without movement batch fields, audit is only in `inventory_batches` history (consider append-only `inventory_batch_ledger` if you need full lot trace).

### 4.5 Other documents (phase 2+)

| Module | FEFO impact |
|--------|-------------|
| **Transfers** | Out: allocate FEFO at from-location; In: create/merge batch at to-location with **same** expiry/batchNo |
| **Adjustments +** | Add qty to a batch (pick or default “ADJ-” lot); **−** must pick batch or FEFO reverse |
| **Adjustment/Releasing cancel** | Reverse the **same batches** taken (store allocation on the document for true reverse) |
| **Conversions** | Consume FEFO on from-product; create new batch on to-product (expiry policy: inherit min expiry or blank) |
| **Report Inventory** | Optional “by batch” mode later |

### 4.6 Scan — answer in practice

| Mode | Behavior |
|------|----------|
| **Default (Phase 1)** | Scan **product** → add line qty → Complete = **auto FEFO**. Staff never type batch. |
| **Phase 2 optional** | Scan product then batch label, or `PRODUCT|BATCH` format → lock line to that `batchNo` if qty remains |
| **Do not** | Require batch scan for every kitchen/warehouse release unless your process demands it |

So: **use receiving batch as the inventory lot identity**, but **do not require the user to scan it on release** for FEFO to work — the system should pick that batch when it is the earliest expiry.

---

## 5. Suggested phases (when you say “go”)

### Phase 0 — Policy decisions (you confirm)

1. Is **Expiry required** on receiving for inventoriable products, or optional?
2. **Null expiry** sort: treat as far future (release last) or block release?
3. Allow **negative lot qty**? (Recommend **no** — hard fail like today.)
4. Manual batch override on release: yes/no for v1?
5. Keep dual totals (`stock_levels` + `products.stock`) as source for reports, or move reports to batch sums?

### Phase 1 — Schema + receiving (foundation)

1. Drizzle: `inventory_batches`; optional `batchNo` on `receiving_items` (store what you print today).
2. API validation on receiving item create/update: expiry format; optional unique batchNo per product+location.
3. `completeReceiving`: create/increase batch from each line (`batchNo` + `dateExpiry` + qty).
4. `cancel` completed receiving: decrease the **same** batches linked via `sourceItemId`.
5. Read-only UI: “Batches” panel on receiving detail (batch, expiry, qty).

### Phase 2 — Releasing FEFO

1. Preview API + UI hint on releasing item / before Complete.
2. `completeReleasing`: lot allocation algorithm; persist allocations (table `releasing_item_batches` **strongly recommended** so cancel can reverse exactly).
3. Error messages when lots insufficient even if `stock_levels` looks enough (drift) — fix data first.
4. Print releasing document: show batch/expiry allocated per line.

### Phase 3 — Consistency

1. Transfers batch-aware.
2. Adjustments batch-aware.
3. Conversions batch policy.
4. Stock levels report “by batch” + expiry aging / near-expiry report.

### Phase 4 — Data migration

For existing `stock_levels.qty > 0` without lot history:

- Create **one synthetic batch** per product+location: `batchNo = 'OPENING'`, `dateExpiry = null` (or user-entered), `qty = stock_levels.qty`.
- Or split via a one-time spreadsheet import if you know real lots.

Until migration runs, FEFO complete may **fail** if no batch rows exist — migration is mandatory before enabling FEFO posting.

---

## 6. Risks

| Risk | Mitigation |
|------|------------|
| `stock_levels` ≠ sum(batches) | Always update both in **one** `db.transaction`; nightly reconciliation report |
| Cancel without stored allocation | Table `releasing_item_batches` / reverse using movement `referenceItemId` + batch ledger |
| Staff ignore expiry on receive | Make expiry **required** for categories you care about (product/category flag) |
| Product-level `stock` confusion | Keep updating `products.stock` as today until a later cutover |
| Performance | Index `(productId, locationId, dateExpiry, qty)` |
| Concurrent release same lot | Row lock batches in tx (`FOR UPDATE`) |
| Report Inventory still product-only | OK for Phase 1–2; batch report is Phase 3 |

---

## 7. Where to start (practical order)

1. **Decide Phase 0 policies** (especially: expiry required? null handling?).
2. **Implement `inventory_batches` + receiving complete/cancel** — nothing else until receive posts lots.
3. **Opening balance migration** for current stock.
4. **Then** FEFO on releasing complete + allocation storage + preview UI.
5. **Scan stays product-first**; add optional batch scan only after FEFO is stable.
6. **Do not** treat display `BATCH-{id}` as the only lot key — add an explicit **`batchNo`** (and keep expiry) on receive lines and batch balances.

---

## 8. Recommendation summary

| Topic | Verdict |
|-------|---------|
| Start here | Schema `inventory_batches` + wire **receiving complete** to create lots from existing **`dateExpiry`** (+ explicit **batchNo**) |
| Scan batch on releasing? | **Not required for FEFO**; optional override later |
| Primary release UX | Product + qty → **auto FEFO** on Complete |
| Core algorithm | Oldest `dateExpiry` first (nulls last) at `fromLocationId`; reduce lot qty + totals together |
| Must-have companion | **Allocation lines** so cancel/print/audit know which lots left |

---

## 9. Next step after you review

1. You mark this study **approved / amended** (fill Phase 0 answers below).
2. Request a **separate** implementation plan for **Phase 1 only** (schema + receiving lots) — not full FEFO in one shot.

### Phase 0 — your answers (fill in)

1. Expiry required on receive (inventoriable): _______________
2. Null expiry behavior: _______________
3. Negative lot qty allowed: _______________
4. Manual batch override on release v1: _______________
5. Report source of truth: _______________
