"use client";

// One hook that loads expenses + cash + settings + categories together and
// exposes the computed balance, lookup maps, and all mutators. Every page reads
// categories from here (which come from the DB), so Mum's edits show up
// everywhere immediately.

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Expense,
  ExpenseInput,
  CashTransaction,
  CashInput,
  Settings,
} from "./types";
import type { Category, BigCategory } from "./categories";
import { buildCategoryMap, buildBigMap } from "./categories";
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
  fetchCategories,
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [bigCategories, setBigCategories] = useState<BigCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadCategories = useCallback(async () => {
    const { categories: cats, bigCategories: bigs } = await fetchCategories();
    setCategories(cats);
    setBigCategories(bigs);
  }, []);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const [e, c, s, cat] = await Promise.all([
        fetchExpenses(),
        fetchCash(),
        fetchSettings(),
        fetchCategories(),
      ]);
      setExpenses(e);
      setCash(c);
      setSettings(s);
      setCategories(cat.categories);
      setBigCategories(cat.bigCategories);
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

  const editExpense = useCallback(async (id: number, input: Partial<ExpenseInput>) => {
    const updated = await updateExpense(id, input);
    setExpenses((p) => p.map((e) => (e.id === id ? updated : e)).sort(sortByDateDesc));
    return updated;
  }, []);

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

  // ── settings + reset ──
  const saveSettings = useCallback(async (input: Partial<Settings>) => {
    const s = await updateSettings(input);
    setSettings(s);
    return s;
  }, []);

  const reset = useCallback(async () => {
    await resetAllData();
    setExpenses([]);
    setCash([]);
  }, []);

  const openingBalance = settings?.opening_balance ?? 0;
  const balance = computeBalance(openingBalance, cash, expenses);

  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories]);
  const bigMap = useMemo(() => buildBigMap(bigCategories), [bigCategories]);
  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  return {
    expenses,
    cash,
    settings,
    categories,
    bigCategories,
    categoryMap,
    bigMap,
    activeCategories,
    balance,
    loading,
    error,
    reload,
    reloadCategories,
    addExpense,
    editExpense,
    removeExpense,
    addCash,
    removeCash,
    saveSettings,
    reset,
  };
}
