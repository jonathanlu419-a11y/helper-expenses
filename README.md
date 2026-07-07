# Helper Expenses

A full-stack household expense tracker with two purpose-built UIs (a localized quick-entry screen and an analytics dashboard) sharing one data model, built to explore a handful of deceptively tricky problems: timezone-correct date bucketing, a cash-float accounting model, AI-assisted data entry, and admin-configurable domain data replacing what started as hardcoded enums.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Postgres (Neon serverless, plain `pg` driver, parameterized SQL — no ORM) · Google Gemini (`gemini-2.5-flash`) for vision extraction and translation, called via a small raw-`fetch` wrapper rather than an SDK.

---

## What it does

Two views over one `expenses` table (plus a cash ledger and admin-managed categories):

- **A localized quick-entry screen** — a 2-step "pick category → enter amount" flow behind a floating action button, entirely in Bahasa Indonesia, designed for fast one-handed entry with minimal friction. Includes a camera capture mode: photograph a receipt or a price tag and a vision model prefills the category and amount for review before saving.
- **An analytics dashboard** — an English view over the same data: weekly/monthly period toggling, per-category totals with bars, a running cash-float balance, a month calendar with a roll-up view, and full CRUD over entries and categories.

The two views intentionally have zero cross-links — each surfaces only what its audience needs — which is a small but real UX-architecture decision, not an oversight (see [Notes / decisions](#notes--decisions)).

---

## Interesting problems solved

### 1. Timezone-correct date bucketing
The app runs on Vercel (UTC server clock) but every date boundary — "today," week/month ranges, the calendar grid — needs to reflect the household's *local* calendar day, not UTC. A naive `new Date()` at 11pm local time can silently roll over to UTC-tomorrow and file an entry into the wrong day, week, or month.

The fix, in [`src/lib/time.ts`](src/lib/time.ts): derive *only* today's local calendar date via `date-fns-tz`, then do all subsequent arithmetic on a **noon-anchored** plain `Date` — noon avoids any DST-adjacent midnight edge cases — so period math (`getPeriodRange`, `getMonthGrid`) is pure, deterministic, and never timezone-sensitive again after that first conversion.

### 2. A cash-float accounting model
The tracker isn't just a spending log — it models a running cash float held by one party on another's behalf:

```
balance = opening_balance
        + Σ(cash given)
        − Σ(cash collected)
        − Σ(expenses)
```

implemented once in [`src/lib/balance.ts`](src/lib/balance.ts) and never re-derived client-side — every surface (entry list, dashboard, calendar) reads through the same function. The schema encodes the same invariant as a comment in [`db/schema.sql`](db/schema.sql) so the business rule is documented at both the code and data layer.

### 3. Admin-configurable categories (migrating off a hardcoded enum)
Categories started as a fixed, `CHECK`-constrained enum on the `expenses.category` column. As the tracker's real-world domain grew (categories needed renaming, reordering, and grouping without a code deploy), that was migrated to two DB-backed tables — `categories` and `big_categories` — with:

- soft-delete for categories that already have entries (so history stays intact) vs. hard-delete for unused ones,
- a non-deletable fallback "big category" that in-use categories reassign to when their group is removed,
- a migration that moved the original enum values into rows **preserving their keys**, so existing `expenses` rows were never orphaned.

Every UI surface reads categories from `GET /api/categories` — there's no compiled-in category list left anywhere in the frontend.

### 4. AI-assisted data entry, with a hard requirement to never guess
Two Gemini integrations ([`src/lib/gemini.ts`](src/lib/gemini.ts)), both designed around "the model must never silently fabricate a number that gets saved":

- **Vision extraction** (`/api/vision`): a receipt or price-tag photo → `{amount, category, confidence_note}` JSON. The prompt explicitly instructs the model to return `null` for amount rather than guess when a price is a unit price, blurry, or ambiguous — the UI then prefills what it *can* read and leaves the rest for manual entry. Nothing is ever auto-submitted.
- **Category-label translation** (`/api/translate`): suggests a natural (not literal/dictionary) Bahasa Indonesia label for an English category name, which an admin reviews and edits before saving.

Both routes fail closed: a missing API key, a network error, or a malformed response returns a safe blank/`unavailable` result rather than blocking the write path — the AI call is always an enhancement, never a dependency.

One real bug worth noting: `gemini-2.5-flash` has "thinking" on by default, and thinking tokens count against `maxOutputTokens` — for short structured-output tasks this was silently eating the entire budget and truncating real answers (e.g. "Health & Medicine" coming back as just `"K"`). Fixed by disabling `thinkingConfig.thinkingBudget` for these deterministic, low-latency tasks.

---

## Architecture notes

- **No ORM** — direct parameterized `pg` queries. At this scale (a handful of tables, no complex joins beyond the category FK) an ORM would add indirection without buying much; the schema itself ([`db/schema.sql`](db/schema.sql)) is the single source of truth, applied via an idempotent `db:setup` script.
- **One data-fetching hook** (`useLedger`) is the single source for expenses, cash transactions, categories, and settings — every page derives its view (period filters, calendar roll-ups, balance) from that one client-side cache rather than each component fetching independently.
- **Server routes never trust client-supplied enums** — category keys are validated against the live DB list on write, not against a compiled constant, so the check can't drift from what's actually configurable.
- **Deliberate UI segmentation** — the two front-of-house views share components (`ExpenseSheet`, `DayGroupedEntries`) parameterized by a `lang` prop rather than being fully separate implementations, while the navigation between them is intentionally *not* cross-linked.

---

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL (and optionally GEMINI_API_KEY)
npm run db:setup             # applies db/schema.sql
npm run dev
```

Optional sample data: `npm run seed` populates a few weeks of synthetic expenses/cash movements across all categories so the dashboard and calendar aren't empty on first run.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string (developed against Neon's pooled endpoint). |
| `GEMINI_API_KEY` | ⬜ optional | Enables the camera quick-add (vision) and category-label auto-translation. Both features degrade gracefully — hidden/blank, not broken — if unset. Get a key at [Google AI Studio](https://aistudio.google.com/apikey). |

---

## Notes / decisions

- **Timezone anchor is configurable in one place** (`APP_TZ` in [`src/lib/time.ts`](src/lib/time.ts)) — the deployed instance targets a specific timezone for its household, but nothing else in the codebase hardcodes that assumption.
- **Localization is structural, not just string-swapping** — the quick-entry screen's copy, date formatting (explicit day/month name arrays rather than relying on runtime `Intl` locale data), and even the browser tab title are all localized independently per view.
- **No auth** — this is a demo/portfolio deployment scope; a real multi-tenant version would need it before going further.
- Photos taken for the vision feature are processed in-memory for extraction only — never persisted to disk, database, or blob storage.
