"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/categories";
import { formatMoney, formatDateShort, parseISODate } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { fetchExpenses } from "@/lib/client";

type Period = "weekly" | "monthly";

export default function MumPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("weekly");
  // 0 = current period, -1 = previous, +1 = next …
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setExpenses(await fetchExpenses());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Reset navigation when switching period type.
  function changePeriod(p: Period) {
    setPeriod(p);
    setOffset(0);
  }

  const range = useMemo(() => getRange(period, offset), [period, offset]);

  const inRange = useMemo(
    () =>
      expenses.filter((e) => {
        const d = parseISODate(e.entry_date);
        return d >= range.start && d < range.end;
      }),
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
                <div
                  key={c.key}
                  className="rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{c.emoji}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {c.labelEn}
                      </span>
                    </div>
                    <span className="text-sm font-bold">
                      {formatMoney(val)}
                    </span>
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

          {/* Raw entries (read-only) */}
          <details className="rounded-2xl bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700">
              All entries this period ({inRange.length})
            </summary>
            {inRange.length === 0 ? (
              <p className="mt-3 text-sm text-gray-400">No entries.</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400">
                    <th className="py-1 font-medium">Date</th>
                    <th className="py-1 font-medium">Category</th>
                    <th className="py-1 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {inRange.map((e) => (
                    <tr key={e.id} className="border-t border-gray-50">
                      <td className="py-2 text-gray-500">
                        {formatDateShort(e.entry_date)}
                      </td>
                      <td className="py-2 text-gray-700">
                        <span className="mr-1">
                          {CATEGORY_MAP[e.category]?.emoji}
                        </span>
                        {CATEGORY_MAP[e.category]?.labelEn}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {formatMoney(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </details>
        </>
      )}
    </main>
  );
}

// ── Period maths ──────────────────────────────────────────────
// Weekly = Monday–Sunday. Monthly = calendar month.
// `end` is exclusive (start of the next period).

function getRange(
  period: Period,
  offset: number
): { start: Date; end: Date; label: string } {
  const now = new Date();

  if (period === "weekly") {
    const start = startOfWeek(now);
    start.setDate(start.getDate() + offset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const lastDay = new Date(end);
    lastDay.setDate(lastDay.getDate() - 1);
    const label = `${fmt(start)} – ${fmt(lastDay)}`;
    return { start, end, label };
  }

  // monthly
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  const label = start.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  return { start, end, label };
}

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}

function fmt(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
