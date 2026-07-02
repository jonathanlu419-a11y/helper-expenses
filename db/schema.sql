-- Helper Expenses — database schema
-- Single table: expenses
--
-- Categories are stored as their internal English key. The 7 allowed
-- keys are enforced with a CHECK constraint so bad data can't sneak in.

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

-- Most reads sort by entry_date descending.
CREATE INDEX IF NOT EXISTS idx_expenses_entry_date ON expenses (entry_date DESC, created_at DESC);
