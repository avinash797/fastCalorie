# FastCalorie MVP — Task Tracker

## P0: Project Scaffold (6/6) ✅

- [x] **Initialize monorepo** — Run `npx create-turbo@latest fastcalorie`, simplify to single Next.js app. Create directory structure: `src/app/(consumer)/`, `src/app/(admin)/`, `src/app/api/`, `src/components/{ui,consumer,admin}/`, `src/lib/{db,auth,ingestion,validators}/`, `src/hooks/`, `src/types/`, `public/uploads/{logos,pdfs}/`, `scripts/`, `drizzle/`.
- [x] **Install all dependencies** — Core: `next react react-dom`. DB: `drizzle-orm postgres`, dev `drizzle-kit`. Auth: `bcrypt jsonwebtoken` + types. PDF: `pdf-parse` + types. AI: `@anthropic-ai/sdk`. Validation: `zod`. UI: `tailwindcss @tailwindcss/postcss postcss`, run `npx shadcn@latest init`. Search: `fuse.js`. Data fetching: `@tanstack/react-query`. Utilities: `uuid nanoid slugify` + types. Dev: `typescript @types/node @types/react @types/react-dom`.
- [x] **Configure TypeScript** — `tsconfig.json` with `strict: true`, `target: "ES2022"`, `moduleResolution: "bundler"`, `jsx: "preserve"`, path alias `@/* -> ./src/*`, `incremental: true`, `isolatedModules: true`, `noEmit: true`, Next.js plugin.
- [x] **Configure Tailwind** — Follow Tailwind v4 conventions. Verify `src/app/globals.css` imports Tailwind after shadcn init. Confirm shadcn components render.
- [x] **Configure Next.js** — `next.config.ts`: set `experimental.serverActions.bodySizeLimit = "50mb"` for PDF uploads. Empty `images.remotePatterns` array.
- [x] **Verify P0** — `npm run dev` serves blank page at localhost:3000. Imports from `@/lib/...` and `@/components/...` resolve. shadcn `<Button>` renders correctly.

---

## P1: Database Schema & ORM (5/5) ✅

- [x] **Configure Drizzle** — Create `drizzle.config.ts`: schema path `./src/lib/db/schema.ts`, output `./drizzle`, dialect `postgresql`, dbCredentials from `DATABASE_URL` env var.
- [x] **Create database client** — `src/lib/db/index.ts`: import `drizzle` from `drizzle-orm/postgres-js`, import `postgres`, create client with `DATABASE_URL`, export `db = drizzle(client, { schema })`.
- [x] **Create complete schema** — `src/lib/db/schema.ts` with exactly these definitions:
  - Enums: `restaurant_status` (active/draft/archived), `ingestion_status` (pending/processing/review/approved/failed), `audit_action` (create/update/delete/approve).
  - `admins` table: id (uuid pk), email (varchar 255 unique), passwordHash (varchar 255), name (varchar 255), isActive (boolean default true), createdAt, updatedAt.
  - `restaurants` table: id (uuid pk), name (varchar 255), slug (varchar 255 unique), logoUrl (varchar 512 nullable), websiteUrl (varchar 512 nullable), description (text nullable), status (restaurant_status default "draft"), itemCount (int default 0), lastIngestionAt (timestamp nullable), createdAt, updatedAt. Indexes on slug and status.
  - `menuItems` table: id (uuid pk), restaurantId (uuid FK restaurants cascade), name (varchar 500), category (varchar 255), servingSize (varchar 255 nullable), calories (int), totalFatG/saturatedFatG/transFatG (decimal 7,2 nullable), cholesterolMg/sodiumMg (decimal 7,2 nullable), totalCarbsG/dietaryFiberG/sugarsG/proteinG (decimal 7,2 nullable), isAvailable (boolean default true), sourcePdfUrl (varchar 512 nullable), ingestionId (uuid FK ingestionJobs nullable), createdAt, updatedAt. Indexes on restaurantId, category, calories.
  - `ingestionJobs` table: id (uuid pk), restaurantId (uuid FK restaurants cascade), adminId (uuid FK admins), pdfUrl (varchar 512), status (ingestion_status default "pending"), rawText (text nullable), structuredData (jsonb nullable), validationReport (jsonb nullable), itemsExtracted (int default 0), itemsApproved (int default 0), errorLog (text nullable), createdAt, completedAt (nullable).
  - `auditLogs` table: id (uuid pk), adminId (uuid FK admins), entityType (varchar 50), entityId (uuid), action (audit_action), beforeData (jsonb nullable), afterData (jsonb nullable), createdAt. Indexes on (entityType, entityId), adminId, createdAt.
- [x] **Run migrations** — `npx drizzle-kit generate` then `npx drizzle-kit migrate`.
- [x] **Verify P1** — Connect to DB, confirm 5 tables exist (admins, restaurants, menu_items, ingestion_jobs, audit_logs), all enums created, all indexes created. Optionally run `npx drizzle-kit studio`.

---

## P2: Authentication System (8/8) ✅

- [x] **Create auth utility library** — `src/lib/auth/index.ts`: `hashPassword(password)` using bcrypt with 12 salt rounds, `verifyPassword(password, hash)` using bcrypt.compare, `signToken(payload: {adminId, email})` using jwt.sign with `JWT_SECRET` env var and 24h expiry, `verifyToken(token)` returning `AdminTokenPayload`.
- [x] **Create auth middleware** — `src/lib/auth/middleware.ts`: `withAuth(request, handler)` function that reads `Authorization: Bearer <token>` header, verifies JWT, fetches admin from DB confirming `isActive === true`, passes admin to handler, returns 401 on failure.
- [x] **Create admin login endpoint** — `src/app/api/admin/auth/login/route.ts`: POST, body `{email, password}` validated with Zod. Look up admin by email, verify password, sign JWT, return `{token, admin: {id, email, name}}`. 401 for invalid credentials, 403 if deactivated.
- [x] **Create admin session check endpoint** — `src/app/api/admin/auth/me/route.ts`: GET, auth required. Return `{id, email, name}` from token. Used by frontend to verify stored token on load.
- [x] **Create seed admin CLI script** — `scripts/seed-admin.ts`: runnable with `npx tsx scripts/seed-admin.ts`. Read from env vars `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, `SEED_ADMIN_PASSWORD` (or prompt). Hash password, insert admin record, print confirmation.
- [x] **Create Next.js middleware for admin routes** — `src/middleware.ts`: protect all `/admin/*` routes except `/admin/login`. Check for valid auth cookie/token. Redirect to `/admin/login` if missing/invalid. This is UX-level only; real security is in `withAuth`.
- [x] **Create audit log helper** — `src/lib/db/audit.ts`: `logAudit({adminId, entityType, entityId, action, beforeData?, afterData?})` inserts into audit_logs table. entityType is "restaurant" | "menu_item" | "ingestion_job". action is "create" | "update" | "delete" | "approve".
- [x] **Verify P2** — Seed admin with `admin@fastcalorie.com`. POST login with correct creds returns JWT. Wrong password returns 401. GET `/api/admin/auth/me` with JWT returns admin info. GET without token returns 401.

---

## P3: Admin API — Restaurant & Item CRUD (6/6) ✅

- [x] **Create Zod validation schemas** — `src/lib/validators/restaurant.ts`: `createRestaurantSchema` (name 1-255, slug regex `^[a-z0-9-]+$` unique, optional logoUrl/websiteUrl as valid URLs, optional description max 2000, optional status enum). `updateRestaurantSchema` as partial. `src/lib/validators/menuItem.ts`: `createMenuItemSchema` (restaurantId uuid, name 1-500, category 1-255, optional servingSize, calories int 0-10000, optional nutritional fields with min/max ranges, optional isAvailable boolean). `updateMenuItemSchema` as partial omitting restaurantId.
- [x] **Create restaurant API routes** — `src/app/api/admin/restaurants/route.ts`: GET list (id, name, slug, status, itemCount, lastIngestionAt; support `?status=` filter; sort by name), POST create (validate with createRestaurantSchema, auto-generate slug with `slugify` if not provided, check uniqueness, audit log). `src/app/api/admin/restaurants/[id]/route.ts`: GET single, PUT update (validate, check slug uniqueness if changed, audit log), DELETE soft-delete (set status="archived", audit log). All require `withAuth`.
- [x] **Create menu item API routes (admin)** — `src/app/api/admin/items/route.ts`: GET list (required `?restaurantId=`, optional `?category=`, paginate `?page=1&limit=50`). `src/app/api/admin/items/[id]/route.ts`: GET single, PUT update (validate, audit log, update updatedAt), DELETE soft-delete (set isAvailable=false, audit log). All require `withAuth`.
- [x] **Create bulk action endpoint** — `src/app/api/admin/items/bulk/route.ts`: POST with body `{itemIds: string[], action: "delete"|"recategorize", category?: string}`. For delete: set isAvailable=false. For recategorize: update category. Log one audit entry per item. Requires `withAuth`.
- [x] **Create logo upload endpoint** — `src/app/api/admin/upload/logo/route.ts`: POST FormData with `file` field. Validate: image only (PNG/JPG/SVG/WebP), max 2MB. Save to `public/uploads/logos/<uuid>.<ext>`. Return `{url: "/uploads/logos/<uuid>.<ext>"}`. Requires `withAuth`.
- [x] **Create audit log endpoint** — `src/app/api/admin/audit-log/route.ts`: GET, auth required. Query params: optional `?entityType=&entityId=`, `?page=1&limit=50`. Return audit entries with admin name joined, sorted by createdAt desc.

---

## P4: PDF Ingestion Pipeline (8/8) ✅

- [x] **Create PDF upload endpoint** — `src/app/api/admin/ingestion/upload/route.ts`: POST, auth required. FormData with `restaurantId` (must reference existing restaurant) and `file` (PDF, check MIME + magic bytes, max 50MB). Save to `public/uploads/pdfs/<uuid>.pdf`. Create `ingestion_jobs` record with status "pending". Return job ID immediately. Trigger pipeline async (fire-and-forget Promise, not awaited).
- [x] **Create processing pipeline orchestrator** — `src/lib/ingestion/pipeline.ts`: `runIngestionPipeline(jobId)` executes stages sequentially: update status to "processing" → extract text → save raw text → AI structuring → save structured data → run validation → save validation report → update status to "review". On error: set status "failed", write to errorLog, stop.
- [x] **Create PDF text extraction** — `src/lib/ingestion/extract.ts`: `extractTextFromPdf(pdfPath)` using `pdf-parse`. Read file buffer, extract text. If text is empty or <100 chars, fail with message "PDF appears to be scanned/image-based. Text-based PDFs required for MVP."
- [x] **Create AI structuring agent** — `src/lib/ingestion/ai-agent.ts`: `aiExtractNutritionData(rawText, restaurantName)` using Anthropic SDK with model `claude-sonnet-4-20250514`, max_tokens 16000. System prompt from `src/lib/ingestion/prompts.ts` (see Section 17 of plan). Parse JSON array from response (handle code fences). Chunking: if rawText >100k chars, split at double-newline boundaries into ~80k chunks, process each with AI passing running category list, merge and deduplicate by name.
- [x] **Create AI prompt templates** — `src/lib/ingestion/prompts.ts`: `AI_SYSTEM_PROMPT` constant with full extraction instructions (output schema, standard categories list, 9 extraction rules, raw JSON output format). `getChunkContinuationPrompt(existingCategories, existingItemCount)` for multi-chunk PDFs.
- [x] **Create validation engine** — `src/lib/ingestion/validation.ts`: Run every extracted item through 9 checks. Return `ValidationResult[]` with per-item status (pass/warning/error) and `ValidationCheck[]` per item. Checks: (1) required_fields — name/calories/proteinG/totalCarbsG/totalFatG non-null [Error], (2) calorie_range — 1-5000 [Error], (3) macro_math — `abs((P*4+C*4+F*9)-cal)/cal <= 0.20` [Warning], (4) duplicate_name — no identical names in batch [Warning], (5) serving_size_present — non-null non-empty [Warning], (6) category_assigned — non-null non-empty [Error], (7) negative_values — all nutritional values >= 0 [Error], (8) sodium_range — sodiumMg <= 10000 [Warning], (9) confidence_check — not "low" [Warning]. Overall item status = worst among checks.
- [x] **Create ingestion job status & edit endpoints** — `src/app/api/admin/ingestion/[jobId]/route.ts`: GET, auth required, return full job record (status, structuredData, validationReport, itemsExtracted, errorLog). Frontend polls every 2s while pending/processing. `src/app/api/admin/ingestion/[jobId]/items/[itemIndex]/route.ts`: PUT, auth required, body is partial item fields, update specific item in structuredData JSONB at given index, re-run validation on modified item, update validationReport.
- [x] **Create approve endpoint** — `src/app/api/admin/ingestion/[jobId]/approve/route.ts`: POST, auth required, body `{itemIndexes: number[]}`. Validate all items at given indexes have status pass or warning (not error, else 400). For each: create menu_items record, increment restaurant.itemCount, set restaurant.lastIngestionAt to now, change restaurant status from "draft" to "active" if needed, update ingestionJobs.itemsApproved, set job status to "approved" if all done, log audit entries.

---

## P5: Admin Dashboard UI (0/8)

- [x] **Create admin layout and navigation** — `src/app/(admin)/admin/layout.tsx`: Sidebar nav (Overview, Restaurants, Ingestion, Menu Items, Audit Log, Admin Users), top bar with admin name + logout button, main content area. Use shadcn Sidebar/Button/Avatar. Clean, functional internal tool style.
- [x] **Create login page** — `src/app/(admin)/admin/login/page.tsx`: Email + password form. Submit calls POST `/api/admin/auth/login`. On success: store JWT in httpOnly cookie via `POST /api/admin/auth/session` endpoint (create this too), redirect to `/admin`. On failure: show error. No forgot password for MVP.
- [x] **Create overview dashboard** — `src/app/(admin)/admin/page.tsx`: Cards showing total restaurants (active/draft/archived), total menu items, last 5 ingestion jobs with status badges, data freshness (oldest lastIngestionAt among active restaurants). Use shadcn Card.
- [x] **Create restaurants pages** — `src/app/(admin)/admin/restaurants/page.tsx`: Table with Name, Status badge, Items, Last Updated. "Add Restaurant" button opens dialog. Row click navigates to detail. Status filter tabs (All/Active/Draft/Archived). `src/app/(admin)/admin/restaurants/[id]/page.tsx`: Editable fields (name, slug, website, description), logo upload widget, status toggle, "Upload Nutrition PDF" button, table of menu items.
- [x] **Create ingestion pages (critical UI)** — `src/app/(admin)/admin/ingestion/page.tsx`: New Ingestion section (restaurant dropdown + PDF upload + Start button) and Job History table (Restaurant, Status badge, Items Found/Approved, Date). `src/app/(admin)/admin/ingestion/[jobId]/page.tsx`: Review interface — pending/processing: loading indicator + poll every 2s + stage progress. Review: data table with checkbox, Name, Category, Serving Size, Calories, Fat, Carbs, Protein, Confidence, Status badge (green/yellow/red). Row expand shows all fields (editable inline), validation checks, AI confidence. Inline editing calls PUT to update + re-validate. Row coloring (red=error, yellow=warning, white=pass). Action bar: "Approve Selected" (disabled if errors), "Approve All Passing", "Select All". Approved: summary + link. Failed: error message + Retry button.
- [x] **Create menu items page** — `src/app/(admin)/admin/items/page.tsx`: Required restaurant filter dropdown, category filter, search within results. Data table: Name, Category, Calories, Protein, Carbs, Fat, Available. Inline editing. Bulk actions: select rows then delete/recategorize.
- [x] **Create audit log page** — `src/app/(admin)/admin/audit-log/page.tsx`: Chronological table (Date, Admin, Action, Entity Type, Entity, Changes diff). Filter by entity type and admin.
- [x] **Create admin users page + API** — `src/app/(admin)/admin/users/page.tsx`: Table (Name, Email, Status, Created). "Add Admin" button opens dialog (name, email, password). Deactivate button (isActive=false). API: `src/app/api/admin/users/route.ts` (GET list, POST create), `src/app/api/admin/users/[id]/route.ts` (PUT deactivate).

---

## P6: Consumer API (0/6)

- [ ] **Create restaurant list endpoint** — `src/app/api/v1/restaurants/route.ts`: GET, public. Return `{id, name, slug, logoUrl, description, itemCount, lastIngestionAt}` for restaurants where status="active". Sort alphabetically.
- [ ] **Create restaurant detail endpoint** — `src/app/api/v1/restaurants/[slug]/route.ts`: GET, public. Return full restaurant record + array of distinct categories. 404 if not found or not active.
- [ ] **Create restaurant items endpoint** — `src/app/api/v1/restaurants/[slug]/items/route.ts`: GET, public. All available items for restaurant. Query params: `?category=`, `?minProtein=`, `?maxCalories=`, `?sort=calories_asc|calories_desc|protein_desc|name_asc`, `?page=1&limit=50`.
- [ ] **Create item detail endpoint** — `src/app/api/v1/items/[id]/route.ts`: GET, public. Full item with all nutritional fields, restaurant name/slug, source PDF URL, last updated. 404 if not found or unavailable.
- [ ] **Create search endpoint** — `src/app/api/v1/search/route.ts`: GET, public. `?q=<term>`. Search menuItems.name, restaurants.name, menuItems.category using PostgreSQL ILIKE. Top 50 results. Return `{id, name, restaurantName, restaurantSlug, category, calories, proteinG, totalCarbsG, totalFatG}`.
- [ ] **Create all-items cache endpoint** — `src/app/api/v1/all-items/route.ts`: GET, public. ALL available items across active restaurants. Return `{id, name, restaurantId, restaurantName, restaurantSlug, category, calories, proteinG, totalCarbsG, totalFatG, servingSize}`. Set `Cache-Control: public, max-age=300`. Single payload for client-side search (<5k items, ~200KB).

---

## P7: Consumer Frontend (0/7)

- [ ] **Create consumer layout** — `src/app/(consumer)/layout.tsx`: Header with FastCalorie logo/name (left) and "Restaurants" nav link (right). Footer: "Data sourced from official restaurant nutrition guides". Responsive single column mobile, centered max-width desktop. Design: clean, utility-focused, white bg, orange accent #E85D26.
- [ ] **Create home page with search** — `src/app/(consumer)/page.tsx`: Large centered search bar ("Search any fast food item..."). Below: grid of restaurant logos/names (clickable). On mount: call GET `/api/v1/all-items`, cache with React Query, init Fuse.js instance (keys: name weight 0.5, restaurantName 0.3, category 0.2; threshold 0.3). On input (debounced 150ms): run fuse.search, display results. Result card: item name (bold), restaurant name (muted), calories (large), protein/carbs/fat (smaller row). Click navigates to item detail.
- [ ] **Create restaurant browse page** — `src/app/(consumer)/restaurants/page.tsx`: Grid of restaurant cards (logo, name, item count). Alphabetical. Responsive: 2 cols mobile, 3 tablet, 4 desktop.
- [ ] **Create restaurant detail page** — `src/app/(consumer)/restaurants/[slug]/page.tsx`: Restaurant name, logo, description at top. Category tabs/pills for filtering. Menu item list: name, calories, protein, carbs, fat. Sort controls: calories up/down, protein down, name A-Z. Click item navigates to detail.
- [ ] **Create item detail page** — `src/app/(consumer)/items/[id]/page.tsx`: Item name heading, restaurant name (linked), category badge, serving size. Macro overview: large calorie number, visual breakdown (stacked bar or donut: protein=blue P*4cal, carbs=green C*4cal, fat=orange F\*9cal), percentages. Full nutrition table (US nutrition label style: Calories, Total Fat, Sat Fat, Trans Fat, Cholesterol, Sodium, Total Carbs, Fiber, Sugars, Protein). Source attribution with date.
- [ ] **Create filtering controls** — On restaurant detail and home page: calorie range min/max inputs, minimum protein input, restaurant multi-select checkboxes (home), sort dropdown (Calories low-high/high-low, Protein high-low, Name A-Z). All client-side against cached data. Components: `src/components/consumer/filter-controls.tsx`.
- [ ] **Add SEO metadata** — Every page with proper metadata via Next.js `generateMetadata`. Home: "FastCalorie — Fast Food Nutrition Search". Restaurant: "[Name] Nutrition Facts & Calories | FastCalorie". Item: "[Item] Calories & Macros — [Restaurant] | FastCalorie".

---

## P8: Data Seeding & QA (0/3)

- [ ] **Ingest 15 restaurants** — Process in order: (1) McDonald's, (2) Chick-fil-A, (3) Wendy's, (4) Taco Bell, (5) Subway, (6) Chipotle, (7) Burger King, (8) Popeyes, (9) Panda Express, (10) Five Guys, (11) Chili's, (12) Arby's, (13) Sonic, (14) Jack in the Box, (15) Whataburger. Each exercises the pipeline and validates AI extraction quality.
- [ ] **Per-restaurant QA** — For each restaurant verify: all menu categories present and correctly named, item count matches PDF, spot-check 5 random items (calories/protein/fat/carbs vs PDF), no items with 0 calories (except water/diet drinks), no duplicates, serving sizes present, restaurant appears on consumer browse, search finds items.
- [ ] **Cross-restaurant QA** — Search "burger" returns results from multiple restaurants. Search "chicken" likewise. Calorie range filter works across all. Sort by protein correct across all. All logos display. Home page grid shows all 15.

---

## P9: Polish, Performance & Deploy (0/7)

- [ ] **Meet performance targets** — Lighthouse Performance >= 90 on home/restaurant/item pages. LCP < 1.5s, CLS < 0.1, FID < 100ms. `/api/v1/all-items` response < 500ms. Client-side search < 50ms.
- [ ] **Implement caching strategy** — Consumer endpoints: `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` for restaurants/restaurant detail/all-items. Items: `s-maxage=600, stale-while-revalidate=1200`. Admin endpoints: `Cache-Control: no-store`.
- [ ] **Add error handling** — All API routes: top-level try/catch, consistent error shape `{error: string, details?: unknown}`. Consumer pages: friendly error states. Admin pages: detailed error messages.
- [ ] **Add loading states** — Every data-fetching page: skeleton/shimmer UI (not spinners). Search: subtle loading indicator during debounce. Ingestion review: progress steps during pipeline.
- [ ] **Create 404 and error pages** — `src/app/not-found.tsx`: custom 404 with search bar + home link. `src/app/error.tsx`: custom error page with retry button.
- [ ] **Deploy to Vercel** — Connect GitHub repo, set env vars (DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY, NEXT_PUBLIC_APP_URL). Build command: `npm run build`, output: `.next`. Create Neon/Supabase PostgreSQL instance, run migrations, seed admin. Post-deploy: verify home page, admin login, PDF ingestion, search, all restaurant/item pages, mobile layout.
- [ ] **Set up CI/CD** — GitHub Actions workflow: on push/PR, checkout, setup Node 20, `npm ci`, `npm run build`, `npm run lint`. Type checking and linting on every push.

---

## Ad Hoc Tasks

- [x] **Create CLAUDE.md** — (Ad hoc: needed to provide onboarding context for future Claude Code instances working in this repo, covering architecture, commands, and conventions)
- [x] **Create Claude Code Stop hook for TODO.md tracking** — (Ad hoc: user requested an automated hook that blocks Claude from finishing until TODO.md is updated with completed or ad-hoc tasks, ensuring the task tracker stays in sync with actual work)
