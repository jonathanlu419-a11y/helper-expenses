"use client";

import { useState } from "react";
import type { Expense, ExpenseInput } from "@/lib/types";
import { useLedger } from "@/lib/useLedger";
import ExpenseSheet from "@/components/ExpenseSheet";
import Toast, { type ToastState } from "@/components/Toast";
import DayGroupedEntries from "@/components/DayGroupedEntries";
import MumTabs from "@/components/MumTabs";

export default function MumEntriesPage() {
  const {
    expenses,
    cash,
    settings,
    loading,
    error,
    reload,
    addExpense,
    editExpense,
    removeExpense,
  } = useLedger();
  const [sheet, setSheet] = useState<
    { mode: "add" } | { mode: "edit"; expense: Expense } | null
  >(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  async function handleSubmit(input: ExpenseInput) {
    if (sheet?.mode === "edit") {
      await editExpense(sheet.expense.id, input);
      setToast({ message: "Changes saved.", kind: "success" });
    } else {
      await addExpense(input);
      setToast({ message: "Saved.", kind: "success" });
    }
    setSheet(null);
  }

  async function handleDelete(exp: Expense) {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await removeExpense(exp.id);
      setToast({ message: "Deleted.", kind: "success" });
    } catch (e) {
      setToast({
        message: e instanceof Error ? e.message : "Failed to delete.",
        kind: "error",
      });
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-28">
      <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-gray-100 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <h1 className="text-xl font-bold">All Entries</h1>
        <MumTabs active="entries" />
      </header>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
      ) : error ? (
        <div className="py-16 text-center">
          <p className="text-sm text-red-600">{error}</p>
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
            No entries yet. Tap{" "}
            <span className="font-bold text-green-600">+</span> to add one.
          </p>
        </div>
      ) : (
        <DayGroupedEntries
          expenses={expenses}
          cash={cash}
          lang="en"
          onEdit={(e) => setSheet({ mode: "edit", expense: e })}
          onDelete={handleDelete}
        />
      )}

      {/* Floating Quick-Add button (English) */}
      <button
        onClick={() => setSheet({ mode: "add" })}
        className="fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-4xl font-light text-white shadow-lg transition active:scale-90"
        aria-label="Add expense"
      >
        +
      </button>

      {sheet && (
        <ExpenseSheet
          mode={sheet.mode}
          lang="en"
          initial={sheet.mode === "edit" ? sheet.expense : undefined}
          minDate={settings?.first_activity_date}
          onClose={() => setSheet(null)}
          onSubmit={handleSubmit}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
