"use client";

// One hook that loads expenses + cash transactions + settings together and
// exposes the computed running balance plus all mutators. Used by every page
// that needs the balance or cash data, so the balance is always consistent.

import { useCallback, useEffect, useState } from "react";
import type {
  Expense,
  ExpenseInput,
  CashTransaction,
  CashInput,
  Settings,
} from "./types";
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  fetchCash,
  createCash,
  deleteCash,
  fetchSettings,
  updateSettings,
  resetAllData,
} from "./client";
import { computeBalance } from "./balance";

export function sortByDateDesc<T extends { entry_date: string; created_at: string }>(
  a: T,
  b: T
): number {
  if (a.entry_date !== b.entry_date) return a.entry_date < b.entry_date ? 1 : -1;
  return b.created_at < a.created_at ? -1 : 1;
}

export function useLedger() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cash, setCash] = useState<CashTransaction[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const [e, c, s] = await Promise.all([
        fetchExpenses(),
        fetchCash(),
        fetchSettings(),
      ]);
      setExpenses(e);
      setCash(c);
      setSettings(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // ── expense mutators ──
  const addExpense = useCallback(async (input: ExpenseInput) => {
    const created = await createExpense(input);
    setExpenses((p) => [created, ...p].sort(sortByDateDesc));
    return created;
  }, []);

  const editExpense = useCallback(
    async (id: number, input: Partial<ExpenseInput>) => {
      const updated = await updateExpense(id, input);
      setExpenses((p) => p.map((e) => (e.id === id ? updated : e)).sort(sortByDateDesc));
      return updated;
    },
    []
  );

  const removeExpense = useCallback(async (id: number) => {
    await deleteExpense(id);
    setExpenses((p) => p.filter((e) => e.id !== id));
  }, []);

  // ── cash mutators ──
  const addCash = useCallback(async (input: CashInput) => {
    const created = await createCash(input);
    setCash((p) => [created, ...p].sort(sortByDateDesc));
    return created;
  }, []);

  const removeCash = useCallback(async (id: number) => {
    await deleteCash(id);
    setCash((p) => p.filter((c) => c.id !== id));
  }, []);

  // ── settings ──
  const saveSettings = useCallback(async (input: Partial<Settings>) => {
    const s = await updateSettings(input);
    setSettings(s);
    return s;
  }, []);

  // ── destructive reset (keeps settings) ──
  const reset = useCallback(async () => {
    await resetAllData();
    setExpenses([]);
    setCash([]);
  }, []);

  const openingBalance = settings?.opening_balance ?? 0;
  const balance = computeBalance(openingBalance, cash, expenses);

  return {
    expenses,
    cash,
    settings,
    balance,
    loading,
    error,
    reload,
    addExpense,
    editExpense,
    removeExpense,
    addCash,
    removeCash,
    saveSettings,
    reset,
  };
}
