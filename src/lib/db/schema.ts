import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const restaurantStatusEnum = pgEnum("restaurant_status", [
  "active",
  "draft",
  "archived",
]);

export const ingestionStatusEnum = pgEnum("ingestion_status", [
  "pending",
  "processing",
  "review",
  "approved",
  "failed",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "approve",
]);

// ── Tables ─────────────────────────────────────────────────────────────────────

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const restaurants = pgTable(
  "restaurants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    logoUrl: varchar("logo_url", { length: 512 }),
    websiteUrl: varchar("website_url", { length: 512 }),
    description: text("description"),
    status: restaurantStatusEnum("status").notNull().default("draft"),
    itemCount: integer("item_count").notNull().default(0),
    lastIngestionAt: timestamp("last_ingestion_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("restaurants_slug_idx").on(table.slug),
    index("restaurants_status_idx").on(table.status),
  ]
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 500 }).notNull(),
    category: varchar("category", { length: 255 }).notNull(),
    servingSize: varchar("serving_size", { length: 255 }),
    calories: integer("calories").notNull(),
    totalFatG: decimal("total_fat_g", { precision: 7, scale: 2 }),
    saturatedFatG: decimal("saturated_fat_g", { precision: 7, scale: 2 }),
    transFatG: decimal("trans_fat_g", { precision: 7, scale: 2 }),
    cholesterolMg: decimal("cholesterol_mg", { precision: 7, scale: 2 }),
    sodiumMg: decimal("sodium_mg", { precision: 7, scale: 2 }),
    totalCarbsG: decimal("total_carbs_g", { precision: 7, scale: 2 }),
    dietaryFiberG: decimal("dietary_fiber_g", { precision: 7, scale: 2 }),
    sugarsG: decimal("sugars_g", { precision: 7, scale: 2 }),
    proteinG: decimal("protein_g", { precision: 7, scale: 2 }),
    isAvailable: boolean("is_available").notNull().default(true),
    sourcePdfUrl: varchar("source_pdf_url", { length: 512 }),
    ingestionId: uuid("ingestion_id").references(() => ingestionJobs.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("menu_items_restaurant_id_idx").on(table.restaurantId),
    index("menu_items_category_idx").on(table.category),
    index("menu_items_calories_idx").on(table.calories),
  ]
);

export const ingestionJobs = pgTable("ingestion_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  adminId: uuid("admin_id")
    .notNull()
    .references(() => admins.id),
  pdfUrl: varchar("pdf_url", { length: 512 }).notNull(),
  status: ingestionStatusEnum("status").notNull().default("pending"),
  rawText: text("raw_text"),
  structuredData: jsonb("structured_data"),
  validationReport: jsonb("validation_report"),
  itemsExtracted: integer("items_extracted").notNull().default(0),
  itemsApproved: integer("items_approved").notNull().default(0),
  errorLog: text("error_log"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => admins.id),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    action: auditActionEnum("action").notNull(),
    beforeData: jsonb("before_data"),
    afterData: jsonb("after_data"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_admin_id_idx").on(table.adminId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ]
);
