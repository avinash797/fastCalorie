# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FastCalorie is a fast food nutrition aggregation platform. Admin users upload restaurant nutrition PDFs, AI extracts structured data, admins review/approve it, and consumers search/browse the published nutrition info. The project is a single Next.js 15 monolith (App Router) with admin and consumer route groups.

**Authoritative spec:** `FastCalorie_MVP_Development_Plan.md` contains all detailed requirements, schemas, API contracts, and validation rules. Always consult it for specifics.

**Task tracker:** `TODO.md` tracks implementation progress across 13 priority phases (P0–P12).

## Build & Development Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
tsc --noEmit         # Type check

# Database (Drizzle ORM)
npx drizzle-kit generate   # Generate migrations from schema changes
npx drizzle-kit migrate    # Apply migrations
npx drizzle-kit studio     # Visual DB browser

# Seed first admin user
npx tsx scripts/seed-admin.ts
```

## Tech Stack

- **Framework:** Next.js 15 (App Router), React, TypeScript (strict mode)
- **Database:** PostgreSQL 16 via Drizzle ORM
- **Auth:** Custom JWT (bcrypt + jsonwebtoken), 24h expiry, httpOnly cookies
- **AI:** Anthropic Claude (claude-sonnet-4-20250514) for PDF nutrition extraction
- **PDF:** Claude Vision API (direct PDF-to-LLM, supports text and scanned PDFs)
- **Validation:** Zod (shared client/server schemas)
- **UI:** Tailwind CSS 4 + shadcn/ui
- **Search:** Fuse.js client-side fuzzy search against cached all-items endpoint
- **State:** TanStack Query (React Query) 5
- **Deployment:** Vercel + Neon/Supabase PostgreSQL

## Architecture

### Route Structure
- `src/app/(consumer)/` — Public pages (home/search, restaurant browse, item detail, blog)
- `src/app/(marketing)/` — Marketing landing page (planned P10)
- `src/app/(admin)/admin/` — Protected admin pages (login, dashboard, restaurants, ingestion, items, audit log, users, blog management)
- `src/app/api/admin/` — Admin API endpoints (JWT-protected via `withAuth`)
- `src/app/api/v1/` — Public consumer API (read-only, cached)

### Key Modules
- `src/lib/db/schema.ts` — Drizzle schema (5 tables: admins, restaurants, menuItems, ingestionJobs, auditLogs)
- `src/lib/db/audit.ts` — `logAudit()` helper; every admin mutation must be audit-logged
- `src/lib/auth/` — JWT sign/verify, bcrypt hashing, `withAuth` middleware wrapper
- `src/lib/ingestion/` — PDF pipeline: extract.ts → ai-agent.ts → validation.ts, orchestrated by pipeline.ts
- `src/lib/validators/` — Zod schemas for restaurant and menuItem
- `src/middleware.ts` — Next.js middleware protecting `/admin/*` routes (UX-level; real auth is `withAuth`)

### PDF Ingestion Pipeline
Upload → create job (status: pending) → async fire-and-forget: send PDF to Claude Vision API → AI extracts structured nutrition data → 9-point validation → status: review → admin reviews/edits inline → approve → create menu_items records. Frontend polls job status every 2s during processing.

**Page-by-page processing (P12):** For large PDFs, the pipeline splits the document into individual pages, processes each page in parallel (concurrency limit 5), then merges and deduplicates results. This keeps context windows small and improves reliability.

### Consumer Search Flow
Home page fetches `/api/v1/all-items` (all items, cached 5 min) → initializes Fuse.js → debounced 150ms client-side search (<50ms target).

## Key Conventions

- **Path alias:** `@/*` maps to `./src/*`
- **Soft deletes only:** Restaurants → `status: "archived"`, items → `isAvailable: false`. Never hard-delete.
- **Audit logging:** Every admin mutation calls `logAudit()` with beforeData/afterData
- **API error shape:** `{ error: string, details?: unknown }`
- **Consumer caching:** `s-maxage=300, stale-while-revalidate=600` (restaurants/all-items), `s-maxage=600` (item detail)
- **Admin caching:** `Cache-Control: no-store`
- **File storage (MVP):** Local filesystem at `public/uploads/{logos,pdfs}/`
- **Design:** Consumer = minimal, white bg, orange accent `#E85D26`. Admin = clean internal tool style. Loading states use skeletons, not spinners.

## Validation Engine (9 Checks on Extracted Items)

1. required_fields (Error) — name, calories, proteinG, totalCarbsG, totalFatG non-null
2. calorie_range (Error) — 1–5000
3. macro_math (Warning) — `|(P*4+C*4+F*9)-cal|/cal ≤ 0.20`
4. duplicate_name (Warning) — no identical names in batch
5. serving_size_present (Warning)
6. category_assigned (Error)
7. negative_values (Error) — all nutritional values ≥ 0
8. sodium_range (Warning) — ≤ 10000mg
9. confidence_check (Warning) — AI confidence ≠ "low"

Item status = worst severity among its checks.

## Git Workflow Rules

These rules are **mandatory** — follow them exactly.

### Branch Strategy
- `main` = **production**. Only receives merges from `development`.
- `development` = **integration**. Priority branches merge here when complete.
- Each priority phase (P0–P9) **must** be developed on its own branch.
- Branch naming: `p<N>/<short-kebab-description>` (e.g., `p1/database-schema`, `p2/auth-system`, `p3/admin-api`).
- When starting a new priority, create the branch from `development`: `git checkout -b p<N>/<description> development`.
- When a priority is fully complete and verified, merge the branch into `development` and push.
- Never commit priority work directly to `development` or `main`.

### Commit Strategy
- Each **task** (checkbox item) within a priority **must** be its own commit.
- Commit message format: `P<N>: <imperative summary of what was done>` (e.g., `P1: Create Drizzle config and database client`).
- If multiple closely-related tasks must be combined into one commit, list each task in the commit body with a blank line after the subject:
  ```
  P1: Configure Drizzle and create database client

  - Created drizzle.config.ts with schema path and PostgreSQL dialect
  - Created src/lib/db/index.ts with drizzle client export
  ```
- Every commit must leave the project in a buildable state (`npm run build` should pass).
- Do not bundle unrelated changes into one commit.

### Merge & Cleanup
- After merging a priority branch to `development`, push `development` to origin.
- PRs from `development` → `main` are done for production releases.
- Do not delete remote branches (keep them for history).

## Environment Variables

```
DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY, NEXT_PUBLIC_APP_URL
SEED_ADMIN_EMAIL, SEED_ADMIN_NAME, SEED_ADMIN_PASSWORD
```
