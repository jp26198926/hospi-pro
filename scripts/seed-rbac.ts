import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

const PERMISSIONS = [
  "View",
  "Read",
  "Add",
  "Edit",
  "Delete",
  "Restore",
  "Export",
  "Clone",
];

const ROLES = ["Admin"];

// path of parent rows is only used as a permission key; parents with children
// render as sidebar toggle groups and never navigate.
type PageSpec = {
  page: string;
  path: string;
  icon: string;
  parentPath?: string;
  order: number;
};

const PAGES: PageSpec[] = [
  { page: "Dashboard", path: "/", icon: "layout-dashboard", order: 1 },

  { page: "Masters", path: "/masters", icon: "folder", order: 10 },
  { page: "Departments", path: "/departments", icon: "folder", parentPath: "/masters", order: 1 },
  { page: "Categories", path: "/categories", icon: "folder", parentPath: "/masters", order: 2 },
  { page: "Locations", path: "/locations", icon: "map-pin", parentPath: "/masters", order: 3 },
  { page: "UOMs", path: "/uoms", icon: "bookmark", parentPath: "/masters", order: 4 },
  { page: "Products", path: "/products", icon: "shopping-cart", parentPath: "/masters", order: 5 },
  { page: "Suppliers", path: "/suppliers", icon: "truck", parentPath: "/masters", order: 6 },
  { page: "GST Types", path: "/gst-types", icon: "file-text", parentPath: "/masters", order: 7 },
  { page: "Payment Methods", path: "/payment-methods", icon: "credit-card", parentPath: "/masters", order: 8 },
  { page: "Payment Terms", path: "/payment-terms", icon: "calendar", parentPath: "/masters", order: 9 },
  { page: "Trans Types", path: "/trans-types", icon: "tag", parentPath: "/masters", order: 10 },

  { page: "Inventory", path: "/inventory", icon: "bar-chart-3", order: 20 },
  { page: "Stock Levels", path: "/stock-levels", icon: "bar-chart-3", parentPath: "/inventory", order: 1 },
  { page: "Stock Movements", path: "/stock-movements", icon: "file-text", parentPath: "/inventory", order: 2 },

  { page: "Transactions", path: "/transactions", icon: "truck", order: 30 },
  { page: "Receivings", path: "/receivings", icon: "truck", parentPath: "/transactions", order: 1 },
  { page: "Releasings", path: "/releasings", icon: "shopping-cart", parentPath: "/transactions", order: 2 },
  { page: "Transfers", path: "/transfers", icon: "map-pin", parentPath: "/transactions", order: 3 },
  { page: "Adjustments", path: "/adjustments", icon: "bar-chart-3", parentPath: "/transactions", order: 4 },
  { page: "Conversions", path: "/conversions", icon: "tag", parentPath: "/transactions", order: 5 },

  { page: "Pharmacy", path: "/pharmacy", icon: "heart", order: 40 },
  { page: "Phar Stock Levels", path: "/phar-stock-levels", icon: "bar-chart-3", parentPath: "/pharmacy", order: 1 },
  { page: "Phar Stock Movements", path: "/phar-stock-movements", icon: "file-text", parentPath: "/pharmacy", order: 2 },
  { page: "Phar Adjustments", path: "/phar-adjustments", icon: "bar-chart-3", parentPath: "/pharmacy", order: 3 },
  { page: "Phar Conversions", path: "/phar-conversions", icon: "tag", parentPath: "/pharmacy", order: 4 },

  { page: "Reports", path: "/reports", icon: "file-text", order: 50 },
  { page: "Report Inventory", path: "/report-inventory", icon: "file-text", parentPath: "/reports", order: 1 },
  { page: "Report Low Stock", path: "/report-low-stock", icon: "file-text", parentPath: "/reports", order: 2 },
  { page: "Report Near Expiry", path: "/report-near-expiry", icon: "file-text", parentPath: "/reports", order: 3 },

  { page: "Administration", path: "/administration", icon: "shield", order: 60 },
  { page: "Users", path: "/users", icon: "users", parentPath: "/administration", order: 1 },
  { page: "Roles", path: "/roles", icon: "shield", parentPath: "/administration", order: 2 },
  { page: "Pages", path: "/pages", icon: "bookmark", parentPath: "/administration", order: 3 },
  { page: "Permissions", path: "/permissions", icon: "lock", parentPath: "/administration", order: 4 },

  { page: "Settings", path: "/settings", icon: "settings", order: 70 },
  { page: "Application", path: "/settings-application", icon: "settings", parentPath: "/settings", order: 1 },
  { page: "Mail", path: "/settings-mail", icon: "mail", parentPath: "/settings", order: 2 },
  { page: "SMS", path: "/settings-sms", icon: "phone", parentPath: "/settings", order: 3 },
  { page: "Cloudinary", path: "/settings-cloudinary", icon: "image", parentPath: "/settings", order: 4 },
];

async function seed() {
  console.log("Seeding RBAC (pages, permissions, roles, role_permissions)...");

  // 1. Permissions
  const permissionIds = new Map<string, number>();
  let permInserted = 0;
  for (const name of PERMISSIONS) {
    const existing = await sql`SELECT id FROM permissions WHERE permission = ${name}`;
    if (existing.length > 0) {
      permissionIds.set(name, Number(existing[0].id));
      continue;
    }
    const [row] = await sql`
      INSERT INTO permissions (permission, status)
      VALUES (${name}, 'Active')
      RETURNING id
    `;
    permissionIds.set(name, Number(row.id));
    permInserted += 1;
  }
  console.log(`Permissions: ${PERMISSIONS.length} total, ${permInserted} inserted`);

  // 2. Roles
  const roleIds = new Map<string, number>();
  let roleInserted = 0;
  for (const name of ROLES) {
    const existing = await sql`SELECT id FROM roles WHERE role = ${name}`;
    if (existing.length > 0) {
      roleIds.set(name, Number(existing[0].id));
      continue;
    }
    const [row] = await sql`
      INSERT INTO roles (role, status)
      VALUES (${name}, 'Active')
      RETURNING id
    `;
    roleIds.set(name, Number(row.id));
    roleInserted += 1;
  }
  console.log(`Roles: ${ROLES.length} total, ${roleInserted} inserted`);

  // 3. Pages (parents first so parent_id resolves)
  const pageIds = new Map<string, number>();
  let pageInserted = 0;
  for (const spec of PAGES) {
    const existing = await sql`
      SELECT id FROM pages WHERE path = ${spec.path} AND status = 'Active'
    `;
    if (existing.length > 0) {
      pageIds.set(spec.path, Number(existing[0].id));
      continue;
    }
    const parentId = spec.parentPath ? (pageIds.get(spec.parentPath) ?? null) : null;
    if (spec.parentPath && parentId === null) {
      throw new Error(`Parent page not found for ${spec.path}: ${spec.parentPath}`);
    }
    const [row] = await sql`
      INSERT INTO pages (page, path, icon, parent_id, "order", status)
      VALUES (${spec.page}, ${spec.path}, ${spec.icon}, ${parentId}, ${spec.order}, 'Active')
      RETURNING id
    `;
    pageIds.set(spec.path, Number(row.id));
    pageInserted += 1;
  }
  console.log(`Pages: ${PAGES.length} total, ${pageInserted} inserted`);

  // 4. role_permissions: every role x every page x every permission
  let grantsInserted = 0;
  for (const [roleName, roleId] of roleIds) {
    for (const spec of PAGES) {
      const pageId = pageIds.get(spec.path)!;
      for (const permName of PERMISSIONS) {
        const permId = permissionIds.get(permName)!;
        const [ins] = await sql`
          INSERT INTO role_permissions (role_id, page_id, permission_id)
          VALUES (${roleId}, ${pageId}, ${permId})
          ON CONFLICT (role_id, page_id, permission_id) DO NOTHING
          RETURNING id
        `;
        if (ins) grantsInserted += 1;
      }
    }
    console.log(`Grants for role ${roleName} done`);
  }
  console.log(`Role permissions: ${roleIds.size * PAGES.length * PERMISSIONS.length} expected, ${grantsInserted} inserted`);

  const [permCount] = await sql`SELECT count(*)::int AS c FROM permissions`;
  const [roleCount] = await sql`SELECT count(*)::int AS c FROM roles`;
  const [pageCount] = await sql`SELECT count(*)::int AS c FROM pages`;
  const [grantCount] = await sql`SELECT count(*)::int AS c FROM role_permissions`;
  console.log(
    `Totals: permissions=${permCount.c}, roles=${roleCount.c}, pages=${pageCount.c}, role_permissions=${grantCount.c}`
  );

  await sql.end();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
