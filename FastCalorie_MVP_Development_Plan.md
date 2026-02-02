# FastCalorie — MVP Development Plan

> **Purpose:** This document contains every technical instruction a coding agent needs to build the FastCalorie MVP from an empty directory to a deployed product. Follow sections in order — each section declares its dependencies explicitly.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Dependency Graph](#2-dependency-graph)
3. [Tech Stack & Tooling](#3-tech-stack--tooling)
4. [Priority 0 — Project Scaffold](#4-priority-0--project-scaffold)
5. [Priority 1 — Database Schema & ORM](#5-priority-1--database-schema--orm)
6. [Priority 2 — Authentication System](#6-priority-2--authentication-system)
7. [Priority 3 — Admin API (Restaurant & Item CRUD)](#7-priority-3--admin-api-restaurant--item-crud)
8. [Priority 4 — PDF Ingestion Pipeline](#8-priority-4--pdf-ingestion-pipeline)
9. [Priority 5 — Admin Dashboard UI](#9-priority-5--admin-dashboard-ui)
10. [Priority 6 — Consumer API](#10-priority-6--consumer-api)
11. [Priority 7 — Consumer Frontend](#11-priority-7--consumer-frontend)
12. [Priority 8 — Data Seeding & QA](#12-priority-8--data-seeding--qa)
13. [Priority 9 — Polish, Performance & Deploy](#13-priority-9--polish-performance--deploy)
14. [File Tree Reference](#14-file-tree-reference)
15. [Environment Variables](#15-environment-variables)
16. [Validation Rules Reference](#16-validation-rules-reference)
17. [AI Prompt Templates](#17-ai-prompt-templates)

---

## 1. Project Overview

FastCalorie is a web application that aggregates fast food nutrition data into a single searchable interface. Admins upload restaurant nutrition PDFs, an AI agent extracts structured data, admins review and approve it, and consumers search/browse the published data.

**What the MVP includes:**
- Public consumer app: restaurant browser, global search, item detail, basic filtering
- Admin panel: auth, restaurant CRUD, PDF ingestion pipeline with AI extraction + validation + review, item management, audit log
- No user accounts on the consumer side (Phase 2)
- No meal builder (Phase 2)
- Client-side search only (server-side search is Phase 2)

---

## 2. Dependency Graph

Build in this exact order. Each block depends on everything above it.

```
┌─────────────────────────────────────────────┐
│  P0: Project Scaffold                       │
│  (monorepo, configs, directory structure)    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  P1: Database Schema & ORM                  │
│  (PostgreSQL, Drizzle, migrations)          │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  P2: Authentication System                  │
│  (admin auth, JWT, middleware, seed CLI)     │
└──────────────────┬──────────────────────────┘
                   │
          ┌────────┴────────┐
          │                 │
┌─────────▼───────┐ ┌──────▼──────────────────┐
│  P3: Admin API  │ │  P4: PDF Ingestion      │
│  (CRUD routes)  │ │  (upload, extract, AI,  │
│                 │ │   validate, approve)    │
└─────────┬───────┘ └──────┬──────────────────┘
          │                │
          └────────┬───────┘
                   │
┌──────────────────▼──────────────────────────┐
│  P5: Admin Dashboard UI                     │
│  (React pages consuming P3 + P4 endpoints)  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  P6: Consumer API                           │
│  (public read-only endpoints)               │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  P7: Consumer Frontend                      │
│  (home, browse, search, item detail)        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  P8: Data Seeding & QA                      │
│  (ingest 15 real restaurant PDFs, test)     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  P9: Polish, Performance & Deploy           │
│  (Lighthouse, caching, CI/CD, hosting)      │
└─────────────────────────────────────────────┘
```

**Critical path:** P0 → P1 → P2 → P3/P4 (parallel) → P5 → P6 → P7 → P8 → P9

P3 and P4 can be built in parallel since they share the same database layer (P1) and auth layer (P2) but don't depend on each other. P4 uses restaurant records from P3, but you can create test restaurants manually during P4 development.

---

## 3. Tech Stack & Tooling

| Layer | Choice | Version | Why |
|---|---|---|---|
| Monorepo | Turborepo | latest | Shared types, single deploy pipeline |
| Frontend | Next.js (App Router) | 15.x | SSR for SEO, API routes co-located |
| Styling | Tailwind CSS | 4.x | Utility-first, fast iteration |
| Component lib | shadcn/ui | latest | Accessible, composable, no lock-in |
| Database | PostgreSQL | 16 | Relational integrity, JSONB for flex fields |
| ORM | Drizzle ORM | latest | Type-safe, lightweight, great migration tooling |
| Auth | Custom JWT | — | Simple for admin-only auth; no OAuth needed for MVP |
| Password hashing | bcrypt | latest | Industry standard for password storage |
| File storage | Local filesystem (MVP) | — | `/uploads` dir; swap to S3/R2 in Phase 2 |
| PDF text extraction | `pdf-parse` (Node) | latest | Handles text-based PDFs without Python sidecar |
| AI extraction | Anthropic Claude API | claude-sonnet-4-20250514 | Best doc understanding; cost-effective for extraction |
| Validation | Zod | latest | Runtime schema validation, shared between client/server |
| State management | React Query (TanStack Query) | 5.x | Server state caching, auto refetch |
| Hosting | Vercel | — | Zero-config Next.js deploy |
| Database hosting | Neon or Supabase Postgres | — | Serverless Postgres, free tier for MVP |

### Key decisions

- **No Python sidecar for MVP.** Use `pdf-parse` (Node.js) for text extraction. It handles >90% of text-based nutrition PDFs. Add `pdfplumber` Python sidecar in Phase 2 for scanned/image PDFs.
- **No dedicated search engine for MVP.** With <5,000 items, fetch all items on first load, cache in memory, search client-side with a library like `fuse.js`. This gives sub-50ms search with zero server round trips.
- **Local file storage for MVP.** PDFs and logos stored in `/public/uploads`. Migration to S3/R2 is a single abstraction swap later.
- **Single Next.js app for both consumer and admin.** Admin pages live under `/admin/*` route group, protected by middleware. No separate deployment.

---

## 4. Priority 0 — Project Scaffold

**Depends on:** Nothing
**Produces:** Empty project with all tooling configured, ready for feature code

### 4.1 Initialize monorepo

```bash
npx create-turbo@latest fastcalorie
cd fastcalorie
```

Simplify to a single Next.js app (remove any starter packages Turborepo creates):

```
fastcalorie/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (consumer)/       # Route group: public pages
│   │   ├── (admin)/          # Route group: admin pages
│   │   ├── api/              # API routes
│   │   └── layout.tsx
│   ├── components/           # Shared React components
│   │   ├── ui/               # shadcn/ui primitives
│   │   ├── consumer/         # Consumer-specific components
│   │   └── admin/            # Admin-specific components
│   ├── lib/                  # Shared utilities
│   │   ├── db/               # Drizzle schema, client, migrations
│   │   ├── auth/             # Auth helpers, JWT, middleware
│   │   ├── ingestion/        # PDF processing, AI agent, validation
│   │   ├── validators/       # Zod schemas (shared client/server)
│   │   └── utils.ts
│   ├── hooks/                # Custom React hooks
│   └── types/                # TypeScript type definitions
├── public/
│   └── uploads/              # PDF and logo storage (MVP)
├── scripts/                  # CLI tools (seed admin, etc.)
├── drizzle/                  # Migration files (auto-generated)
├── .env.local                # Environment variables
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── turbo.json
```

### 4.2 Install all dependencies

```bash
# Core
npm install next react react-dom

# Database
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Auth
npm install bcrypt jsonwebtoken
npm install -D @types/bcrypt @types/jsonwebtoken

# PDF processing
npm install pdf-parse
npm install -D @types/pdf-parse

# AI
npm install @anthropic-ai/sdk

# Validation
npm install zod

# UI
npm install tailwindcss @tailwindcss/postcss postcss
npx shadcn@latest init

# Client-side search
npm install fuse.js

# Data fetching
npm install @tanstack/react-query

# Utilities
npm install uuid nanoid slugify
npm install -D @types/uuid

# Dev
npm install -D typescript @types/node @types/react @types/react-dom
```

### 4.3 Configure TypeScript

`tsconfig.json` — ensure strict mode and path aliases:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "incremental": true,
    "esModuleInterop": true,
    "allowJs": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 4.4 Configure Tailwind

Follow Tailwind v4 conventions. After running `npx shadcn@latest init`, verify that `src/app/globals.css` imports Tailwind and that shadcn components work.

### 4.5 Configure Next.js

`next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb", // For PDF uploads
    },
  },
  images: {
    remotePatterns: [], // Add CDN domains in Phase 2
  },
};

export default nextConfig;
```

### 4.6 Verification

At the end of P0, you should be able to:
- Run `npm run dev` and see a blank Next.js page at `localhost:3000`
- Import from `@/lib/...` and `@/components/...` without errors
- See shadcn/ui components render correctly (add a test `<Button>` to verify)

---

## 5. Priority 1 — Database Schema & ORM

**Depends on:** P0
**Produces:** All tables created, Drizzle client configured, migrations working

### 5.1 Drizzle configuration

`drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 5.2 Database client

`src/lib/db/index.ts`:

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

### 5.3 Complete schema

`src/lib/db/schema.ts` — implement exactly these tables with exactly these columns:

```typescript
import {
  pgTable, uuid, varchar, text, integer, decimal, boolean,
  timestamp, pgEnum, jsonb, index
} from "drizzle-orm/pg-core";

// ── Enums ──

export const restaurantStatusEnum = pgEnum("restaurant_status", [
  "active", "draft", "archived"
]);

export const ingestionStatusEnum = pgEnum("ingestion_status", [
  "pending", "processing", "review", "approved", "failed"
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create", "update", "delete", "approve"
]);

// ── Tables ──

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const restaurants = pgTable("restaurants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  logoUrl: varchar("logo_url", { length: 512 }),
  websiteUrl: varchar("website_url", { length: 512 }),
  description: text("description"),
  status: restaurantStatusEnum("status").notNull().default("draft"),
  itemCount: integer("item_count").notNull().default(0),
  lastIngestionAt: timestamp("last_ingestion_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("restaurants_slug_idx").on(table.slug),
  index("restaurants_status_idx").on(table.status),
]);

export const menuItems = pgTable("menu_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("menu_items_restaurant_idx").on(table.restaurantId),
  index("menu_items_category_idx").on(table.category),
  index("menu_items_calories_idx").on(table.calories),
]);

export const ingestionJobs = pgTable("ingestion_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  adminId: uuid("admin_id").notNull().references(() => admins.id),
  pdfUrl: varchar("pdf_url", { length: 512 }).notNull(),
  status: ingestionStatusEnum("status").notNull().default("pending"),
  rawText: text("raw_text"),
  structuredData: jsonb("structured_data"),
  validationReport: jsonb("validation_report"),
  itemsExtracted: integer("items_extracted").default(0),
  itemsApproved: integer("items_approved").default(0),
  errorLog: text("error_log"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: uuid("admin_id").notNull().references(() => admins.id),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  action: auditActionEnum("action").notNull(),
  beforeData: jsonb("before_data"),
  afterData: jsonb("after_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  index("audit_logs_admin_idx").on(table.adminId),
  index("audit_logs_created_idx").on(table.createdAt),
]);
```

### 5.4 Run migrations

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 5.5 Verification

- Connect to the database and confirm all 5 tables exist: `admins`, `restaurants`, `menu_items`, `ingestion_jobs`, `audit_logs`
- Confirm all enums are created
- Confirm all indexes are created
- Run `npx drizzle-kit studio` to visually inspect the schema

---

## 6. Priority 2 — Authentication System

**Depends on:** P0, P1
**Produces:** Admin login/logout, JWT middleware, seed CLI, protected route pattern

### 6.1 Auth utility library

`src/lib/auth/index.ts`:

```typescript
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 12;

export interface AdminTokenPayload {
  adminId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): AdminTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
}
```

### 6.2 Auth middleware for API routes

`src/lib/auth/middleware.ts`:

Create a helper function `withAuth` that wraps API route handlers. It should:

1. Read the `Authorization` header (`Bearer <token>`)
2. Verify the JWT using `verifyToken`
3. If valid, fetch the admin record from the database to confirm `isActive === true`
4. Pass the admin record to the handler
5. If invalid, return `401 Unauthorized`

Pattern:

```typescript
export async function withAuth(
  request: Request,
  handler: (req: Request, admin: Admin) => Promise<Response>
): Promise<Response> {
  // Extract token from Authorization header
  // Verify token
  // Fetch admin from DB, confirm isActive
  // Call handler with admin
  // Return 401 on any failure
}
```

### 6.3 Admin login API route

`src/app/api/admin/auth/login/route.ts`:

- **Method:** POST
- **Body:** `{ email: string, password: string }`
- **Validation:** Zod schema, both fields required, email format validated
- **Logic:** Look up admin by email → verify password → sign JWT → return `{ token, admin: { id, email, name } }`
- **Errors:** 401 for invalid credentials, 403 if admin is deactivated

### 6.4 Admin session check endpoint

`src/app/api/admin/auth/me/route.ts`:

- **Method:** GET
- **Auth:** Required
- **Logic:** Return current admin's `{ id, email, name }` from the token
- **Purpose:** Frontend calls this on load to verify the stored token is still valid

### 6.5 Seed admin CLI script

`scripts/seed-admin.ts`:

Create a script runnable with `npx tsx scripts/seed-admin.ts` that:

1. Prompts for email, name, and password (or reads from env vars `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD`)
2. Hashes the password
3. Inserts the admin record into the database
4. Prints confirmation

This is the **only way** to create the first admin. All subsequent admins are created through the admin panel.

### 6.6 Next.js middleware for admin route protection

`src/middleware.ts`:

Use Next.js middleware to protect all `/admin/*` routes (except `/admin/login`). The middleware should check for a valid auth cookie or token. If missing/invalid, redirect to `/admin/login`.

Note: this is a UX-level gate only. The real security is in the API route `withAuth` wrapper (server-side JWT verification on every API call).

### 6.7 Audit log helper

`src/lib/db/audit.ts`:

Create a helper function:

```typescript
export async function logAudit(params: {
  adminId: string;
  entityType: "restaurant" | "menu_item" | "ingestion_job";
  entityId: string;
  action: "create" | "update" | "delete" | "approve";
  beforeData?: unknown;
  afterData?: unknown;
}): Promise<void> {
  // Insert into audit_logs table
}
```

Call this from every admin mutation endpoint.

### 6.8 Verification

- Run the seed script to create an admin with email `admin@fastcalorie.com` and a test password
- POST to `/api/admin/auth/login` with correct credentials → receive a JWT
- POST with wrong password → receive 401
- GET `/api/admin/auth/me` with the JWT in the Authorization header → receive admin info
- GET `/api/admin/auth/me` with no token → receive 401

---

## 7. Priority 3 — Admin API (Restaurant & Item CRUD)

**Depends on:** P0, P1, P2
**Produces:** All admin CRUD endpoints for restaurants and menu items

### 7.1 Zod validation schemas

`src/lib/validators/restaurant.ts`:

```typescript
import { z } from "zod";

export const createRestaurantSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/,
    "Slug must contain only lowercase letters, numbers, and hyphens"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
});

export const updateRestaurantSchema = createRestaurantSchema.partial();
```

`src/lib/validators/menuItem.ts`:

```typescript
import { z } from "zod";

export const createMenuItemSchema = z.object({
  restaurantId: z.string().uuid(),
  name: z.string().min(1).max(500),
  category: z.string().min(1).max(255),
  servingSize: z.string().max(255).optional(),
  calories: z.number().int().min(0).max(10000),
  totalFatG: z.number().min(0).max(1000).optional(),
  saturatedFatG: z.number().min(0).max(500).optional(),
  transFatG: z.number().min(0).max(100).optional(),
  cholesterolMg: z.number().min(0).max(5000).optional(),
  sodiumMg: z.number().min(0).max(50000).optional(),
  totalCarbsG: z.number().min(0).max(2000).optional(),
  dietaryFiberG: z.number().min(0).max(500).optional(),
  sugarsG: z.number().min(0).max(1000).optional(),
  proteinG: z.number().min(0).max(500).optional(),
  isAvailable: z.boolean().optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial().omit({ restaurantId: true });
```

### 7.2 Restaurant API routes

All routes require admin auth (`withAuth`). All mutations log to audit_logs.

**`src/app/api/admin/restaurants/route.ts`**

| Method | Action | Notes |
|---|---|---|
| GET | List all restaurants | Return `id, name, slug, status, itemCount, lastIngestionAt`. Support `?status=active` filter. Sort by name. |
| POST | Create restaurant | Validate body with `createRestaurantSchema`. Auto-generate slug from name if not provided (using `slugify`). Check slug uniqueness. Return created record. |

**`src/app/api/admin/restaurants/[id]/route.ts`**

| Method | Action | Notes |
|---|---|---|
| GET | Get single restaurant | Include all fields. |
| PUT | Update restaurant | Validate body with `updateRestaurantSchema`. If slug is changed, check uniqueness. |
| DELETE | Soft-delete | Set `status = "archived"`. Do NOT hard-delete. |

### 7.3 Menu item API routes (admin)

**`src/app/api/admin/items/route.ts`**

| Method | Action | Notes |
|---|---|---|
| GET | List items | Required query: `?restaurantId=<uuid>`. Optional: `?category=<string>`. Return all fields. Paginate: `?page=1&limit=50`. |

**`src/app/api/admin/items/[id]/route.ts`**

| Method | Action | Notes |
|---|---|---|
| GET | Get single item | All fields. |
| PUT | Update item | Validate with `updateMenuItemSchema`. Log audit. Update `updatedAt`. |
| DELETE | Soft-delete | Set `isAvailable = false`. Do NOT hard-delete. |

**`src/app/api/admin/items/bulk/route.ts`**

| Method | Action | Notes |
|---|---|---|
| POST | Bulk action | Body: `{ itemIds: string[], action: "delete" | "recategorize", category?: string }`. For delete: set `isAvailable = false` on all. For recategorize: update category on all. Log one audit entry per item. |

### 7.4 Logo upload endpoint

**`src/app/api/admin/upload/logo/route.ts`**

- **Method:** POST
- **Body:** `FormData` with a single `file` field (image)
- **Validation:** Must be image (PNG, JPG, SVG, WebP). Max 2MB.
- **Logic:** Save to `public/uploads/logos/<uuid>.<ext>`. Return `{ url: "/uploads/logos/<uuid>.<ext>" }`.

### 7.5 Audit log endpoint

**`src/app/api/admin/audit-log/route.ts`**

- **Method:** GET
- **Auth:** Required
- **Query params:** `?entityType=restaurant&entityId=<uuid>` (optional filters), `?page=1&limit=50`
- **Return:** Audit log entries with admin name joined, sorted by `createdAt` descending

### 7.6 Verification

- Create a restaurant via POST → confirm it appears in GET list
- Update the restaurant → confirm audit log entry created
- Delete the restaurant → confirm status changes to "archived"
- Create a menu item → confirm it's linked to the restaurant
- Update the item → confirm audit log
- Soft-delete the item → confirm `isAvailable` is false

---

## 8. Priority 4 — PDF Ingestion Pipeline

**Depends on:** P0, P1, P2 (and P3 for restaurant records to exist)
**Produces:** Full pipeline: upload → extract → AI structure → validate → review → approve

This is the core differentiator. Build it carefully.

### 8.1 PDF upload endpoint

**`src/app/api/admin/ingestion/upload/route.ts`**

- **Method:** POST
- **Auth:** Required
- **Body:** `FormData` with fields: `restaurantId` (string), `file` (PDF)
- **Validation:**
  - `restaurantId` must reference an existing restaurant
  - File must be PDF (check MIME type and magic bytes)
  - File max 50MB
- **Logic:**
  1. Save PDF to `public/uploads/pdfs/<uuid>.pdf`
  2. Create `ingestion_jobs` record with status `"pending"`
  3. Return the job ID immediately (don't block on processing)
  4. Trigger the processing pipeline asynchronously (see 8.2)

For async processing in MVP, use a simple approach: start the pipeline in a fire-and-forget `Promise` (not `await`ed). The frontend polls the job status. In Phase 2, replace with a proper job queue (BullMQ or similar).

### 8.2 Processing pipeline

`src/lib/ingestion/pipeline.ts`:

Create a function `runIngestionPipeline(jobId: string)` that executes the following stages sequentially. Update the job status in the database at each stage transition. If any stage throws, catch the error, set status to `"failed"`, write the error to `errorLog`, and stop.

```typescript
export async function runIngestionPipeline(jobId: string): Promise<void> {
  try {
    // Stage 1: Update status to "processing"
    await updateJobStatus(jobId, "processing");

    // Stage 2: Extract text from PDF
    const rawText = await extractTextFromPdf(jobId);
    await saveRawText(jobId, rawText);

    // Stage 3: Send to AI agent for structuring
    const structuredData = await aiExtractNutritionData(jobId, rawText);
    await saveStructuredData(jobId, structuredData);

    // Stage 4: Run validation
    const validationReport = runValidation(structuredData);
    await saveValidationReport(jobId, validationReport);

    // Stage 5: Update status to "review" (await admin approval)
    await updateJobStatus(jobId, "review");
  } catch (error) {
    await failJob(jobId, error);
  }
}
```

### 8.3 Stage 2: PDF text extraction

`src/lib/ingestion/extract.ts`:

```typescript
import pdf from "pdf-parse";
import fs from "fs/promises";

export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  const buffer = await fs.readFile(pdfPath);
  const data = await pdf(buffer);
  return data.text;
}
```

If `data.text` is empty or very short (<100 chars), the PDF is likely scanned/image-based. For MVP, set the job to failed with a message: "PDF appears to be scanned/image-based. Text-based PDFs are required for MVP. OCR support coming in Phase 2."

### 8.4 Stage 3: AI structuring agent

`src/lib/ingestion/ai-agent.ts`:

Use the Anthropic SDK to send the extracted text to Claude with a structured prompt.

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic(); // Uses ANTHROPIC_API_KEY env var

export interface ExtractedItem {
  name: string;
  category: string;
  servingSize: string | null;
  calories: number;
  totalFatG: number | null;
  saturatedFatG: number | null;
  transFatG: number | null;
  cholesterolMg: number | null;
  sodiumMg: number | null;
  totalCarbsG: number | null;
  dietaryFiberG: number | null;
  sugarsG: number | null;
  proteinG: number | null;
  confidence: "high" | "medium" | "low";
  notes: string | null;
}

export async function aiExtractNutritionData(
  rawText: string,
  restaurantName: string
): Promise<ExtractedItem[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    system: AI_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Restaurant: ${restaurantName}\n\nNutrition guide text:\n\n${rawText}`
      }
    ],
  });

  // Parse JSON from response
  const text = response.content
    .filter(block => block.type === "text")
    .map(block => block.text)
    .join("");

  // Extract JSON from the response (handle markdown code fences)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI response did not contain valid JSON array");

  const items: ExtractedItem[] = JSON.parse(jsonMatch[0]);
  return items;
}
```

For the full `AI_SYSTEM_PROMPT`, see [Section 17: AI Prompt Templates](#17-ai-prompt-templates).

**Chunking strategy for large PDFs:** If `rawText` exceeds 100,000 characters, split it at double-newline boundaries into chunks of ~80,000 characters each. Process each chunk with the AI separately, passing the running list of discovered categories to each subsequent call for consistency. Merge results at the end, deduplicating by item name.

### 8.5 Stage 4: Validation engine

`src/lib/ingestion/validation.ts`:

Run every extracted item through these checks. Return a validation report structured as an array of item-level results.

```typescript
export interface ValidationResult {
  itemIndex: number;
  itemName: string;
  status: "pass" | "warning" | "error";
  checks: ValidationCheck[];
}

export interface ValidationCheck {
  name: string;
  status: "pass" | "warning" | "error";
  message: string;
}
```

**Validation checks to implement:**

| # | Check name | Logic | Severity |
|---|---|---|---|
| 1 | `required_fields` | `name`, `calories`, `proteinG`, `totalCarbsG`, `totalFatG` must be present and non-null | Error |
| 2 | `calorie_range` | `calories` must be ≥ 1 and ≤ 5000 | Error |
| 3 | `macro_math` | Calculate `(proteinG * 4) + (totalCarbsG * 4) + (totalFatG * 9)`. This should be within 20% of stated `calories`. Formula: `abs(calculated - calories) / calories <= 0.20` | Warning |
| 4 | `duplicate_name` | No two items in the same extraction batch should have identical names | Warning |
| 5 | `serving_size_present` | `servingSize` should be non-null and non-empty | Warning |
| 6 | `category_assigned` | `category` must be non-null and non-empty | Error |
| 7 | `negative_values` | No nutritional value should be negative | Error |
| 8 | `sodium_range` | If `sodiumMg` > 10000, flag as likely error | Warning |
| 9 | `confidence_check` | If AI returned `confidence: "low"`, flag for review | Warning |

The overall item `status` is the worst status among its checks (error > warning > pass).

### 8.6 Ingestion job status endpoint

**`src/app/api/admin/ingestion/[jobId]/route.ts`**

- **Method:** GET
- **Auth:** Required
- **Returns:** Full ingestion job record including `status`, `structuredData`, `validationReport`, `itemsExtracted`, `errorLog`

The admin frontend polls this endpoint every 2 seconds while status is `"pending"` or `"processing"`.

### 8.7 Edit extracted item endpoint

**`src/app/api/admin/ingestion/[jobId]/items/[itemIndex]/route.ts`**

- **Method:** PUT
- **Auth:** Required
- **Body:** Partial item fields (any field from `ExtractedItem`)
- **Logic:** Update the specific item in the `structuredData` JSONB array at the given index. Re-run validation on the modified item. Update `validationReport`.

### 8.8 Approve endpoint

**`src/app/api/admin/ingestion/[jobId]/approve/route.ts`**

- **Method:** POST
- **Auth:** Required
- **Body:** `{ itemIndexes: number[] }` — which items to approve. Send all indexes to approve all.
- **Validation:** All items at the given indexes must have validation status of "pass" or "warning" (not "error"). Return 400 if any have errors.
- **Logic:**
  1. For each approved item, create a `menu_items` record
  2. Update `restaurant.itemCount` (increment by number of new items)
  3. Update `restaurant.lastIngestionAt` to now
  4. If the restaurant's status is `"draft"`, change it to `"active"`
  5. Update `ingestion_jobs.itemsApproved`
  6. If all items are now approved, set job status to `"approved"`
  7. Log audit entries

### 8.9 Verification

Full end-to-end test:
1. Create a restaurant via the admin API
2. Upload a real nutrition PDF (use McDonald's — publicly available)
3. Poll the job status until it reaches `"review"`
4. GET the job → confirm `structuredData` contains extracted items with correct fields
5. Confirm `validationReport` has per-item results
6. Edit an item's calories → confirm re-validation runs
7. Approve all items → confirm they appear in the `menu_items` table
8. Confirm restaurant `itemCount` and `lastIngestionAt` are updated

---

## 9. Priority 5 — Admin Dashboard UI

**Depends on:** P0, P1, P2, P3, P4
**Produces:** Complete admin interface consuming all backend APIs

### 9.1 Layout and navigation

**`src/app/(admin)/admin/layout.tsx`**

Admin layout with:
- Sidebar navigation: Overview, Restaurants, Ingestion, Menu Items, Audit Log, Admin Users
- Top bar with current admin name and logout button
- Main content area

Use shadcn/ui `Sidebar`, `Button`, `Avatar` components. Keep the layout clean and functional — this is an internal tool, not a consumer product.

### 9.2 Login page

**`src/app/(admin)/admin/login/page.tsx`**

- Email and password form
- Submit calls `POST /api/admin/auth/login`
- On success, store JWT in an httpOnly cookie (set via a `POST /api/admin/auth/session` endpoint that sets the cookie server-side) and redirect to `/admin`
- On failure, show error message
- No "forgot password" for MVP

### 9.3 Overview page

**`src/app/(admin)/admin/page.tsx`**

Dashboard showing:
- Total restaurants (active / draft / archived)
- Total menu items
- Recent ingestion jobs (last 5) with status badges
- Data freshness: oldest `lastIngestionAt` among active restaurants

Use shadcn/ui `Card` components. Fetch data from existing API endpoints.

### 9.4 Restaurants page

**`src/app/(admin)/admin/restaurants/page.tsx`**

- Table listing all restaurants with columns: Name, Status (badge), Items, Last Updated
- "Add Restaurant" button → opens a dialog/form
- Row click → navigates to restaurant detail page
- Status filter tabs: All / Active / Draft / Archived

**`src/app/(admin)/admin/restaurants/[id]/page.tsx`**

- Restaurant detail with editable fields (name, slug, website, description)
- Logo upload widget
- Status toggle
- "Upload Nutrition PDF" button → triggers ingestion flow (navigates to ingestion page)
- Table of all menu items for this restaurant

### 9.5 Ingestion page (critical UI)

**`src/app/(admin)/admin/ingestion/page.tsx`**

Two sections:
1. **New Ingestion:** Restaurant selector dropdown + PDF file upload input + "Start Ingestion" button
2. **Job History:** Table of all ingestion jobs with columns: Restaurant, Status (badge), Items Found, Items Approved, Date

**`src/app/(admin)/admin/ingestion/[jobId]/page.tsx`**

This is the review interface — the most important admin page.

**When job status is "pending" or "processing":**
- Show a loading/progress indicator
- Poll `GET /api/admin/ingestion/[jobId]` every 2 seconds
- Show stage progress: Upload ✓ → Extracting text... → AI processing... → Validating...

**When job status is "review":**
- Show a data table with ALL extracted items
- Columns: Select (checkbox), Name, Category, Serving Size, Calories, Fat, Carbs, Protein, Confidence, Status
- Status column shows colored badge: green (pass), yellow (warning), red (error)
- Clicking a row expands it to show:
  - All nutritional fields (editable inline inputs)
  - Validation check results (list of checks with pass/warning/error)
  - AI confidence level and notes
- Inline editing: clicking a cell makes it editable. On blur/enter, calls PUT to update the item and re-validate.
- Row coloring: light red background for error items, light yellow for warning, white for pass
- Action bar at top:
  - "Approve Selected" button (disabled if any selected items have errors)
  - "Approve All Passing" button (approves all items with status pass or warning)
  - "Select All" checkbox
- After approval, show success count and any items that weren't approved

**When job status is "approved":**
- Show summary: X items approved, link to restaurant's item list

**When job status is "failed":**
- Show error message from `errorLog`
- "Retry" button to create a new job with the same PDF

### 9.6 Menu Items page

**`src/app/(admin)/admin/items/page.tsx`**

- Restaurant filter dropdown (required — don't load all items from all restaurants at once)
- Category filter dropdown (populated based on selected restaurant)
- Search within results
- Data table with columns: Name, Category, Calories, Protein, Carbs, Fat, Available
- Inline editing on cell click
- Bulk actions: select rows → delete / recategorize

### 9.7 Audit Log page

**`src/app/(admin)/admin/audit-log/page.tsx`**

- Chronological table: Date, Admin, Action, Entity Type, Entity, Changes
- "Changes" column shows a diff summary (before → after for key fields)
- Filter by entity type and admin

### 9.8 Admin Users page

**`src/app/(admin)/admin/users/page.tsx`**

- Table of admin accounts: Name, Email, Status, Created Date
- "Add Admin" button → dialog with name, email, password fields
- Deactivate button (set `isActive = false`, don't delete)

API endpoint needed: **`src/app/api/admin/users/route.ts`** (GET list, POST create)
API endpoint needed: **`src/app/api/admin/users/[id]/route.ts`** (PUT to deactivate)

### 9.9 Verification

- Log in as the seeded admin
- Create a restaurant with a logo
- Upload a nutrition PDF and watch the pipeline progress in real time
- Review extracted items, edit a field, approve
- Verify approved items appear in the menu items page
- Check audit log shows all actions

---

## 10. Priority 6 — Consumer API

**Depends on:** P0, P1 (reads from populated database)
**Produces:** Public, read-only API endpoints

All consumer endpoints are **public** (no auth). They only return data where `restaurant.status = "active"` and `menuItem.isAvailable = true`.

### 10.1 Endpoints

**`src/app/api/v1/restaurants/route.ts`**

- **Method:** GET
- **Returns:** Array of `{ id, name, slug, logoUrl, description, itemCount, lastIngestionAt }`
- **Filter:** Only `status = "active"` restaurants
- **Sort:** Alphabetical by name

**`src/app/api/v1/restaurants/[slug]/route.ts`**

- **Method:** GET
- **Returns:** Full restaurant record + array of distinct categories for that restaurant
- **404** if restaurant not found or not active

**`src/app/api/v1/restaurants/[slug]/items/route.ts`**

- **Method:** GET
- **Returns:** All available menu items for the restaurant
- **Query params:**
  - `?category=Burgers` — filter by category
  - `?minProtein=20` — minimum protein grams
  - `?maxCalories=600` — maximum calories
  - `?sort=calories_asc` | `calories_desc` | `protein_desc` | `name_asc`
  - `?page=1&limit=50`

**`src/app/api/v1/items/[id]/route.ts`**

- **Method:** GET
- **Returns:** Full item detail including all nutritional fields, restaurant name and slug, source PDF URL, last updated date
- **404** if item not found or not available

**`src/app/api/v1/search/route.ts`**

- **Method:** GET
- **Query params:** `?q=<search term>`
- **Logic:** Search against `menuItems.name`, `restaurants.name`, and `menuItems.category`. Use PostgreSQL `ILIKE` for MVP. Return top 50 results.
- **Returns:** Array of `{ id, name, restaurantName, restaurantSlug, category, calories, proteinG, totalCarbsG, totalFatG }`

**`src/app/api/v1/all-items/route.ts`**

- **Method:** GET
- **Purpose:** Returns ALL available items across all active restaurants in a single payload. Used by the frontend to populate the client-side search cache.
- **Returns:** Array of `{ id, name, restaurantId, restaurantName, restaurantSlug, category, calories, proteinG, totalCarbsG, totalFatG, servingSize }`
- **Caching:** Set `Cache-Control: public, max-age=300` (5 min cache). This endpoint is called once on page load.
- **Note:** This works for MVP scale (<5,000 items, ~200KB JSON). Replace with paginated search in Phase 2.

### 10.2 Verification

- With at least one restaurant and items approved via ingestion, confirm all endpoints return correct data
- Confirm archived restaurants and unavailable items are excluded
- Confirm search returns relevant results
- Confirm `/all-items` returns a complete payload

---

## 11. Priority 7 — Consumer Frontend

**Depends on:** P0, P6
**Produces:** Full consumer-facing web application

### 11.1 Layout

**`src/app/(consumer)/layout.tsx`**

- Header: FastCalorie logo/name (left), minimal nav (right) — just "Restaurants" link for MVP
- Footer: "Data sourced from official restaurant nutrition guides" + link to About page
- Responsive: single column on mobile, centered max-width container on desktop

**Design direction:** Clean, fast, utility-focused. Think "Google search results" not "food blog." White background, minimal decoration, strong typography, orange accent color (#E85D26) for the brand.

### 11.2 Home page

**`src/app/(consumer)/page.tsx`**

This is the most important page. It should be:
- A large search bar, centered, prominent (like Google's homepage)
- Placeholder text: "Search any fast food item..."
- Below the search bar: grid of restaurant logos/names (clickable, links to restaurant page)
- As the user types, show instant results below the search bar (client-side filtering)

**Search implementation:**

On page mount, call `GET /api/v1/all-items` and cache the result using React Query. Initialize a `Fuse.js` instance with the items array:

```typescript
const fuse = new Fuse(allItems, {
  keys: [
    { name: "name", weight: 0.5 },
    { name: "restaurantName", weight: 0.3 },
    { name: "category", weight: 0.2 },
  ],
  threshold: 0.3,
  includeScore: true,
});
```

On input change (debounced 150ms), run `fuse.search(query)` and display results.

**Search result card:** Each result shows:
- Item name (bold)
- Restaurant name (muted)
- Calories (large), Protein / Carbs / Fat (smaller, in a row)
- Clicking navigates to item detail page

### 11.3 Restaurant browse page

**`src/app/(consumer)/restaurants/page.tsx`**

- Grid of restaurant cards (logo, name, item count)
- Alphabetical order
- Responsive: 2 columns on mobile, 3 on tablet, 4 on desktop

### 11.4 Restaurant detail page

**`src/app/(consumer)/restaurants/[slug]/page.tsx`**

- Restaurant name, logo, description at top
- Category tabs/pills (e.g., "Burgers", "Chicken", "Sides", "Drinks")
- Clicking a category filters the list below
- Menu item list: each row shows name, calories, protein, carbs, fat
- Sort controls: sort by calories (↑↓), protein (↑↓), name (A-Z)
- Clicking an item navigates to item detail

### 11.5 Item detail page

**`src/app/(consumer)/items/[id]/page.tsx`**

- Item name (large heading)
- Restaurant name with link back to restaurant page
- Category badge
- Serving size

**Macro overview section:**
- Large calorie number
- Visual breakdown: horizontal stacked bar or donut chart showing the calorie contribution of protein, carbs, and fat
  - Protein: `proteinG * 4` calories (use color: blue)
  - Carbs: `totalCarbsG * 4` calories (use color: green)
  - Fat: `totalFatG * 9` calories (use color: orange)
- Show percentages: "45% fat, 35% carbs, 20% protein"

**Full nutrition table:**
Display all available fields in a clean two-column table matching the style of a US nutrition facts label:

| Nutrient | Amount |
|---|---|
| Calories | 540 |
| Total Fat | 28g |
| Saturated Fat | 10g |
| Trans Fat | 1g |
| Cholesterol | 75mg |
| Sodium | 1040mg |
| Total Carbohydrates | 46g |
| Dietary Fiber | 3g |
| Sugars | 9g |
| Protein | 25g |

**Source attribution:** "Data from [Restaurant Name] official nutrition guide. Last updated [date]."

### 11.6 Filtering sidebar/controls

On the restaurant detail page and as an advanced option on the home page, provide:
- Calorie range: min/max number inputs or a range slider
- Minimum protein: number input
- Restaurant filter: multi-select checkboxes (on home page search results)
- Sort: dropdown with options "Calories (low→high)", "Calories (high→low)", "Protein (high→low)", "Name (A→Z)"

All filtering happens client-side against the cached data.

### 11.7 SEO & metadata

Every page should have proper metadata for SEO:
- Home: "FastCalorie — Fast Food Nutrition Search"
- Restaurant page: "[Restaurant Name] Nutrition Facts & Calories | FastCalorie"
- Item page: "[Item Name] Calories & Macros — [Restaurant] | FastCalorie"

Use Next.js `generateMetadata` for dynamic pages.

### 11.8 Verification

- Home page loads and shows search bar + restaurant grid
- Typing in search bar shows instant results
- Clicking a restaurant shows its menu items organized by category
- Clicking an item shows full nutrition detail with macro chart
- All pages are responsive on 320px–1440px viewports
- No layout shifts on load (check Lighthouse CLS)

---

## 12. Priority 8 — Data Seeding & QA

**Depends on:** P0–P7 all complete
**Produces:** Production-ready database with 15+ restaurants

### 8.1 Ingest the following restaurants

Process these in order. Each one exercises the pipeline and validates the AI extraction quality.

| Priority | Restaurant | Notes |
|---|---|---|
| 1 | McDonald's | Large, well-structured PDF. Good baseline test. |
| 2 | Chick-fil-A | Clean format, medium size. |
| 3 | Wendy's | Good variety of categories. |
| 4 | Taco Bell | Tests handling of customizable items. |
| 5 | Subway | Very large menu. Tests chunking. |
| 6 | Chipotle | Smaller menu, may need web source. |
| 7 | Burger King | Standard format. |
| 8 | Popeyes | Smaller menu. |
| 9 | Panda Express | Different cuisine category. |
| 10 | Five Guys | Simple, small menu. |
| 11 | Chili's | Large sit-down menu. |
| 12 | Arby's | Medium size. |
| 13 | Sonic | Large menu with drinks. |
| 14 | Jack in the Box | Good variety. |
| 15 | Whataburger | Regional chain, tests coverage. |

### 8.2 QA checklist for each restaurant

After ingesting each restaurant, verify:

- [ ] All menu categories are present and correctly named
- [ ] Item count matches expectations (compare to the PDF)
- [ ] Spot-check 5 random items: compare calories, protein, fat, carbs to the PDF
- [ ] No items with 0 calories (unless it's a drink like water or diet soda)
- [ ] No duplicate items
- [ ] Serving sizes are present and readable
- [ ] Restaurant appears correctly on the consumer browse page
- [ ] Search finds items from this restaurant

### 8.3 Cross-restaurant QA

- [ ] Search for "burger" → results from multiple restaurants
- [ ] Search for "chicken" → results from multiple restaurants
- [ ] Filter by calorie range works across all restaurants
- [ ] Sort by protein shows correct ordering across restaurants
- [ ] All restaurant logos display correctly
- [ ] Home page restaurant grid shows all 15 restaurants

---

## 13. Priority 9 — Polish, Performance & Deploy

**Depends on:** P0–P8 all complete
**Produces:** Deployed, production-ready application

### 9.1 Performance targets

| Metric | Target | How to measure |
|---|---|---|
| Lighthouse Performance | ≥ 90 | Run Lighthouse on home, restaurant, and item pages |
| LCP (Largest Contentful Paint) | < 1.5s | Core Web Vitals |
| CLS (Cumulative Layout Shift) | < 0.1 | Core Web Vitals |
| FID (First Input Delay) | < 100ms | Core Web Vitals |
| `/api/v1/all-items` response time | < 500ms | Server logs |
| Client-side search latency | < 50ms | Performance.now() measurement |

### 9.2 Caching strategy

- **`/api/v1/restaurants`**: `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- **`/api/v1/restaurants/[slug]`**: `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- **`/api/v1/all-items`**: `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- **`/api/v1/items/[id]`**: `Cache-Control: public, s-maxage=600, stale-while-revalidate=1200`
- **Admin endpoints**: No caching (`Cache-Control: no-store`)

### 9.3 Error handling

- All API routes should have top-level try/catch blocks
- Return consistent error shape: `{ error: string, details?: unknown }`
- Consumer pages should show friendly error states (not raw errors)
- Admin pages should show detailed error messages for debugging

### 9.4 Loading states

- Every page that fetches data should show a skeleton/shimmer UI while loading (not a spinner)
- Search results should show a subtle loading indicator during debounce
- Ingestion review page should show progress steps during pipeline processing

### 9.5 404 and error pages

- `src/app/not-found.tsx`: Custom 404 page with search bar and link to home
- `src/app/error.tsx`: Custom error page with retry button

### 9.6 Deployment

**Vercel deployment:**

1. Connect GitHub repo to Vercel
2. Set environment variables (see Section 15)
3. Set build command: `npm run build`
4. Set output directory: `.next`

**Database:**

1. Create a Neon or Supabase PostgreSQL instance
2. Run migrations: `npx drizzle-kit migrate`
3. Run seed script: `npx tsx scripts/seed-admin.ts`

**Post-deploy checks:**

- [ ] Home page loads in production
- [ ] Admin login works
- [ ] PDF upload and ingestion pipeline completes
- [ ] Search works
- [ ] All restaurant pages load
- [ ] All item detail pages load
- [ ] Mobile layout is correct

### 9.7 CI/CD (minimal for MVP)

Set up GitHub Actions workflow:

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - run: npm run lint
```

Type checking and linting on every push. No automated tests for MVP (add in Phase 2).

---

## 14. File Tree Reference

Complete expected file tree at the end of MVP development:

```
fastcalorie/
├── src/
│   ├── app/
│   │   ├── (consumer)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                           # Home + search
│   │   │   ├── restaurants/
│   │   │   │   ├── page.tsx                       # Restaurant grid
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx                   # Restaurant detail + items
│   │   │   └── items/
│   │   │       └── [id]/
│   │   │           └── page.tsx                   # Item detail
│   │   ├── (admin)/
│   │   │   └── admin/
│   │   │       ├── layout.tsx                     # Admin shell (sidebar + topbar)
│   │   │       ├── login/
│   │   │       │   └── page.tsx
│   │   │       ├── page.tsx                       # Overview dashboard
│   │   │       ├── restaurants/
│   │   │       │   ├── page.tsx                   # Restaurant list
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx               # Restaurant detail + edit
│   │   │       ├── ingestion/
│   │   │       │   ├── page.tsx                   # Upload + job history
│   │   │       │   └── [jobId]/
│   │   │       │       └── page.tsx               # Review interface
│   │   │       ├── items/
│   │   │       │   └── page.tsx                   # Item browser + edit
│   │   │       ├── audit-log/
│   │   │       │   └── page.tsx
│   │   │       └── users/
│   │   │           └── page.tsx                   # Admin user management
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login/route.ts
│   │   │   │   │   ├── me/route.ts
│   │   │   │   │   └── session/route.ts
│   │   │   │   ├── restaurants/
│   │   │   │   │   ├── route.ts                   # GET list, POST create
│   │   │   │   │   └── [id]/route.ts              # GET, PUT, DELETE
│   │   │   │   ├── items/
│   │   │   │   │   ├── route.ts                   # GET list
│   │   │   │   │   ├── [id]/route.ts              # GET, PUT, DELETE
│   │   │   │   │   └── bulk/route.ts              # POST bulk actions
│   │   │   │   ├── ingestion/
│   │   │   │   │   ├── upload/route.ts            # POST upload PDF
│   │   │   │   │   └── [jobId]/
│   │   │   │   │       ├── route.ts               # GET job status
│   │   │   │   │       ├── approve/route.ts       # POST approve items
│   │   │   │   │       └── items/
│   │   │   │   │           └── [itemIndex]/route.ts  # PUT edit extracted item
│   │   │   │   ├── upload/
│   │   │   │   │   └── logo/route.ts              # POST logo upload
│   │   │   │   ├── audit-log/route.ts             # GET audit entries
│   │   │   │   └── users/
│   │   │   │       ├── route.ts                   # GET list, POST create
│   │   │   │       └── [id]/route.ts              # PUT deactivate
│   │   │   └── v1/
│   │   │       ├── restaurants/
│   │   │       │   ├── route.ts                   # GET list
│   │   │       │   └── [slug]/
│   │   │       │       ├── route.ts               # GET detail
│   │   │       │       └── items/route.ts         # GET items
│   │   │       ├── items/
│   │   │       │   └── [id]/route.ts              # GET detail
│   │   │       ├── search/route.ts                # GET search
│   │   │       └── all-items/route.ts             # GET all items (cache feed)
│   │   ├── layout.tsx                             # Root layout
│   │   ├── not-found.tsx
│   │   └── error.tsx
│   ├── components/
│   │   ├── ui/                                    # shadcn/ui components
│   │   ├── consumer/
│   │   │   ├── search-bar.tsx
│   │   │   ├── search-results.tsx
│   │   │   ├── restaurant-card.tsx
│   │   │   ├── restaurant-grid.tsx
│   │   │   ├── menu-item-row.tsx
│   │   │   ├── item-detail-card.tsx
│   │   │   ├── macro-chart.tsx                    # Donut/bar chart component
│   │   │   ├── nutrition-table.tsx
│   │   │   ├── category-tabs.tsx
│   │   │   └── filter-controls.tsx
│   │   └── admin/
│   │       ├── sidebar.tsx
│   │       ├── topbar.tsx
│   │       ├── data-table.tsx                     # Reusable sortable table
│   │       ├── restaurant-form.tsx
│   │       ├── ingestion-uploader.tsx
│   │       ├── ingestion-review-table.tsx
│   │       ├── ingestion-progress.tsx
│   │       ├── item-editor.tsx
│   │       ├── audit-log-viewer.tsx
│   │       └── admin-user-form.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts                           # Drizzle client
│   │   │   ├── schema.ts                          # All table definitions
│   │   │   └── audit.ts                           # Audit log helper
│   │   ├── auth/
│   │   │   ├── index.ts                           # Hash, verify, sign, verify token
│   │   │   └── middleware.ts                      # withAuth wrapper
│   │   ├── ingestion/
│   │   │   ├── pipeline.ts                        # Main pipeline orchestrator
│   │   │   ├── extract.ts                         # PDF text extraction
│   │   │   ├── ai-agent.ts                        # Claude API call
│   │   │   ├── validation.ts                      # Validation engine
│   │   │   └── prompts.ts                         # AI system prompt
│   │   ├── validators/
│   │   │   ├── restaurant.ts                      # Zod schemas
│   │   │   └── menuItem.ts                        # Zod schemas
│   │   └── utils.ts                               # slugify, formatters, etc.
│   ├── hooks/
│   │   ├── use-search.ts                          # Client-side search hook
│   │   └── use-auth.ts                            # Admin auth state hook
│   └── types/
│       └── index.ts                               # Shared TypeScript types
├── public/
│   └── uploads/
│       ├── logos/                                  # Restaurant logos
│       └── pdfs/                                   # Uploaded nutrition PDFs
├── scripts/
│   └── seed-admin.ts                              # CLI to create first admin
├── drizzle/                                       # Auto-generated migrations
├── .env.local
├── .gitignore
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 15. Environment Variables

`.env.local` — all required variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/fastcalorie"

# Auth
JWT_SECRET="generate-a-64-char-random-string-here"

# AI
ANTHROPIC_API_KEY="sk-ant-..."

# Seed admin (used by scripts/seed-admin.ts only)
SEED_ADMIN_EMAIL="admin@fastcalorie.com"
SEED_ADMIN_NAME="Admin"
SEED_ADMIN_PASSWORD="change-this-to-a-secure-password"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

For production, set these as Vercel environment variables. Never commit `.env.local` to git.

---

## 16. Validation Rules Reference

Quick reference for all validation logic used across the application.

### Restaurant validation

| Field | Rule |
|---|---|
| name | Required, 1–255 chars |
| slug | Required, 1–255 chars, regex `^[a-z0-9-]+$`, unique |
| logoUrl | Optional, valid URL if provided |
| websiteUrl | Optional, valid URL if provided |
| description | Optional, max 2000 chars |
| status | Must be one of: `active`, `draft`, `archived` |

### Menu item validation

| Field | Rule |
|---|---|
| name | Required, 1–500 chars |
| category | Required, 1–255 chars |
| calories | Required, integer, 0–10000 |
| totalFatG | Optional, decimal, 0–1000 |
| saturatedFatG | Optional, decimal, 0–500 |
| transFatG | Optional, decimal, 0–100 |
| cholesterolMg | Optional, decimal, 0–5000 |
| sodiumMg | Optional, decimal, 0–50000 |
| totalCarbsG | Optional, decimal, 0–2000 |
| dietaryFiberG | Optional, decimal, 0–500 |
| sugarsG | Optional, decimal, 0–1000 |
| proteinG | Optional, decimal, 0–500 |

### Ingestion validation checks

| Check | Rule | Severity |
|---|---|---|
| required_fields | name + calories + proteinG + totalCarbsG + totalFatG must be non-null | Error |
| calorie_range | 1 ≤ calories ≤ 5000 | Error |
| macro_math | `abs((P*4 + C*4 + F*9) - calories) / calories ≤ 0.20` | Warning |
| duplicate_name | No two items with same name in batch | Warning |
| serving_size_present | servingSize is non-null and non-empty | Warning |
| category_assigned | category is non-null and non-empty | Error |
| negative_values | All nutritional values ≥ 0 | Error |
| sodium_range | sodiumMg ≤ 10000 | Warning |
| confidence_check | AI confidence is not "low" | Warning |

---

## 17. AI Prompt Templates

### System prompt for the nutrition extraction agent

Store this in `src/lib/ingestion/prompts.ts`:

```typescript
export const AI_SYSTEM_PROMPT = `You are a nutrition data extraction agent for FastCalorie. Your job is to read raw text extracted from a restaurant's nutrition PDF and return structured JSON data for every menu item.

## Output schema

Return a JSON array where each element is an object with these exact fields:

{
  "name": "string — exact item name as shown in the PDF",
  "category": "string — one of the categories listed below, or create a new one if needed",
  "servingSize": "string or null — e.g. '1 sandwich (215g)' or '1 serving'",
  "calories": "integer — total calories (kcal)",
  "totalFatG": "number or null — total fat in grams",
  "saturatedFatG": "number or null — saturated fat in grams",
  "transFatG": "number or null — trans fat in grams",
  "cholesterolMg": "number or null — cholesterol in mg",
  "sodiumMg": "number or null — sodium in mg",
  "totalCarbsG": "number or null — total carbohydrates in grams",
  "dietaryFiberG": "number or null — dietary fiber in grams",
  "sugarsG": "number or null — total sugars in grams",
  "proteinG": "number or null — protein in grams",
  "confidence": "'high' | 'medium' | 'low' — your confidence in the extraction accuracy",
  "notes": "string or null — any ambiguities or issues you noticed"
}

## Standard categories

Use these categories when they fit. Create new ones only when necessary:
- Burgers
- Chicken
- Sandwiches
- Salads
- Sides
- Drinks
- Desserts
- Breakfast
- Wraps
- Tacos
- Bowls
- Kids Meals
- Sauces & Dressings
- Snacks

## Rules

1. Extract EVERY distinct menu item. Do not skip items.
2. If a value is missing from the PDF for a field, set it to null. Do NOT guess or calculate missing values.
3. Calories is the most critical field. If you cannot determine calories for an item, set confidence to "low" and explain in notes.
4. For items with size variants (Small, Medium, Large), create separate entries for EACH size. Name them like "French Fries (Small)", "French Fries (Medium)", etc.
5. For combo/meal entries, extract them as separate items only if the PDF provides distinct nutrition data for them.
6. Do not include section headers, footnotes, or non-food-item text as items.
7. Handle "0" values correctly — a 0 for trans fat is valid data, not missing data.
8. If the PDF uses "—" or "N/A" for a value, set that field to null.
9. Round all decimal values to 1 decimal place.

## Output format

Return ONLY the JSON array. No markdown, no code fences, no explanation text. Just the raw JSON array starting with [ and ending with ].`;
```

### Chunk continuation prompt

When processing large PDFs in chunks, prepend this to subsequent chunks:

```typescript
export function getChunkContinuationPrompt(
  existingCategories: string[],
  existingItemCount: number
): string {
  return `CONTINUATION: You are processing the next section of the same nutrition PDF.

Previously extracted: ${existingItemCount} items
Categories found so far: ${existingCategories.join(", ")}

Use the same categories where applicable. Continue extracting items. Return ONLY the JSON array of NEW items from this section.`;
}
```

---

## End of Document

This document is the single source of truth for the FastCalorie MVP. Build each priority in order. Every schema, endpoint, component, and validation rule is defined here. If something is ambiguous, prefer the simpler implementation — the goal is a working product, not a perfect one.
