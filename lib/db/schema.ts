import { pgTable, bigserial, bigint, text, timestamp, pgEnum, integer, decimal, AnyPgColumn, uniqueIndex } from "drizzle-orm/pg-core";

export const commonStatusEnum = pgEnum("status_common", ["Active", "Deleted"]);

export const categoryTypeEnum = pgEnum("category_type", ["inventoriable", "consumable"]);

export const inventoryStatusEnum = pgEnum("inventory_status", ["Draft", "Completed", "Cancelled"]);

export const adjustmentStatusEnum = pgEnum("adjustment_status", ["Completed", "Cancelled"]);

export const departments = pgTable("departments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  department: text("department").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const categories = pgTable("categories", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull().unique(),
  type: categoryTypeEnum("type").notNull(),
  description: text("description"),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const locations = pgTable("locations", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const uoms = pgTable("uoms", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const paymentMethods = pgTable("payment_methods", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const paymentTerms = pgTable("payment_terms", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull().unique(),
  termDays: integer("term_days").notNull().default(0),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const transTypes = pgTable("trans_types", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const stockLevels = pgTable(
  "stock_levels",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    productId: bigint("product_id", { mode: "number" })
      .notNull()
      .references(() => products.id),
    locationId: bigint("location_id", { mode: "number" })
      .notNull()
      .references(() => locations.id),
    qty: decimal("qty", { precision: 10, scale: 4 }).notNull().default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow(),
    updatedBy: bigint("updated_by", { mode: "number" }).references(
      (): AnyPgColumn => users.id
    ),
  },
  (t) => [
    uniqueIndex("stock_levels_product_location_idx").on(t.productId, t.locationId),
  ]
);

export const stockMovements = pgTable("stock_movements", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  date: timestamp("date", { withTimezone: true, mode: "date" }).notNull(),
  transTypeId: bigint("trans_type_id", { mode: "number" })
    .notNull()
    .references(() => transTypes.id),
  productId: bigint("product_id", { mode: "number" })
    .notNull()
    .references(() => products.id),
  locationId: bigint("location_id", { mode: "number" })
    .notNull()
    .references(() => locations.id),
  qty: decimal("qty", { precision: 10, scale: 4 }).notNull().default("0"),
  referenceTransId: bigint("reference_trans_id", { mode: "number" }),
  referenceItemId: bigint("reference_item_id", { mode: "number" }),
  referenceDescription: text("reference_description"),
  batchId: bigint("batch_id", { mode: "number" }),
  batchNo: text("batch_no"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  createdBy: bigint("created_by", { mode: "number" }).references(
    (): AnyPgColumn => users.id
  ),
});

export const receivings = pgTable("receivings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  date: timestamp("date", { withTimezone: true, mode: "date" }).notNull(),
  supplierId: bigint("supplier_id", { mode: "number" })
    .notNull()
    .references(() => suppliers.id),
  locationId: bigint("location_id", { mode: "number" })
    .notNull()
    .references(() => locations.id),
  poNumber: text("po_number"),
  invoiceNumber: text("invoice_number"),
  remarks: text("remarks"),
  status: inventoryStatusEnum("status").notNull().default("Draft"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const receivingItems = pgTable("receiving_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  receivingId: bigint("receiving_id", { mode: "number" })
    .notNull()
    .references(() => receivings.id),
  productId: bigint("product_id", { mode: "number" })
    .notNull()
    .references(() => products.id),
  qty: decimal("qty", { precision: 10, scale: 4 }).notNull().default("0"),
  unitCost: decimal("unit_cost", { precision: 10, scale: 4 }).notNull().default("0"),
  totalCost: decimal("total_cost", { precision: 10, scale: 4 }).notNull().default("0"),
  batchNo: text("batch_no"),
  dateExpiry: timestamp("date_expiry", { withTimezone: true, mode: "date" }),
  remarks: text("remarks"),
  status: inventoryStatusEnum("status").notNull().default("Draft"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const releasings = pgTable("releasings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  date: timestamp("date", { withTimezone: true, mode: "date" }).notNull(),
  fromLocationId: bigint("from_location_id", { mode: "number" })
    .notNull()
    .references(() => locations.id),
  toLocationId: bigint("to_location_id", { mode: "number" }).references(
    () => locations.id
  ),
  receiverName: text("receiver_name").notNull(),
  remarks: text("remarks"),
  status: inventoryStatusEnum("status").notNull().default("Draft"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const releasingItems = pgTable("releasing_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  releasingId: bigint("releasing_id", { mode: "number" })
    .notNull()
    .references(() => releasings.id),
  productId: bigint("product_id", { mode: "number" })
    .notNull()
    .references(() => products.id),
  qty: decimal("qty", { precision: 10, scale: 4 }).notNull().default("0"),
  batchId: bigint("batch_id", { mode: "number" }),
  dateExpiry: timestamp("date_expiry", { withTimezone: true, mode: "date" }),
  remarks: text("remarks"),
  status: inventoryStatusEnum("status").notNull().default("Draft"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const transfers = pgTable("transfers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  date: timestamp("date", { withTimezone: true, mode: "date" }).notNull(),
  fromLocationId: bigint("from_location_id", { mode: "number" })
    .notNull()
    .references(() => locations.id),
  toLocationId: bigint("to_location_id", { mode: "number" })
    .notNull()
    .references(() => locations.id),
  remarks: text("remarks"),
  status: inventoryStatusEnum("status").notNull().default("Draft"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const transferItems = pgTable("transfer_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  transferId: bigint("transfer_id", { mode: "number" })
    .notNull()
    .references(() => transfers.id),
  productId: bigint("product_id", { mode: "number" })
    .notNull()
    .references(() => products.id),
  qty: decimal("qty", { precision: 10, scale: 4 }).notNull().default("0"),
  dateExpiry: timestamp("date_expiry", { withTimezone: true, mode: "date" }),
  remarks: text("remarks"),
  status: inventoryStatusEnum("status").notNull().default("Draft"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const adjustments = pgTable("adjustments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  date: timestamp("date", { withTimezone: true, mode: "date" }).notNull(),
  locationId: bigint("location_id", { mode: "number" })
    .notNull()
    .references(() => locations.id),
  productId: bigint("product_id", { mode: "number" })
    .notNull()
    .references(() => products.id),
  uomId: bigint("uom_id", { mode: "number" })
    .notNull()
    .references(() => uoms.id),
  qtyOld: decimal("qty_old", { precision: 10, scale: 4 }).notNull(),
  qtyAdj: decimal("qty_adj", { precision: 10, scale: 4 }).notNull(),
  qtyNew: decimal("qty_new", { precision: 10, scale: 4 }).notNull(),
  remarks: text("remarks"),
  status: adjustmentStatusEnum("status").notNull().default("Completed"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const conversions = pgTable("conversions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  date: timestamp("date", { withTimezone: true, mode: "date" }).notNull(),
  locationId: bigint("location_id", { mode: "number" })
    .notNull()
    .references(() => locations.id),
  fromProductId: bigint("from_product_id", { mode: "number" })
    .notNull()
    .references(() => products.id),
  fromUomId: bigint("from_uom_id", { mode: "number" })
    .notNull()
    .references(() => uoms.id),
  fromQty: decimal("from_qty", { precision: 10, scale: 4 }).notNull(),
  toProductId: bigint("to_product_id", { mode: "number" })
    .notNull()
    .references(() => products.id),
  toUomId: bigint("to_uom_id", { mode: "number" })
    .notNull()
    .references(() => uoms.id),
  newQty: decimal("new_qty", { precision: 10, scale: 4 }).notNull(),
  remarks: text("remarks"),
  status: adjustmentStatusEnum("status").notNull().default("Completed"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const suppliers = pgTable("suppliers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull().unique(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const products = pgTable("products", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull().unique(),
  categoryId: bigint("category_id", { mode: "number" }).references(() => categories.id),
  brand: text("brand"),
  model: text("model"),
  minStock: decimal("min_stock", { precision: 10, scale: 4 }).notNull().default("0"),
  stock: decimal("stock", { precision: 10, scale: 4 }).notNull().default("0"),
  lastCost: decimal("last_cost", { precision: 10, scale: 4 }).notNull().default("0"),
  avgCost: decimal("avg_cost", { precision: 10, scale: 4 }).notNull().default("0"),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 4 }).notNull().default("0"),
  gstTypeId: bigint("gst_type_id", { mode: "number" }).notNull().references((): AnyPgColumn => gstTypes.id),
  uomId: bigint("uom_id", { mode: "number" }).notNull().references((): AnyPgColumn => uoms.id),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const gstTypes = pgTable("gst_types", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const roles = pgTable("roles", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  role: text("role").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstname: text("firstname").notNull(),
  lastname: text("lastname").notNull(),
  departmentId: bigint("department_id", { mode: "number" }).references(() => departments.id),
  roleId: bigint("role_id", { mode: "number" }).references(() => roles.id),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  deletedBy: bigint("deleted_by", { mode: "number" }).references((): AnyPgColumn => users.id),
});

export const pages = pgTable("pages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  page: text("page").notNull(),
  path: text("path").notNull(),
  icon: text("icon"),
  parentId: bigint("parent_id", { mode: "number" }).references((): AnyPgColumn => pages.id),
  order: integer("order"),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const permissions = pgTable("permissions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  permission: text("permission").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const rolePermissions = pgTable("role_permissions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  roleId: bigint("role_id", { mode: "number" }).notNull().references(() => roles.id),
  pageId: bigint("page_id", { mode: "number" }).notNull().references(() => pages.id),
  permissionId: bigint("permission_id", { mode: "number" }).notNull().references(() => permissions.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("role_page_permission_idx").on(t.roleId, t.pageId, t.permissionId),
]);

export const timezones = pgTable("timezones", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  timezone: text("timezone").notNull().unique(),
  utcOffset: text("utc_offset"),
  abbreviation: text("abbreviation"),
});

export const currencies = pgTable("currencies", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  symbol: text("symbol"),
});

export const settingsApp = pgTable("settings_app", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  appLogo: text("app_logo"),
  appFavicon: text("app_favicon"),
  appName: text("app_name").notNull().default("RBAC System"),
  appTagline: text("app_tagline"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  tinNo: text("tin_no"),
  timezoneId: bigint("timezone_id", { mode: "number" }).references(() => timezones.id),
  currencyId: bigint("currency_id", { mode: "number" }).references(() => currencies.id),
  otpDuration: integer("otp_duration"),
  primaryStorage: text("primary_storage").notNull().default("filesystem"),
  downloadLinkAndroid: text("download_link_android"),
  downloadLinkIos: text("download_link_ios"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
});

export const settingsMail = pgTable("settings_mail", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUsername: text("smtp_username"),
  smtpPassword: text("smtp_password"),
  smtpFromEmail: text("smtp_from_email"),
  smtpSenderName: text("smtp_sender_name"),
  smtpCrypto: text("smtp_crypto"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
});

export const settingsSms = pgTable("settings_sms", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  textbeeApiKey: text("textbee_api_key"),
  textbeeDeviceId: text("textbee_device_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
});

export const settingsCloudinary = pgTable("settings_cloudinary", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  cloudinaryName: text("cloudinary_name"),
  cloudinaryApiKey: text("cloudinary_api_key"),
  cloudinaryApiSecret: text("cloudinary_api_secret"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const inventoryBatches = pgTable(
  "inventory_batches",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    productId: bigint("product_id", { mode: "number" })
      .notNull()
      .references(() => products.id),
    locationId: bigint("location_id", { mode: "number" })
      .notNull()
      .references(() => locations.id),
    batchNo: text("batch_no").notNull(),
    dateExpiry: timestamp("date_expiry", { withTimezone: true, mode: "date" }),
    qty: decimal("qty", { precision: 10, scale: 4 }).notNull().default("0"),
    unitCost: decimal("unit_cost", { precision: 10, scale: 4 }).notNull().default("0"),
    sourceType: text("source_type"),
    sourceItemId: bigint("source_item_id", { mode: "number" }),
    status: commonStatusEnum("status").notNull().default("Active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
    createdBy: bigint("created_by", { mode: "number" }).references((): AnyPgColumn => users.id),
    updatedBy: bigint("updated_by", { mode: "number" }).references((): AnyPgColumn => users.id),
  },
  (t) => [
    uniqueIndex("inventory_batches_product_location_batch_idx").on(
      t.productId,
      t.locationId,
      t.batchNo
    ),
  ]
);

export const releasingItemBatches = pgTable("releasing_item_batches", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  releasingItemId: bigint("releasing_item_id", { mode: "number" })
    .notNull()
    .references(() => releasingItems.id),
  releasingId: bigint("releasing_id", { mode: "number" })
    .notNull()
    .references(() => releasings.id),
  batchId: bigint("batch_id", { mode: "number" })
    .notNull()
    .references(() => inventoryBatches.id),
  batchNo: text("batch_no").notNull(),
  dateExpiry: timestamp("date_expiry", { withTimezone: true, mode: "date" }),
  qty: decimal("qty", { precision: 10, scale: 4 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const transferItemBatches = pgTable("transfer_item_batches", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  transferItemId: bigint("transfer_item_id", { mode: "number" })
    .notNull()
    .references(() => transferItems.id),
  transferId: bigint("transfer_id", { mode: "number" })
    .notNull()
    .references(() => transfers.id),
  batchId: bigint("batch_id", { mode: "number" })
    .notNull()
    .references(() => inventoryBatches.id),
  batchNo: text("batch_no").notNull(),
  dateExpiry: timestamp("date_expiry", { withTimezone: true, mode: "date" }),
  qty: decimal("qty", { precision: 10, scale: 4 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});
