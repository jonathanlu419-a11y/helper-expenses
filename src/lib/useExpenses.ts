"use client";

// Shared client-side expense store used by both /worker and /mum, so the two
// pages stay in sync with the same optimistic add/edit/delete logic.

import { useCallback, useEffect, useState } from "react";
import type { Expense, ExpenseInput } from "./types";
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "./client";

export function sortByDateDesc(a: Expense, b: Expense): number {
  if (a.entry_date !== b.entry_date) {
    return a.entry_date < b.entry_date ? 1 : -1;
  }
  return b.created_at < a.created_at ? -1 : 1;
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setExpenses(await fetchExpenses());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(async (input: ExpenseInput) => {
    const created = await createExpense(input);
    setExpenses((prev) => [created, ...prev].sort(sortByDateDesc));
    return created;
  }, []);

  const edit = useCallback(
    async (id: number, input: Partial<ExpenseInput>) => {
      const updated = await updateExpense(id, input);
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? updated : e)).sort(sortByDateDesc)
      );
      return updated;
    },
    []
  );

  const remove = useCallback(async (id: number) => {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { expenses, loading, error, reload, add, edit, remove };
}
