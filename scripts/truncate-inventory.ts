import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  console.log("Truncating inventory transaction data...");
  await sql.unsafe(`
    TRUNCATE TABLE
      transfer_item_batches,
      releasing_item_batches,
      releasing_items,
      releasings,
      receiving_items,
      receivings,
      transfer_items,
      transfers,
      adjustments,
      conversions,
      stock_movements,
      inventory_batches,
      stock_levels
    RESTART IDENTITY CASCADE
  `);
  await sql`UPDATE products SET stock = 0`;
  const batches = await sql`SELECT count(*)::int AS n FROM inventory_batches`;
  const levels = await sql`SELECT count(*)::int AS n FROM stock_levels`;
  const prods = await sql`SELECT count(*)::int AS n, COALESCE(SUM(stock),0) AS s FROM products`;
  console.log("inventory_batches:", batches[0].n);
  console.log("stock_levels:", levels[0].n);
  console.log("products:", prods[0].n, "sum stock:", String(prods[0].s));
  console.log("Done. Masters (products/locations/users/pages) kept.");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
