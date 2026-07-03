"use client";

import { CATEGORY_MAP } from "@/lib/categories";
import { formatMoney, formatDateShort } from "@/lib/format";
import { sumExpenses } from "@/lib/balance";
import type { Expense, CashTransaction } from "@/lib/types";
import type { Lang } from "./ExpenseSheet";

// Entries grouped by calendar day (HK). Each day shows a header with the day's
// spent total + any cash movement (Feature 3), the individual expense rows,
// and a subtotal line after the rows (Feature 1). Days that had only a cash
// transaction (no expenses) still appear so cash activity is never hidden.

const STRINGS: Record<Lang, Record<string, string>> = {
  id: {
    spent: "Belanja",
    subtotal: "Subtotal",
    received: "Terima dari Mum",
    paidBack: "Kembali ke Mum",
    noExpenses: "Tidak ada belanja",
  },
  en: {
    spent: "Spent",
    subtotal: "Subtotal",
    received: "Received from Mum",
    paidBack: "Paid back to Mum",
    noExpenses: "No expenses",
  },
};

interface DayCash {
  given: number;
  collected: number;
}

export default function DayGroupedEntries({
  expenses,
  cash,
  lang,
  onEdit,
  onDelete,
}: {
  expenses: Expense[];
  cash: CashTransaction[];
  lang: Lang;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}) {
  const t = STRINGS[lang];
  const locale = lang === "id" ? "id-ID" : "en-GB";

  // Group expenses by day.
  const byDay = new Map<string, Expense[]>();
  for (const e of expenses) {
    const arr = byDay.get(e.entry_date);
    if (arr) arr.push(e);
    else byDay.set(e.entry_date, [e]);
  }

  // Cash per day.
  const cashByDay = new Map<string, DayCash>();
  for (const c of cash) {
    let rec = cashByDay.get(c.entry_date);
    if (!rec) {
      rec = { given: 0, collected: 0 };
      cashByDay.set(c.entry_date, rec);
    }
    if (c.type === "given") rec.given += c.amount;
    else rec.collected += c.amount;
  }

  // Union of all active days, newest first.
  const days = Array.from(new Set([...byDay.keys(), ...cashByDay.keys()])).sort(
    (a, b) => (a < b ? 1 : -1)
  );

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const dayExpenses = byDay.get(day) ?? [];
        const spent = sumExpenses(dayExpenses);
        const dc = cashByDay.get(day);
        return (
          <div
            key={day}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
          >
            {/* Day header */}
            <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-sm font-semibold text-gray-700">
                {formatDateShort(day, locale)}
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-gray-600">
                  {t.spent}: {formatMoney(spent)}
                </div>
                {dc && dc.given > 0 && (
                  <div className="text-xs font-medium text-green-600">
                    {t.received}: {formatMoney(dc.given)}
                  </div>
                )}
                {dc && dc.collected > 0 && (
                  <div className="text-xs font-medium text-red-600">
                    {t.paidBack}: {formatMoney(dc.collected)}
                  </div>
                )}
              </div>
            </div>

            {/* Entry rows */}
            {dayExpenses.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-400">{t.noExpenses}</div>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {dayExpenses.map((exp) => {
                    const cat = CATEGORY_MAP[exp.category];
                    const label = lang === "id" ? cat?.labelId : cat?.labelEn;
                    return (
                      <tr key={exp.id} className="border-b border-gray-50 last:border-0">
                        <td
                          className="cursor-pointer px-3 py-3"
                          onClick={() => onEdit(exp)}
                        >
                          <span className="mr-1">{cat?.emoji}</span>
                          <span className="text-gray-700">{label}</span>
                          {exp.note && (
                            <span className="mt-0.5 block text-xs text-gray-400">
                              {exp.note}
                            </span>
                          )}
                        </td>
                        <td
                          className="cursor-pointer px-3 py-3 text-right font-semibold"
                          onClick={() => onEdit(exp)}
                        >
                          {formatMoney(exp.amount)}
                        </td>
                        <td className="px-1 py-3 text-right">
                          <button
                            onClick={() => onDelete(exp)}
                            className="rounded-full px-2 py-1 text-gray-300 hover:text-red-500"
                            aria-label="delete"
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

            {/* Day subtotal (Feature 1) */}
            <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
              {t.subtotal}: {formatMoney(spent)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
