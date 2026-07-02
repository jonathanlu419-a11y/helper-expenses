"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/categories";
import { formatMoney, formatDateShort } from "@/lib/format";
import type { Expense, ExpenseInput } from "@/lib/types";
import { useExpenses } from "@/lib/useExpenses";
import { getPeriodRange, isWithin, type Period } from "@/lib/time";
import ExpenseSheet from "@/components/ExpenseSheet";
import Toast, { type ToastState } from "@/components/Toast";

export default function MumPage() {
  const { expenses, loading, error, add, edit, remove } = useExpenses();
  const [period, setPeriod] = useState<Period>("weekly");
  // 0 = current period, -1 = previous, +1 = next …
  const [offset, setOffset] = useState(0);
  const [sheet, setSheet] = useState<
    { mode: "add" } | { mode: "edit"; expense: Expense } | null
  >(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  function changePeriod(p: Period) {
    setPeriod(p);
    setOffset(0);
  }

  const range = useMemo(() => getPeriodRange(period, offset), [period, offset]);

  const inRange = useMemo(
    () => expenses.filter((e) => isWithin(e.entry_date, range)),
    [expenses, range]
  );

  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of CATEGORIES) map.set(c.key, 0);
    for (const e of inRange) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return map;
  }, [inRange]);

  const grandTotal = useMemo(
    () => inRange.reduce((s, e) => s + e.amount, 0),
    [inRange]
  );

  const maxCat = useMemo(
    () => Math.max(1, ...CATEGORIES.map((c) => totals.get(c.key) ?? 0)),
    [totals]
  );

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
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Spending Dashboard</h1>
          <Link href="/worker" className="text-xs text-gray-400">
            Entry screen →
          </Link>
        </div>
      </header>

      {/* Weekly / Monthly toggle */}
      <div className="mb-4 flex rounded-full bg-gray-200 p-1">
        {(["weekly", "monthly"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => changePeriod(p)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize transition ${
              period === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Period navigator */}
      <div className="mb-5 flex items-center justify-between rounded-2xl bg-white px-2 py-2 shadow-sm">
        <button
          onClick={() => setOffset((o) => o - 1)}
          className="rounded-full px-4 py-2 text-lg text-gray-500 active:bg-gray-100"
          aria-label="Previous period"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">{range.label}</div>
          {offset !== 0 && (
            <button
              onClick={() => setOffset(0)}
              className="text-xs text-blue-600"
            >
              Back to current
            </button>
          )}
        </div>
        <button
          onClick={() => setOffset((o) => o + 1)}
          disabled={offset >= 0}
          className="rounded-full px-4 py-2 text-lg text-gray-500 active:bg-gray-100 disabled:opacity-30"
          aria-label="Next period"
        >
          ›
        </button>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
      ) : error ? (
        <p className="py-16 text-center text-sm text-red-600">{error}</p>
      ) : (
        <>
          {/* Total */}
          <div className="mb-5 rounded-2xl bg-slate-800 p-5 text-white">
            <div className="text-xs uppercase tracking-wide text-slate-300">
              Total spent
            </div>
            <div className="mt-1 text-3xl font-bold">
              {formatMoney(grandTotal)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {inRange.length} {inRange.length === 1 ? "entry" : "entries"}
            </div>
          </div>

          {/* Category breakdown with bars */}
          <div className="mb-6 space-y-3">
            {CATEGORIES.map((c) => {
              const val = totals.get(c.key) ?? 0;
              const pct = (val / maxCat) * 100;
              return (
                <div key={c.key} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{c.emoji}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {c.labelEn}
                      </span>
                    </div>
                    <span className="text-sm font-bold">{formatMoney(val)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Entries — editable + deletable */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">
                Entries this period
              </h2>
              <span className="text-xs text-gray-400">{inRange.length}</span>
            </div>
            {inRange.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                No entries in this period.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400">
                    <th className="py-1 font-medium">Date</th>
                    <th className="py-1 font-medium">Category</th>
                    <th className="py-1 text-right font-medium">Amount</th>
                    <th className="py-1" />
                  </tr>
                </thead>
                <tbody>
                  {inRange.map((e) => {
                    const cat = CATEGORY_MAP[e.category];
                    return (
                      <tr key={e.id} className="border-t border-gray-50">
                        <td
                          className="cursor-pointer py-2 text-gray-500"
                          onClick={() => setSheet({ mode: "edit", expense: e })}
                        >
                          {formatDateShort(e.entry_date)}
                        </td>
                        <td
                          className="cursor-pointer py-2 text-gray-700"
                          onClick={() => setSheet({ mode: "edit", expense: e })}
                        >
                          <span className="mr-1">{cat?.emoji}</span>
                          {cat?.labelEn}
                          {e.note && (
                            <span className="mt-0.5 block text-xs text-gray-400">
                              {e.note}
                            </span>
                          )}
                        </td>
                        <td
                          className="cursor-pointer py-2 text-right font-medium"
                          onClick={() => setSheet({ mode: "edit", expense: e })}
                        >
                          {formatMoney(e.amount)}
                        </td>
                        <td className="py-2 pl-1 text-right">
                          <button
                            onClick={() => handleDelete(e)}
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
            )}
          </div>
        </>
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
          onClose={() => setSheet(null)}
          onSubmit={handleSubmit}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
