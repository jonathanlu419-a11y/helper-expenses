"use client";

import { CATEGORY_MAP } from "@/lib/categories";
import { formatMoney, formatDateShort } from "@/lib/format";
import { sumExpenses } from "@/lib/balance";
import type { Expense, CashTransaction } from "@/lib/types";
import type { Lang } from "./ExpenseSheet";

// Unified day-grouped activity table shown identically on /worker and
// /mum/entries. Each day shows:
//   - header: date, day's total spent, and the running cash-float balance as
//     of the END of that day (opening + given − collected − expenses,
//     cumulative through that day).
//   - rows: expenses AND cash transactions for that day, mixed and sorted by
//     time, cash rows visually distinct.
//
// Permissions are driven by which handlers are passed:
//   - expenses: onEditExpense / onDeleteExpense (both pages pass these).
//   - cash: onDeleteCash — passed only by Mum; when absent, cash rows are
//     read-only (the worker's view).

const STRINGS: Record<Lang, Record<string, string>> = {
  id: { spent: "Belanja", balance: "Sisa", cashFrom: "Uang dari Mum", cashBack: "Dikembalikan ke Mum" },
  en: { spent: "Spent", balance: "Balance", cashFrom: "Cash from Mum", cashBack: "Cash back to Mum" },
};

type Row =
  | { kind: "expense"; ts: string; e: Expense }
  | { kind: "cash"; ts: string; c: CashTransaction };

export default function DayGroupedEntries({
  expenses,
  cash,
  openingBalance,
  lang,
  onEditExpense,
  onDeleteExpense,
  onDeleteCash,
}: {
  expenses: Expense[];
  cash: CashTransaction[];
  openingBalance: number;
  lang: Lang;
  onEditExpense: (e: Expense) => void;
  onDeleteExpense: (e: Expense) => void;
  onDeleteCash?: (c: CashTransaction) => void;
}) {
  const t = STRINGS[lang];

  // Rows grouped by day.
  const rowsByDay = new Map<string, Row[]>();
  const push = (day: string, row: Row) => {
    const arr = rowsByDay.get(day);
    if (arr) arr.push(row);
    else rowsByDay.set(day, [row]);
  };
  for (const e of expenses) push(e.entry_date, { kind: "expense", ts: e.created_at, e });
  for (const c of cash) push(c.entry_date, { kind: "cash", ts: c.created_at, c });

  // Running end-of-day balance: accumulate oldest → newest.
  const daysAsc = Array.from(rowsByDay.keys()).sort();
  const endBalance = new Map<string, number>();
  let running = openingBalance;
  for (const day of daysAsc) {
    for (const row of rowsByDay.get(day)!) {
      if (row.kind === "expense") running -= row.e.amount;
      else running += row.c.type === "given" ? row.c.amount : -row.c.amount;
    }
    endBalance.set(day, Math.round(running * 100) / 100);
  }

  // Render newest day first.
  const daysDesc = [...daysAsc].reverse();

  return (
    <div className="space-y-4">
      {daysDesc.map((day) => {
        const rows = [...rowsByDay.get(day)!].sort((a, b) => (a.ts < b.ts ? 1 : -1));
        const spent = sumExpenses(rows.filter((r): r is Extract<Row, { kind: "expense" }> => r.kind === "expense").map((r) => r.e));
        return (
          <div key={day} className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            {/* Day header: spent + running balance */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-sm font-semibold text-gray-700">
                {formatDateShort(day, lang)}
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-gray-500">
                  {t.spent}: <span className="font-semibold text-gray-700">{formatMoney(spent)}</span>
                </span>
                <span className="text-gray-500">
                  {t.balance}: <span className="font-semibold text-emerald-700">{formatMoney(endBalance.get(day) ?? 0)}</span>
                </span>
              </div>
            </div>

            {/* Rows */}
            <table className="w-full text-sm">
              <tbody>
                {rows.map((row) =>
                  row.kind === "expense" ? (
                    <ExpenseRow
                      key={`e${row.e.id}`}
                      exp={row.e}
                      lang={lang}
                      onEdit={onEditExpense}
                      onDelete={onDeleteExpense}
                    />
                  ) : (
                    <CashRow
                      key={`c${row.c.id}`}
                      cash={row.c}
                      label={row.c.type === "given" ? t.cashFrom : t.cashBack}
                      onDelete={onDeleteCash}
                    />
                  )
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function ExpenseRow({
  exp,
  lang,
  onEdit,
  onDelete,
}: {
  exp: Expense;
  lang: Lang;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}) {
  const cat = CATEGORY_MAP[exp.category];
  const label = lang === "id" ? cat?.labelId : cat?.labelEn;
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="cursor-pointer px-3 py-3" onClick={() => onEdit(exp)}>
        <span className="mr-1">{cat?.emoji}</span>
        <span className="text-gray-700">{label}</span>
        {exp.note && <span className="mt-0.5 block text-xs text-gray-400">{exp.note}</span>}
      </td>
      <td className="cursor-pointer px-3 py-3 text-right font-semibold" onClick={() => onEdit(exp)}>
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
}

function CashRow({
  cash,
  label,
  onDelete,
}: {
  cash: CashTransaction;
  label: string;
  onDelete?: (c: CashTransaction) => void;
}) {
  const given = cash.type === "given";
  // Given (Mum → helper) = green; Collected (helper → Mum) = amber. Both
  // clearly distinct from the plain-white expense rows.
  const tone = given ? "bg-emerald-50" : "bg-amber-50";
  const amountColor = given ? "text-emerald-700" : "text-amber-700";
  return (
    <tr className={`border-b border-gray-50 last:border-0 ${tone}`}>
      <td className="px-3 py-3">
        <span className="mr-1">{given ? "💰" : "🔄"}</span>
        <span className={`font-medium ${amountColor}`}>{label}</span>
        {cash.note && <span className="mt-0.5 block text-xs text-gray-400">{cash.note}</span>}
      </td>
      <td className={`px-3 py-3 text-right font-semibold ${amountColor}`}>
        {given ? "+" : "−"}
        {formatMoney(cash.amount)}
      </td>
      <td className="px-1 py-3 text-right">
        {onDelete && (
          <button
            onClick={() => onDelete(cash)}
            className="rounded-full px-2 py-1 text-gray-300 hover:text-red-500"
            aria-label="delete cash"
          >
            🗑️
          </button>
        )}
      </td>
    </tr>
  );
}
