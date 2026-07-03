"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BIG_CATEGORIES,
  BIG_CATEGORY_OF,
  CATEGORY_MAP,
  type BigCategoryKey,
} from "@/lib/categories";
import { formatMoney, formatDateShort } from "@/lib/format";
import { useExpenses } from "@/lib/useExpenses";
import { getMonthGrid } from "@/lib/time";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type BigTotals = Record<BigCategoryKey, number>;

function emptyTotals(): BigTotals {
  return { food: 0, transport: 0, household: 0 };
}

export default function CalendarPage() {
  const { expenses, loading, error } = useExpenses();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const grid = useMemo(() => getMonthGrid(offset), [offset]);

  // entry_date → per-big-category totals for that day.
  const dayTotals = useMemo(() => {
    const map = new Map<string, BigTotals>();
    for (const e of expenses) {
      const big = BIG_CATEGORY_OF[e.category];
      if (!big) continue;
      let rec = map.get(e.entry_date);
      if (!rec) {
        rec = emptyTotals();
        map.set(e.entry_date, rec);
      }
      rec[big] += e.amount;
    }
    return map;
  }, [expenses]);

  const selectedEntries = useMemo(
    () =>
      selected
        ? expenses.filter((e) => e.entry_date === selected)
        : [],
    [expenses, selected]
  );

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-gray-100 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Spending Calendar</h1>
          <Link href="/worker" className="text-xs text-gray-400">
            Entry screen →
          </Link>
        </div>
        {/* sub-nav */}
        <div className="mt-3 flex gap-2">
          <Link
            href="/mum"
            className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600"
          >
            Summary
          </Link>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-medium text-white">
            Calendar
          </span>
        </div>
      </header>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {BIG_CATEGORIES.map((b) => (
          <span key={b.key} className="flex items-center gap-1">
            <span>{b.emoji}</span>
            <span className={`font-medium ${b.colorClass}`}>{b.labelEn}</span>
          </span>
        ))}
      </div>

      {/* Month navigator */}
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-white px-2 py-2 shadow-sm">
        <button
          onClick={() => setOffset((o) => o - 1)}
          className="rounded-full px-4 py-2 text-lg text-gray-500 active:bg-gray-100"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">{grid.label}</div>
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
          className="rounded-full px-4 py-2 text-lg text-gray-500 active:bg-gray-100"
          aria-label="Next month"
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
          <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-sm">
            {/* weekday header */}
            <div className="grid grid-cols-7 text-center text-[10px] font-medium uppercase text-gray-400">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            {/* weeks */}
            {grid.weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((cell) => {
                  const totals = dayTotals.get(cell.iso);
                  const isSel = selected === cell.iso;
                  return (
                    <button
                      key={cell.iso}
                      onClick={() =>
                        setSelected((s) => (s === cell.iso ? null : cell.iso))
                      }
                      className={`m-0.5 flex min-h-[64px] flex-col rounded-lg border p-1 text-left transition ${
                        isSel
                          ? "border-slate-800 bg-slate-50"
                          : "border-transparent"
                      } ${cell.inMonth ? "bg-gray-50" : "bg-transparent"}`}
                    >
                      <span
                        className={`text-[11px] font-semibold ${
                          !cell.inMonth
                            ? "text-gray-300"
                            : cell.isToday
                              ? "flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white"
                              : "text-gray-600"
                        }`}
                      >
                        {cell.day}
                      </span>
                      {cell.inMonth && totals && (
                        <span className="mt-0.5 flex flex-col gap-[1px] leading-tight">
                          {BIG_CATEGORIES.map((b) =>
                            totals[b.key] > 0 ? (
                              <span
                                key={b.key}
                                className={`text-[9px] font-medium ${b.colorClass}`}
                              >
                                {b.emoji}
                                {Math.round(totals[b.key])}
                              </span>
                            ) : null
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Selected-day detail (optional expand) */}
          {selected && (
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">
                  {formatDateShort(selected)}
                </h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-gray-400"
                >
                  Close
                </button>
              </div>

              {/* big-category summary for the day */}
              <div className="mb-3 flex flex-wrap gap-3">
                {BIG_CATEGORIES.map((b) => {
                  const v = dayTotals.get(selected)?.[b.key] ?? 0;
                  return (
                    <span key={b.key} className="text-xs">
                      <span className="mr-1">{b.emoji}</span>
                      <span className={`font-semibold ${b.colorClass}`}>
                        {formatMoney(v)}
                      </span>
                    </span>
                  );
                })}
              </div>

              {selectedEntries.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">
                  No entries on this day.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {selectedEntries.map((e) => {
                      const cat = CATEGORY_MAP[e.category];
                      return (
                        <tr key={e.id} className="border-t border-gray-50">
                          <td className="py-2 text-gray-700">
                            <span className="mr-1">{cat?.emoji}</span>
                            {cat?.labelEn}
                            {e.note && (
                              <span className="mt-0.5 block text-xs text-gray-400">
                                {e.note}
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-right font-medium">
                            {formatMoney(e.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
