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
  /** "YYYY-MM-DD"; if omitted the server uses today (HK) */
  entry_date?: string;
  note?: string | null;
}

export type CashType = "given" | "collected";

export interface CashTransaction {
  id: number;
  /** 'given' = Mum → helper, 'collected' = helper → Mum */
  type: CashType;
  amount: number;
  /** ISO date string, "YYYY-MM-DD" */
  entry_date: string;
  note: string | null;
  created_at: string;
}

export interface CashInput {
  type: CashType;
  amount: number;
  entry_date?: string;
  note?: string | null;
}

export interface Settings {
  opening_balance: number;
  /** "YYYY-MM-DD" or null */
  first_activity_date: string | null;
}
