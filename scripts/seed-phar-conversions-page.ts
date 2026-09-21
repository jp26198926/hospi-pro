import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

async function seed() {
  console.log("Seeding Phar Conversions page + permissions...");

  const existing = await sql`
    SELECT id FROM pages WHERE path = '/phar-conversions' AND status = 'Active'
  `;

  let pageId: number;
  if (existing.length > 0) {
    pageId = existing[0].id;
    console.log(`Page /phar-conversions already exists (id=${pageId})`);
  } else {
    const maxOrderRows = await sql`SELECT COALESCE(MAX("order"), 0) AS m FROM pages`;
    const nextOrder = Number(maxOrderRows[0]?.m ?? 0) + 1;
    const [row] = await sql`
      INSERT INTO pages (page, path, icon, "order", status)
      VALUES ('Phar Conversions', '/phar-conversions', 'tag', ${nextOrder}, 'Active')
      RETURNING id
    `;
    pageId = row.id;
    console.log(`Inserted page /phar-conversions (id=${pageId}, order=${nextOrder})`);
  }

  // Copy permission grants from /conversions for every role that has them
  const srcGrants = await sql`
    SELECT DISTINCT rp.role_id, rp.permission_id
    FROM role_permissions rp
    JOIN pages p ON p.id = rp.page_id
    WHERE p.path = '/conversions'
      AND p.status = 'Active'
  `;

  let inserted = 0;
  for (const g of srcGrants) {
    const [ins] = await sql`
      INSERT INTO role_permissions (role_id, page_id, permission_id)
      VALUES (${g.role_id}, ${pageId}, ${g.permission_id})
      ON CONFLICT (role_id, page_id, permission_id) DO NOTHING
      RETURNING id
    `;
    if (ins) inserted += 1;
  }
  console.log(`Copied ${srcGrants.length} grant(s) from /conversions; inserted ${inserted}`);

  // Safety: ensure Admin role has at least View + Read if no source grants found
  if (srcGrants.length === 0) {
    const adminRoles = await sql`SELECT id FROM roles WHERE lower(role) = 'admin' AND status = 'Active'`;
    const needed = ["View", "Read", "Add", "Edit", "Delete", "Restore", "Export"];
    for (const role of adminRoles) {
      for (const permName of needed) {
        const [perm] = await sql`
          SELECT id FROM permissions WHERE permission = ${permName} AND status = 'Active'
        `;
        if (!perm) continue;
        const [ins] = await sql`
          INSERT INTO role_permissions (role_id, page_id, permission_id)
          VALUES (${role.id}, ${pageId}, ${perm.id})
          ON CONFLICT (role_id, page_id, permission_id) DO NOTHING
          RETURNING id
        `;
        if (ins) inserted += 1;
      }
    }
    console.log(`Fallback Admin grants inserted; total new=${inserted}`);
  }

  await sql.end();
  console.log("Done.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
