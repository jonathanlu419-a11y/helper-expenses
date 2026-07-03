"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/categories";
import { formatMoney, formatDateShort } from "@/lib/format";
import type { ExpenseInput, CashInput } from "@/lib/types";
import { useLedger } from "@/lib/useLedger";
import { getPeriodRange, isWithin, type Period } from "@/lib/time";
import MumTabs from "@/components/MumTabs";
import BalanceCard from "@/components/BalanceCard";
import QuickAddSheet from "@/components/QuickAddSheet";
import Toast, { type ToastState } from "@/components/Toast";

export default function MumPage() {
  const {
    expenses,
    cash,
    settings,
    balance,
    loading,
    error,
    addExpense,
    addCash,
  } = useLedger();
  const [period, setPeriod] = useState<Period>("weekly");
  const [offset, setOffset] = useState(0);
  const [quickAdd, setQuickAdd] = useState(false);
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
  const grandTotal = useMemo(() => inRange.reduce((s, e) => s + e.amount, 0), [inRange]);
  const maxCat = useMemo(
    () => Math.max(1, ...CATEGORIES.map((c) => totals.get(c.key) ?? 0)),
    [totals]
  );

  // 3 most recent activities (expenses + cash mixed), newest first.
  const recent = useMemo(() => {
    const items = [
      ...expenses.map((e) => ({ kind: "expense" as const, date: e.entry_date, ts: e.created_at, e })),
      ...cash.map((c) => ({ kind: "cash" as const, date: c.entry_date, ts: c.created_at, c })),
    ].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.ts < a.ts ? -1 : 1;
    });
    return items.slice(0, 3);
  }, [expenses, cash]);

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

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-28">
      <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-gray-100 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <h1 className="text-xl font-bold">Spending Dashboard</h1>
        <MumTabs active="summary" />
      </header>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
      ) : error ? (
        <p className="py-16 text-center text-sm text-red-600">Failed to load data.</p>
      ) : (
        <>
          <BalanceCard balance={balance} lang="en" />

          {/* Recent Activity preview */}
          <div className="mb-5 mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
              <Link href="/mum/entries" className="text-xs font-medium text-blue-600">
                See all →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="py-3 text-center text-sm text-gray-400">No activity yet.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {recent.map((item) =>
                  item.kind === "expense" ? (
                    <li key={`e${item.e.id}`} className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-700">
                        <span className="mr-1">{CATEGORY_MAP[item.e.category]?.emoji}</span>
                        {CATEGORY_MAP[item.e.category]?.labelEn}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{formatDateShort(item.date)}</span>
                        <span className="text-sm font-semibold">{formatMoney(item.e.amount)}</span>
                      </span>
                    </li>
                  ) : (
                    <li key={`c${item.c.id}`} className="flex items-center justify-between py-2">
                      <span className={`text-sm font-medium ${item.c.type === "given" ? "text-emerald-700" : "text-amber-700"}`}>
                        <span className="mr-1">{item.c.type === "given" ? "💰" : "🔄"}</span>
                        {item.c.type === "given" ? "Cash from Mum" : "Cash back to Mum"}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{formatDateShort(item.date)}</span>
                        <span className={`text-sm font-semibold ${item.c.type === "given" ? "text-emerald-700" : "text-amber-700"}`}>
                          {item.c.type === "given" ? "+" : "−"}
                          {formatMoney(item.c.amount)}
                        </span>
                      </span>
                    </li>
                  )
                )}
              </ul>
            )}
          </div>

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
                <button onClick={() => setOffset(0)} className="text-xs text-blue-600">
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

          {/* Total */}
          <div className="mb-5 rounded-2xl bg-slate-800 p-5 text-white">
            <div className="text-xs uppercase tracking-wide text-slate-300">Total spent</div>
            <div className="mt-1 text-3xl font-bold">{formatMoney(grandTotal)}</div>
            <div className="mt-1 text-xs text-slate-400">
              {inRange.length} {inRange.length === 1 ? "entry" : "entries"}
            </div>
          </div>

          {/* Category breakdown with bars */}
          <div className="space-y-3">
            {CATEGORIES.map((c) => {
              const val = totals.get(c.key) ?? 0;
              const pct = (val / maxCat) * 100;
              return (
                <div key={c.key} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{c.emoji}</span>
                      <span className="text-sm font-medium text-gray-700">{c.labelEn}</span>
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
        </>
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
          onSubmitExpense={handleAddExpense}
          onSubmitCash={handleAddCash}
          minDate={settings?.first_activity_date}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
