import type { CategoryKey } from "./categories";

export interface Expense {
  id: number;
  category: CategoryKey;
  amount: number;
  /** ISO date string, "YYYY-MM-DD" */
  entry_date: string;
  note: string | null;
  /** ISO timestamp */
  created_at: string;
}

export interface ExpenseInput {
  category: CategoryKey;
  amount: number;
  /** "YYYY-MM-DD"; if omitted the server uses today */
  entry_date?: string;
  note?: string | null;
}
