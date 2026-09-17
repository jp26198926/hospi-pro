import { pgTable, serial, text, timestamp, pgEnum, integer, decimal, AnyPgColumn, uniqueIndex } from "drizzle-orm/pg-core";

export const commonStatusEnum = pgEnum("status_common", ["Active", "Deleted"]);

export const categoryTypeEnum = pgEnum("category_type", ["inventoriable", "consumable"]);

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  department: text("department").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: categoryTypeEnum("type").notNull(),
  description: text("description"),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const uoms = pgTable("uoms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: integer("created_by").references((): AnyPgColumn => users.id),
  updatedBy: integer("updated_by").references((): AnyPgColumn => users.id),
  deletedBy: integer("deleted_by").references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull().unique(),
  categoryId: integer("category_id").references(() => categories.id),
  brand: text("brand"),
  model: text("model"),
  minStock: decimal("min_stock", { precision: 10, scale: 4 }).notNull().default("0"),
  stock: decimal("stock", { precision: 10, scale: 4 }).notNull().default("0"),
  lastCost: decimal("last_cost", { precision: 10, scale: 4 }).notNull().default("0"),
  avgCost: decimal("avg_cost", { precision: 10, scale: 4 }).notNull().default("0"),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: integer("created_by").references((): AnyPgColumn => users.id),
  updatedBy: integer("updated_by").references((): AnyPgColumn => users.id),
  deletedBy: integer("deleted_by").references((): AnyPgColumn => users.id),
  deletedReason: text("deleted_reason"),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  role: text("role").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstname: text("firstname").notNull(),
  lastname: text("lastname").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  roleId: integer("role_id").references(() => roles.id),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  createdBy: integer("created_by").references((): AnyPgColumn => users.id),
  updatedBy: integer("updated_by").references((): AnyPgColumn => users.id),
  deletedBy: integer("deleted_by").references((): AnyPgColumn => users.id),
});

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  page: text("page").notNull(),
  path: text("path").notNull(),
  icon: text("icon"),
  parentId: integer("parent_id").references((): AnyPgColumn => pages.id),
  order: integer("order"),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  permission: text("permission").notNull().unique(),
  status: commonStatusEnum("status").notNull().default("Active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id),
  pageId: integer("page_id").notNull().references(() => pages.id),
  permissionId: integer("permission_id").notNull().references(() => permissions.id),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("role_page_permission_idx").on(t.roleId, t.pageId, t.permissionId),
]);

export const timezones = pgTable("timezones", {
  id: serial("id").primaryKey(),
  timezone: text("timezone").notNull().unique(),
  utcOffset: text("utc_offset"),
  abbreviation: text("abbreviation"),
});

export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  symbol: text("symbol"),
});

export const settingsApp = pgTable("settings_app", {
  id: serial("id").primaryKey(),
  appLogo: text("app_logo"),
  appFavicon: text("app_favicon"),
  appName: text("app_name").notNull().default("RBAC System"),
  appTagline: text("app_tagline"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  tinNo: text("tin_no"),
  timezoneId: integer("timezone_id").references(() => timezones.id),
  currencyId: integer("currency_id").references(() => currencies.id),
  otpDuration: integer("otp_duration"),
  primaryStorage: text("primary_storage").notNull().default("filesystem"),
  downloadLinkAndroid: text("download_link_android"),
  downloadLinkIos: text("download_link_ios"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
});

export const settingsMail = pgTable("settings_mail", {
  id: serial("id").primaryKey(),
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
  id: serial("id").primaryKey(),
  textbeeApiKey: text("textbee_api_key"),
  textbeeDeviceId: text("textbee_device_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
});

export const settingsCloudinary = pgTable("settings_cloudinary", {
  id: serial("id").primaryKey(),
  cloudinaryName: text("cloudinary_name"),
  cloudinaryApiKey: text("cloudinary_api_key"),
  cloudinaryApiSecret: text("cloudinary_api_secret"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});
