# Helper Expenses

A tiny two-page household spending tracker.

- **`/worker`** — Bahasa Indonesia quick-entry screen for the domestic helper. A floating **+** button opens a 2-step sheet (pick category → enter amount), and every entry is listed in a table that can be edited or deleted.
- **`/mum`** — English dashboard for the employer. Toggle **Weekly / Monthly**, step through periods, and see per-category totals (with bars), a grand total, and the entries. Mum can also add (its own English **+** button), edit, and delete entries.
- **`/mum/calendar`** — month-view calendar (linked from the dashboard sub-nav). Each day cell shows that day's totals rolled up into **3 big categories** — Food / Transport / Household — with prev/next month navigation and a tap-to-expand day detail. The roll-up is view-only; the underlying 7-category data is unchanged.

Both pages read from and manage the **same** `expenses` table via the same API.

Built with **Next.js (App Router) + TypeScript + Tailwind + Postgres** (standard `pg` driver, Render Postgres).

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

2. **Create a new Postgres instance on [Render](https://render.com)** (New → Postgres). Once it's live, copy its **External Database URL** (Render dashboard → your Postgres instance → *Connections* → *External Database URL*).

3. **Configure env**

   ```bash
   cp .env.example .env.local
   ```

   Paste the External Database URL into `.env.local` as `DATABASE_URL`. SSL is handled automatically for Render hosts — no extra parameters needed.

4. **Apply the schema**

   ```bash
   npm run db:setup
   ```

   This runs [`db/schema.sql`](db/schema.sql) against `DATABASE_URL`.

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
| `DATABASE_URL` | ✅ | Render Postgres **External Database URL**. Used by the app (`pg`) and by `npm run db:setup`. |

---

## Deploy to Vercel

1. Push this repo to a **new** GitHub repository.
2. In Vercel, **Add New → Project** and import that repo (a brand-new Vercel project — unrelated to any existing project).
3. In the project's **Settings → Environment Variables**, add `DATABASE_URL` = your Render **External Database URL** (the external URL is required so Vercel's servers can reach Render). Add it to Production (and Preview/Development if you want).
4. Deploy.
5. **Apply the schema once** against the Render database — run it locally against the same URL:
   ```bash
   # with DATABASE_URL set in .env.local (the Render External URL)
   npm run db:setup
   ```
   …or paste the contents of [`db/schema.sql`](db/schema.sql) into Render's PSQL/SQL console.

The table is created with `IF NOT EXISTS`, so re-running the setup is safe.

---

## Data model

Single `expenses` table — see [`db/schema.sql`](db/schema.sql):

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGSERIAL` PK | |
| `category` | `TEXT` | one of the 7 keys (CHECK-constrained) |
| `amount` | `NUMERIC(12,2)` | `>= 0` |
| `entry_date` | `DATE` | defaults to `CURRENT_DATE`; the app sends Hong Kong "today" |
| `note` | `TEXT` | nullable, not surfaced in the entry UI (shown if present) |
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

- **Timezone: everything is anchored to `Asia/Hong_Kong`.** "Today" (the entry-date default), the Weekly/Monthly period boundaries, and the calendar month grid are computed from Hong Kong local time via `date-fns-tz` (see [`src/lib/time.ts`](src/lib/time.ts)), **not** the server's UTC clock — so a late-night entry lands in the right day/week/month.
- **Week = Monday–Sunday.** Monthly = calendar month.
- **No auth** — both routes are public (MVP). If you later want to deter random URL hits, add a lightweight PIN gate.
- **No currency logic** — amounts are plain numbers shown with a `$` prefix.
- The `note` field exists in the schema/API but has no input in the entry UI for the MVP; if a note is present it's shown under the category.
