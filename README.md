# Helper Expenses

A tiny two-page household spending tracker.

- **`/worker`** — Bahasa Indonesia quick-entry screen for the domestic helper. A floating **+** button opens a 2-step sheet (pick category → enter amount), and every entry is listed in a table that can be edited or deleted.
- **`/mum`** — English dashboard for the employer. Toggle **Weekly / Monthly**, step through periods, and see per-category totals (with bars), a grand total, and the raw entries.

Built with **Next.js (App Router) + TypeScript + Tailwind + Postgres** (Neon serverless driver, `@neondatabase/serverless`).

---

## Categories (fixed, 7)

| Internal key | Indonesian (worker) | English (Mum) | Emoji |
|---|---|---|---|
| `household_cleaning` | Kebutuhan Rumah Tangga | Household & Cleaning Supplies | 🧹 |
| `vegetables` | Sayuran | Vegetables | 🥬 |
| `fruits` | Buah-buahan | Fruits | 🍎 |
| `meat` | Daging | Meat | 🥩 |
| `rice_noodles` | Beras & Mie | Rice & Noodles | 🍚 |
| `other_food` | Bahan Makanan Lain | Other Food Items | 🧂 |
| `transport` | Transportasi | Transportation | 🚗 |

Amounts display with a plain `$` prefix and 2 decimals.

---

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Postgres database** (new, standalone — e.g. a fresh Vercel Postgres / Neon store). Copy its **pooled** connection string.

3. **Configure env**

   ```bash
   cp .env.example .env.local
   ```

   Then set `POSTGRES_URL` in `.env.local` to your connection string (must end with `?sslmode=require`).

4. **Apply the schema**

   ```bash
   npm run db:setup
   ```

   This runs [`db/schema.sql`](db/schema.sql) against `POSTGRES_URL`.

5. **Run**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 → links to `/worker` and `/mum`.

---

## Environment variables

Only one is required:

| Variable | Required | Notes |
|---|---|---|
| `POSTGRES_URL` | ✅ | Pooled Postgres connection string. The app reads this (or `DATABASE_URL` as a fallback). |

`POSTGRES_URL_NON_POOLING` / `POSTGRES_PRISMA_URL` are also injected by Vercel Postgres but are **not** used by this app.

---

## Deploy to Vercel

1. Push this repo to a **new** GitHub repository.
2. In Vercel, **Add New → Project** and import that repo (a brand-new Vercel project — unrelated to any existing project).
3. Under **Storage**, create/attach a **new** Postgres store. Vercel injects `POSTGRES_URL` (and friends) into the project automatically — no manual env entry needed.
4. Deploy.
5. **Apply the schema once** against the production database. Easiest options:
   - Pull the env locally and run the setup script:
     ```bash
     vercel env pull .env.local
     npm run db:setup
     ```
   - …or paste the contents of [`db/schema.sql`](db/schema.sql) into your provider's SQL console.

The table is created with `IF NOT EXISTS`, so re-running the setup is safe.

---

## Data model

Single `expenses` table — see [`db/schema.sql`](db/schema.sql):

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGSERIAL` PK | |
| `category` | `TEXT` | one of the 7 keys (CHECK-constrained) |
| `amount` | `NUMERIC(12,2)` | `>= 0` |
| `entry_date` | `DATE` | defaults to `CURRENT_DATE` |
| `note` | `TEXT` | nullable, not surfaced in the MVP UI |
| `created_at` | `TIMESTAMPTZ` | auto |

## API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/expenses` | List all entries, newest first |
| `POST` | `/api/expenses` | Create `{ category, amount, entry_date?, note? }` |
| `PATCH` | `/api/expenses/:id` | Update any subset of fields |
| `DELETE` | `/api/expenses/:id` | Delete one entry |

---

## Notes / decisions

- **Week = Monday–Sunday** (ISO week) for the Weekly view. Monthly = calendar month.
- **No auth** — both routes are public (MVP). If you later want to deter random URL hits, add a lightweight PIN gate.
- **No currency logic** — amounts are plain numbers shown with a `$` prefix.
- The `note` field exists in the schema/API but is intentionally not shown in the UI for the MVP.
