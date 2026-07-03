"use client";

import { useMemo, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { formatMoney } from "@/lib/format";
import { useExpenses } from "@/lib/useExpenses";
import { getPeriodRange, isWithin, type Period } from "@/lib/time";
import MumTabs from "@/components/MumTabs";

export default function MumPage() {
  const { expenses, loading, error } = useExpenses();
  const [period, setPeriod] = useState<Period>("weekly");
  // 0 = current period, -1 = previous, +1 = next …
  const [offset, setOffset] = useState(0);

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

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-gray-100 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <h1 className="text-xl font-bold">Spending Dashboard</h1>
        <MumTabs active="summary" />
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
          <div className="space-y-3">
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
        </>
      )}
    </main>
  );
}
