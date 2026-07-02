// Neon serverless Postgres client (the successor to @vercel/postgres).
//
// The client is created lazily so that importing this module during
// `next build` never touches the connection string — queries only run at
// request time in the API routes.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { Expense } from "./types";
import type { CategoryKey } from "./categories";

let client: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (client) return client;
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "POSTGRES_URL (or DATABASE_URL) is not set — cannot reach the database."
    );
  }
  client = neon(connectionString);
  return client;
}

/** Columns to select so amount/date come back in a predictable shape. */
export const EXPENSE_COLUMNS = `
  id,
  category,
  amount,
  to_char(entry_date, 'YYYY-MM-DD') AS entry_date,
  note,
  created_at
`;

export function mapExpenseRow(row: Record<string, unknown>): Expense {
  const created = row.created_at;
  return {
    id: Number(row.id),
    category: row.category as CategoryKey,
    amount: Number(row.amount),
    entry_date: String(row.entry_date),
    note: (row.note as string | null) ?? null,
    created_at:
      created instanceof Date ? created.toISOString() : String(created),
  };
}
