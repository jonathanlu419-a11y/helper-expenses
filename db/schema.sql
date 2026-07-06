-- Helper Expenses — database schema
--
-- Three tables:
--   expenses           — the helper's spending, out of the cash float
--   cash_transactions  — cash Mum gives to / collects from the helper
--   settings           — single global config row (opening balance, start date)
--
-- Balance direction (implemented in code, kept here for reference):
--   balance = opening_balance
--           + SUM(cash where type='given')
--           - SUM(cash where type='collected')
--           - SUM(expenses)
-- Positive balance => the helper is holding Mum's money.

CREATE TABLE IF NOT EXISTS expenses (
  id          BIGSERIAL PRIMARY KEY,
  category    TEXT        NOT NULL CHECK (category IN (
                'household_cleaning',
                'vegetables',
                'fruits',
                'meat',
                'rice_noodles',
                'other_food',
                'transport'
              )),
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  entry_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_entry_date ON expenses (entry_date DESC, created_at DESC);

-- Cash float movements between Mum and the helper.
CREATE TABLE IF NOT EXISTS cash_transactions (
  id          BIGSERIAL PRIMARY KEY,
  type        TEXT        NOT NULL CHECK (type IN ('given', 'collected')),
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  entry_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_entry_date ON cash_transactions (entry_date DESC, created_at DESC);

-- Single-row global settings (id is pinned to 1).
CREATE TABLE IF NOT EXISTS settings (
  id                  INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  opening_balance     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  first_activity_date DATE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure the single settings row exists.
INSERT INTO settings (id, opening_balance, first_activity_date)
VALUES (1, 0, NULL)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Dynamic categories (Mum-managed). Replaces the old hardcoded 7
-- categories + 3 big-category groupings.
-- ─────────────────────────────────────────────────────────────

-- Big categories used for the calendar roll-up. `other` is a permanent,
-- non-deletable fallback used when reassigning categories away from a deleted
-- big category.
CREATE TABLE IF NOT EXISTS big_categories (
  key         TEXT PRIMARY KEY,
  label_en    TEXT NOT NULL,
  label_id    TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  is_fallback BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO big_categories (key, label_en, label_id, sort_order, is_fallback) VALUES
  ('food',      'Food',      'Makanan',      0, false),
  ('transport', 'Transport', 'Transportasi', 1, false),
  ('household', 'Household', 'Rumah Tangga', 2, false),
  ('other',     'Other',     'Lainnya',      99, true)
ON CONFLICT (key) DO NOTHING;

-- Regular categories. Every category rolls up into exactly one big category
-- (FK, not nullable). is_active is a soft-delete so historical entries still
-- display after a category is removed from the Quick Add grid.
CREATE TABLE IF NOT EXISTS categories (
  key          TEXT PRIMARY KEY,
  emoji        TEXT NOT NULL DEFAULT '🧾',
  label_id     TEXT NOT NULL DEFAULT '',
  label_en     TEXT NOT NULL,
  big_category TEXT NOT NULL REFERENCES big_categories(key),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrate the original 7 hardcoded categories, preserving keys so existing
-- expense rows (which reference category by key) are never orphaned.
INSERT INTO categories (key, emoji, label_id, label_en, big_category, sort_order) VALUES
  ('household_cleaning', '🧹', 'Kebutuhan Rumah Tangga', 'Household & Cleaning Supplies', 'household', 0),
  ('vegetables',         '🥬', 'Sayuran',                'Vegetables',                   'food',      1),
  ('fruits',             '🍎', 'Buah-buahan',            'Fruits',                       'food',      2),
  ('meat',               '🥩', 'Daging',                 'Meat',                         'food',      3),
  ('rice_noodles',       '🍚', 'Beras & Mie',            'Rice & Noodles',               'food',      4),
  ('other_food',         '🧂', 'Bahan Makanan Lain',     'Other Food Items',             'food',      5),
  ('transport',          '🚗', 'Transportasi',           'Transportation',               'transport', 6)
ON CONFLICT (key) DO NOTHING;

-- Categories are dynamic now, so drop the old fixed CHECK on expenses.category.
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
