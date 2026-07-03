// Standard node-postgres (pg) connection pool.
//
// Connects via DATABASE_URL (Render Postgres external URL). The pool is
// created lazily and cached in module scope so warm serverless invocations
// reuse it; importing this module during `next build` never opens a socket.

import { Pool, type QueryResult, type QueryResultRow } from "pg";
import type { Expense, CashTransaction, CashType, Settings } from "./types";
import type { CategoryKey } from "./categories";

let pool: Pool | null = null;

function sslConfig(connectionString: string): false | { rejectUnauthorized: boolean } {
  // Local databases don't use SSL; managed hosts like Render require it.
  if (/sslmode=disable/.test(connectionString)) return false;
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)) return false;
  return { rejectUnauthorized: false };
}

export function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — cannot reach the database.");
  }
  pool = new Pool({
    connectionString,
    ssl: sslConfig(connectionString),
    max: 3,
    connectionTimeoutMillis: 10_000,
  });
  return pool;
}

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as never[]);
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

export function mapExpenseRow(row: QueryResultRow): Expense {
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

export const CASH_COLUMNS = `
  id,
  type,
  amount,
  to_char(entry_date, 'YYYY-MM-DD') AS entry_date,
  note,
  created_at
`;

export function mapCashRow(row: QueryResultRow): CashTransaction {
  const created = row.created_at;
  return {
    id: Number(row.id),
    type: row.type as CashType,
    amount: Number(row.amount),
    entry_date: String(row.entry_date),
    note: (row.note as string | null) ?? null,
    created_at:
      created instanceof Date ? created.toISOString() : String(created),
  };
}

export function mapSettingsRow(row: QueryResultRow): Settings {
  return {
    opening_balance: Number(row.opening_balance),
    first_activity_date: row.first_activity_date
      ? String(row.first_activity_date)
      : null,
  };
}
