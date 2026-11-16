import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

// Exact names referenced by the stock engine via getTransTypeIdByName
// (lib/receivings.ts) — complete/cancel flows throw if any are missing.
const TRANS_TYPES = [
  "Receiving",
  "Receiving Cancel",
  "Releasing",
  "Releasing Cancel",
  "Transfer",
  "Transfer Cancel",
  "Adjustment",
  "Adjustment Cancel",
  "Conversion",
  "Conversion Cancel",
];

async function seed() {
  console.log("Seeding trans types...");

  let inserted = 0;
  for (const name of TRANS_TYPES) {
    const existing = await sql`SELECT id FROM trans_types WHERE name = ${name}`;
    if (existing.length > 0) continue;
    await sql`
      INSERT INTO trans_types (name, status)
      VALUES (${name}, 'Active')
    `;
    inserted += 1;
    console.log(`Inserted trans type: ${name}`);
  }

  const [count] = await sql`SELECT count(*)::int AS c FROM trans_types`;
  console.log(`Trans types: ${TRANS_TYPES.length} required, ${inserted} inserted, ${count.c} total`);

  await sql.end();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
