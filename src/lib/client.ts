// Browser-side helpers for talking to the API routes.

import type {
  Expense,
  ExpenseInput,
  CashTransaction,
  CashInput,
  Settings,
} from "./types";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function fetchExpenses(): Promise<Expense[]> {
  return handle<Expense[]>(await fetch("/api/expenses", { cache: "no-store" }));
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  return handle<Expense>(
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function updateExpense(
  id: number,
  input: Partial<ExpenseInput>
): Promise<Expense> {
  return handle<Expense>(
    await fetch(`/api/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function deleteExpense(id: number): Promise<void> {
  await handle<{ ok: true }>(
    await fetch(`/api/expenses/${id}`, { method: "DELETE" })
  );
}

// ── Cash transactions ─────────────────────────────────────────
export async function fetchCash(): Promise<CashTransaction[]> {
  return handle<CashTransaction[]>(await fetch("/api/cash", { cache: "no-store" }));
}

export async function createCash(input: CashInput): Promise<CashTransaction> {
  return handle<CashTransaction>(
    await fetch("/api/cash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function deleteCash(id: number): Promise<void> {
  await handle<{ ok: true }>(await fetch(`/api/cash/${id}`, { method: "DELETE" }));
}

// ── Settings ──────────────────────────────────────────────────
export async function fetchSettings(): Promise<Settings> {
  return handle<Settings>(await fetch("/api/settings", { cache: "no-store" }));
}

export async function updateSettings(input: Partial<Settings>): Promise<Settings> {
  return handle<Settings>(
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

// ── Destructive reset ─────────────────────────────────────────
export async function resetAllData(): Promise<void> {
  await handle<{ ok: true }>(await fetch("/api/reset", { method: "POST" }));
}
