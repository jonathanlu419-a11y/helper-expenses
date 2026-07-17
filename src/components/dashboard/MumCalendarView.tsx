"use client";

import { useMemo, useState } from "react";
import { bigColor } from "@/lib/categories";
import { formatMoney, formatDateShort } from "@/lib/format";
import { useLedger } from "@/lib/useLedger";
import { getMonthGrid, monthStartISO } from "@/lib/time";
import MumTabs from "@/components/MumTabs";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface DayCash {
  given: number;
  collected: number;
}

// Shared Calendar dashboard, mounted at both /mum (public) and /admin
// (password-gated) — see MumTabs for the basePath convention.
export default function MumCalendarView({ basePath }: { basePath: string }) {
  const { expenses, cash, settings, categories, categoryMap, bigCategories, bigMap, loading, error } =
    useLedger();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const grid = useMemo(() => getMonthGrid(offset), [offset]);

  // Don't navigate to a month entirely before the "first activity" month.
  const firstActivity = settings?.first_activity_date ?? null;
  const canGoPrev = useMemo(() => {
    if (!firstActivity) return true;
    return monthStartISO(offset - 1).slice(0, 7) >= firstActivity.slice(0, 7);
  }, [firstActivity, offset]);

  // Big categories to show: active ones that have at least one active category
  // OR any historical spend rolling into them (so nothing is hidden).
  const displayedBigs = useMemo(() => {
    const withActive = new Set(categories.filter((c) => c.isActive).map((c) => c.bigCategory));
    const withSpend = new Set(
      expenses.map((e) => categoryMap[e.category]?.bigCategory).filter(Boolean) as string[]
    );
    return bigCategories
      .filter((b) => b.isActive && (withActive.has(b.key) || withSpend.has(b.key)))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories, bigCategories, expenses, categoryMap]);

  const colorFor = useMemo(() => {
    const m = new Map<string, ReturnType<typeof bigColor>>();
    displayedBigs.forEach((b, i) => m.set(b.key, bigColor(i)));
    return m;
  }, [displayedBigs]);

  // entry_date → { bigKey: total }
  const dayTotals = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const e of expenses) {
      const big = categoryMap[e.category]?.bigCategory;
      if (!big) continue;
      let rec = map.get(e.entry_date);
      if (!rec) {
        rec = {};
        map.set(e.entry_date, rec);
      }
      rec[big] = (rec[big] ?? 0) + e.amount;
    }
    return map;
  }, [expenses, categoryMap]);

  const dayCash = useMemo(() => {
    const map = new Map<string, DayCash>();
    for (const c of cash) {
      let rec = map.get(c.entry_date);
      if (!rec) {
        rec = { given: 0, collected: 0 };
        map.set(c.entry_date, rec);
      }
      if (c.type === "given") rec.given += c.amount;
      else rec.collected += c.amount;
    }
    return map;
  }, [cash]);

  const selectedExpenses = useMemo(
    () => (selected ? expenses.filter((e) => e.entry_date === selected) : []),
    [expenses, selected]
  );
  const selectedCash = useMemo(
    () => (selected ? cash.filter((c) => c.entry_date === selected) : []),
    [cash, selected]
  );

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-gray-100 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <h1 className="text-xl font-bold">Spending Calendar</h1>
        <MumTabs active="calendar" basePath={basePath} />
      </header>

      {/* Legend — one entry per active big category (dynamic) + cash */}
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        {displayedBigs.map((b) => (
          <span key={b.key} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${colorFor.get(b.key)?.bar}`} />
            <span className={`font-medium ${colorFor.get(b.key)?.text}`}>{b.labelEn}</span>
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="rounded bg-green-100 px-1 font-medium text-green-700">+$ given</span>
          <span className="rounded bg-red-100 px-1 font-medium text-red-700">−$ collected</span>
        </span>
      </div>

      {/* Month navigator */}
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-white px-2 py-2 shadow-sm">
        <button
          onClick={() => setOffset((o) => o - 1)}
          disabled={!canGoPrev}
          className="rounded-full px-4 py-2 text-lg text-gray-500 active:bg-gray-100 disabled:opacity-30"
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">{grid.label}</div>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)} className="text-xs text-blue-600">
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
            <div className="grid grid-cols-7 text-center text-[10px] font-medium uppercase text-gray-400">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            {grid.weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((cell) => {
                  const totals = dayTotals.get(cell.iso);
                  const dc = dayCash.get(cell.iso);
                  const isSel = selected === cell.iso;
                  return (
                    <button
                      key={cell.iso}
                      onClick={() => setSelected((s) => (s === cell.iso ? null : cell.iso))}
                      className={`m-0.5 flex min-h-[72px] flex-col rounded-lg border p-1 text-left transition ${
                        isSel ? "border-slate-800 bg-slate-50" : "border-transparent"
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
                      {cell.inMonth && (
                        <span className="mt-0.5 flex flex-col gap-[1px] leading-tight">
                          {totals &&
                            displayedBigs.map((b) =>
                              totals[b.key] > 0 ? (
                                <span
                                  key={b.key}
                                  className={`text-[9px] font-semibold ${colorFor.get(b.key)?.text}`}
                                >
                                  {Math.round(totals[b.key])}
                                </span>
                              ) : null
                            )}
                          {dc && dc.given > 0 && (
                            <span className="mt-0.5 rounded bg-green-100 px-1 text-[9px] font-semibold text-green-700">
                              +{Math.round(dc.given)}
                            </span>
                          )}
                          {dc && dc.collected > 0 && (
                            <span className="mt-0.5 rounded bg-red-100 px-1 text-[9px] font-semibold text-red-700">
                              −{Math.round(dc.collected)}
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Selected-day detail */}
          {selected && (
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">
                  {formatDateShort(selected)}
                </h2>
                <button onClick={() => setSelected(null)} className="text-xs text-gray-400">
                  Close
                </button>
              </div>

              <div className="mb-3 flex flex-wrap gap-3">
                {displayedBigs.map((b) => {
                  const v = dayTotals.get(selected)?.[b.key] ?? 0;
                  return (
                    <span key={b.key} className="text-xs">
                      <span className={`font-semibold ${colorFor.get(b.key)?.text}`}>
                        {b.labelEn}: {formatMoney(v)}
                      </span>
                    </span>
                  );
                })}
                {dayCash.get(selected)?.given ? (
                  <span className="text-xs font-semibold text-green-700">
                    Received: {formatMoney(dayCash.get(selected)!.given)}
                  </span>
                ) : null}
                {dayCash.get(selected)?.collected ? (
                  <span className="text-xs font-semibold text-red-700">
                    Returned: {formatMoney(dayCash.get(selected)!.collected)}
                  </span>
                ) : null}
              </div>

              {selectedExpenses.length === 0 && selectedCash.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">Nothing on this day.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {selectedExpenses.map((e) => {
                      const cat = categoryMap[e.category];
                      const big = cat ? bigMap[cat.bigCategory] : undefined;
                      return (
                        <tr key={`e${e.id}`} className="border-t border-gray-50">
                          <td className="py-2 text-gray-700">
                            <span className="mr-1">{cat?.emoji}</span>
                            {cat?.labelEn ?? e.category}
                            {big && (
                              <span className="ml-1 text-xs text-gray-400">· {big.labelEn}</span>
                            )}
                          </td>
                          <td className="py-2 text-right font-medium">{formatMoney(e.amount)}</td>
                        </tr>
                      );
                    })}
                    {selectedCash.map((c) => (
                      <tr key={`c${c.id}`} className="border-t border-gray-50">
                        <td className="py-2 text-gray-700">
                          {c.type === "given" ? "💵 Cash given" : "💵 Cash collected"}
                        </td>
                        <td
                          className={`py-2 text-right font-medium ${
                            c.type === "given" ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          {c.type === "given" ? "+" : "−"}
                          {formatMoney(c.amount)}
                        </td>
                      </tr>
                    ))}
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
