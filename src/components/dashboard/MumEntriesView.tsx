"use client";

import { useState } from "react";
import type { Expense, ExpenseInput, CashInput, CashTransaction } from "@/lib/types";
import { useLedger } from "@/lib/useLedger";
import ExpenseSheet from "@/components/ExpenseSheet";
import QuickAddSheet from "@/components/QuickAddSheet";
import Toast, { type ToastState } from "@/components/Toast";
import DayGroupedEntries from "@/components/DayGroupedEntries";
import MumTabs from "@/components/MumTabs";

// Shared Entries dashboard, mounted at both /mum (public) and /admin
// (password-gated) — see MumTabs for the basePath convention.
export default function MumEntriesView({ basePath }: { basePath: string }) {
  const {
    expenses,
    cash,
    settings,
    categories,
    categoryMap,
    loading,
    error,
    reload,
    addExpense,
    editExpense,
    removeExpense,
    addCash,
    removeCash,
  } = useLedger();
  const [quickAdd, setQuickAdd] = useState(false);
  const [edit, setEdit] = useState<Expense | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  async function handleAddExpense(input: ExpenseInput) {
    await addExpense(input);
    setToast({ message: "Saved.", kind: "success" });
    setQuickAdd(false);
  }
  async function handleAddCash(input: CashInput) {
    await addCash(input);
    setToast({ message: "Cash logged.", kind: "success" });
    setQuickAdd(false);
  }
  async function handleEditSubmit(input: ExpenseInput) {
    if (!edit) return;
    await editExpense(edit.id, input);
    setToast({ message: "Changes saved.", kind: "success" });
    setEdit(null);
  }
  async function handleDeleteExpense(exp: Expense) {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await removeExpense(exp.id);
      setToast({ message: "Deleted.", kind: "success" });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to delete.", kind: "error" });
    }
  }
  async function handleDeleteCash(c: CashTransaction) {
    if (!window.confirm("Delete this cash transaction?")) return;
    try {
      await removeCash(c.id);
      setToast({ message: "Deleted.", kind: "success" });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : "Failed to delete.", kind: "error" });
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-28">
      <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-gray-100 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <h1 className="text-xl font-bold">All Activity</h1>
        <MumTabs active="entries" basePath={basePath} />
      </header>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
      ) : error ? (
        <div className="py-16 text-center">
          <p className="text-sm text-red-600">Failed to load data.</p>
          <button
            onClick={reload}
            className="mt-3 rounded-full bg-gray-800 px-4 py-2 text-sm text-white"
          >
            Retry
          </button>
        </div>
      ) : expenses.length === 0 && cash.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl">🧾</div>
          <p className="mt-3 text-sm text-gray-500">
            No activity yet. Tap <span className="font-bold text-green-600">+</span> to add.
          </p>
        </div>
      ) : (
        <DayGroupedEntries
          expenses={expenses}
          cash={cash}
          openingBalance={settings?.opening_balance ?? 0}
          lang="en"
          categoryMap={categoryMap}
          onEditExpense={setEdit}
          onDeleteExpense={handleDeleteExpense}
          onDeleteCash={handleDeleteCash}
        />
      )}

      {/* Unified Quick-Add FAB (Expense | Cash) */}
      <button
        onClick={() => setQuickAdd(true)}
        className="fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-4xl font-light text-white shadow-lg transition active:scale-90"
        aria-label="Add activity"
      >
        +
      </button>

      {quickAdd && (
        <QuickAddSheet
          onClose={() => setQuickAdd(false)}
          categories={categories}
          onSubmitExpense={handleAddExpense}
          onSubmitCash={handleAddCash}
          minDate={settings?.first_activity_date}
        />
      )}

      {edit && (
        <ExpenseSheet
          mode="edit"
          lang="en"
          categories={categories}
          initial={edit}
          minDate={settings?.first_activity_date}
          onClose={() => setEdit(null)}
          onSubmit={handleEditSubmit}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
