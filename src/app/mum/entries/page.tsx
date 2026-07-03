"use client";

import { useState } from "react";
import { CATEGORY_MAP } from "@/lib/categories";
import { formatMoney, formatDateShort } from "@/lib/format";
import type { Expense, ExpenseInput } from "@/lib/types";
import { useExpenses } from "@/lib/useExpenses";
import ExpenseSheet from "@/components/ExpenseSheet";
import Toast, { type ToastState } from "@/components/Toast";
import MumTabs from "@/components/MumTabs";

export default function MumEntriesPage() {
  const { expenses, loading, error, reload, add, edit, remove } = useExpenses();
  const [sheet, setSheet] = useState<
    { mode: "add" } | { mode: "edit"; expense: Expense } | null
  >(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  async function handleSubmit(input: ExpenseInput) {
    if (sheet?.mode === "edit") {
      await edit(sheet.expense.id, input);
      setToast({ message: "Changes saved.", kind: "success" });
    } else {
      await add(input);
      setToast({ message: "Saved.", kind: "success" });
    }
    setSheet(null);
  }

  async function handleDelete(exp: Expense) {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await remove(exp.id);
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

      <section>
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
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl">🧾</div>
            <p className="mt-3 text-sm text-gray-500">
              No entries yet. Tap{" "}
              <span className="font-bold text-green-600">+</span> to add one.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-1 py-2" />
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const cat = CATEGORY_MAP[exp.category];
                  return (
                    <tr
                      key={exp.id}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td
                        className="cursor-pointer px-3 py-3 text-gray-500"
                        onClick={() => setSheet({ mode: "edit", expense: exp })}
                      >
                        {formatDateShort(exp.entry_date)}
                      </td>
                      <td
                        className="cursor-pointer px-3 py-3"
                        onClick={() => setSheet({ mode: "edit", expense: exp })}
                      >
                        <span className="mr-1">{cat?.emoji}</span>
                        <span className="text-gray-700">{cat?.labelEn}</span>
                        {exp.note && (
                          <span className="mt-0.5 block text-xs text-gray-400">
                            {exp.note}
                          </span>
                        )}
                      </td>
                      <td
                        className="cursor-pointer px-3 py-3 text-right font-semibold"
                        onClick={() => setSheet({ mode: "edit", expense: exp })}
                      >
                        {formatMoney(exp.amount)}
                      </td>
                      <td className="px-1 py-3 text-right">
                        <button
                          onClick={() => handleDelete(exp)}
                          className="rounded-full px-2 py-1 text-gray-300 hover:text-red-500"
                          aria-label="Delete"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
          onClose={() => setSheet(null)}
          onSubmit={handleSubmit}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
