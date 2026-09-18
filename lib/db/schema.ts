import { pgTable, bigserial, bigint, text, timestamp, pgEnum, integer, decimal, AnyPgColumn, uniqueIndex } from "drizzle-orm/pg-core";

export const commonStatusEnum = pgEnum("status_common", ["Active", "Deleted"]);

export const categoryTypeEnum = pgEnum("category_type", ["inventoriable", "consumable"]);

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
