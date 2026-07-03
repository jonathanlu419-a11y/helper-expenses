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
