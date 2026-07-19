"use client";

import { useMemo, useState } from "react";
import { formatMoney, formatDayHeader } from "@/lib/format";
import { useLedger } from "@/lib/useLedger";
import { getPeriodRange, isWithin, todayISO, type Period } from "@/lib/time";
import MumTabs from "@/components/MumTabs";

// Shared Overview dashboard, mounted at both /mum (public) and /admin
// (password-gated) — see MumTabs for the basePath convention. The hero shows
// the current cash-left balance (mirroring BalanceCard's sign convention and
// copy); below it, a period-spend summary line and a category-breakdown list
// where each row's bar is that category's share of the period total.
export default function MumOverviewView({ basePath }: { basePath: string }) {
  const { expenses, categoryMap, balance, loading, error } = useLedger();
  const [period, setPeriod] = useState<Period>("monthly");
  const [offset, setOffset] = useState(0);

  // Same sign convention as BalanceCard: positive (>= 0) = the helper is
  // holding Mum's money; negative = the helper is out of pocket.
  const positive = balance >= 0;

  function changePeriod(p: Period) {
    setPeriod(p);
    setOffset(0);
  }

  const range = useMemo(() => getPeriodRange(period, offset), [period, offset]);
  const inRange = useMemo(
    () => expenses.filter((e) => isWithin(e.entry_date, range)),
    [expenses, range]
  );
  const grandTotal = useMemo(
    () => inRange.reduce((s, e) => s + e.amount, 0),
    [inRange]
  );

  // Per-category totals for the period, sorted descending by spend. Only
  // categories that actually have spend appear (drives the "M categories"
  // count and the breakdown list alike).
  const breakdown = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of inRange) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    }
    return Array.from(totals.entries())
      .map(([key, total]) => ({ key, total, cat: categoryMap[key] }))
      .sort((a, b) => b.total - a.total);
  }, [inRange, categoryMap]);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-28">
      <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-gray-100 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <h1 className="text-xl font-bold">Spending Dashboard</h1>
        <MumTabs active="overview" basePath={basePath} />
      </header>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
      ) : error ? (
        <p className="py-16 text-center text-sm text-red-600">Failed to load data.</p>
      ) : (
        <>
          {/* Hero: current cash-left balance. Gradient flips on sign so a
              negative (out-of-pocket) balance reads as a warning. */}
          <div
            className={`mb-5 rounded-3xl bg-gradient-to-br p-6 text-white shadow-sm ${
              positive
                ? "from-orange-500 via-orange-500 to-rose-600"
                : "from-rose-600 to-red-700"
            }`}
          >
            <div className="text-xs font-medium uppercase tracking-wide text-white/80">
              Cash left
            </div>
            <div className="mt-1 text-4xl font-bold">
              {positive ? "" : "−"}
              {formatMoney(Math.abs(balance))}
            </div>
            <div className="mt-1 text-sm text-white/80">{formatDayHeader(todayISO())}</div>
            <div className="my-4 h-px bg-white/20" />
            <div className="text-sm font-medium text-white/90">
              {positive
                ? "Positive = the helper is holding Mum's money."
                : "Negative = the helper is out of pocket; Mum owes this back."}
            </div>
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

          {/* Category breakdown — each bar is the category's share of the
              period total (total ÷ grand total), sorted by spend. */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700">Category Breakdown</h2>
            <p className="mb-3 mt-0.5 text-xs text-gray-400">
              {range.label} · {formatMoney(grandTotal)} spent · {inRange.length}{" "}
              {inRange.length === 1 ? "entry" : "entries"} across {breakdown.length}{" "}
              {breakdown.length === 1 ? "category" : "categories"}
            </p>
            {breakdown.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">
                No spending in this period.
              </p>
            ) : (
              <div className="space-y-4">
                {breakdown.map(({ key, total, cat }) => {
                  const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{cat?.emoji}</span>
                          <span className="text-sm font-medium text-gray-700">
                            {cat?.labelEn ?? key}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-400">
                            {pct.toFixed(1)}%
                          </span>
                          <span className="text-sm font-bold text-gray-800">
                            {formatMoney(total)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-rose-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
