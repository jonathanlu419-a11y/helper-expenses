"use client";

import { useState } from "react";
import type { Category, CategoryKey } from "@/lib/categories";
import { todayISO } from "@/lib/time";
import type { ExpenseInput, CashInput, CashType } from "@/lib/types";

// Mum's unified Quick Add — one bottom sheet, two tabs (Expense | Cash),
// reachable from the single "+" FAB. English copy.

export default function QuickAddSheet({
  onClose,
  categories,
  onSubmitExpense,
  onSubmitCash,
  minDate,
}: {
  onClose: () => void;
  categories: Category[];
  onSubmitExpense: (input: ExpenseInput) => Promise<void>;
  onSubmitCash: (input: CashInput) => Promise<void>;
  minDate?: string | null;
}) {
  const [tab, setTab] = useState<"expense" | "cash">("expense");
  const activeCats = categories
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // expense state
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(todayISO());

  // cash state
  const [cashType, setCashType] = useState<CashType>("given");
  const [cashAmount, setCashAmount] = useState("");
  const [cashDate, setCashDate] = useState(todayISO());
  const [cashNote, setCashNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (tab === "expense") {
      const amt = Number(expAmount);
      if (!category) return setError("Please pick a category.");
      if (!Number.isFinite(amt) || amt <= 0) return setError("Enter a valid amount.");
      setSaving(true);
      try {
        await onSubmitExpense({ category, amount: amt, entry_date: expDate });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save.");
        setSaving(false);
      }
    } else {
      const amt = Number(cashAmount);
      if (!Number.isFinite(amt) || amt <= 0) return setError("Enter a valid amount.");
      setSaving(true);
      try {
        await onSubmitCash({
          type: cashType,
          amount: amt,
          entry_date: cashDate,
          note: cashNote.trim() || null,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save.");
        setSaving(false);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="animate-sheet-up w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-300" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Quick Add</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-gray-500">
            Close
          </button>
        </div>

        {/* Expense / Cash tabs */}
        <div className="mb-4 flex rounded-full bg-gray-200 p-1">
          {(["expense", "cash"] as const).map((k) => (
            <button
              key={k}
              onClick={() => {
                setTab(k);
                setError(null);
              }}
              className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize transition ${
                tab === k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              {k === "expense" ? "Expense" : "Cash"}
            </button>
          ))}
        </div>

        {tab === "expense" ? (
          <div>
            <p className="mb-2 text-sm text-gray-500">Category</p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {activeCats.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2 text-center transition active:scale-95 ${
                    category === c.key ? "border-green-600 bg-green-50" : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <span className="text-2xl">{c.emoji}</span>
                  <span className="text-xs font-medium leading-tight">{c.labelEn}</span>
                </button>
              ))}
            </div>

            <label className="mb-1 block text-sm font-medium text-gray-600">Amount</label>
            <div className="mb-4 flex items-center rounded-2xl border-2 border-gray-200 bg-gray-50 px-4">
              <span className="text-2xl font-bold text-gray-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent py-4 pl-2 text-2xl font-bold outline-none"
              />
            </div>

            <label className="mb-1 block text-sm font-medium text-gray-600">Date</label>
            <input
              type="date"
              value={expDate}
              min={minDate ?? undefined}
              onChange={(e) => setExpDate(e.target.value)}
              className="mb-4 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none"
            />
          </div>
        ) : (
          <div>
            <div className="mb-4 grid grid-cols-1 gap-2">
              {([
                { key: "given", label: "Gave cash to helper", emoji: "💰" },
                { key: "collected", label: "Collected cash from helper", emoji: "🔄" },
              ] as const).map((o) => (
                <button
                  key={o.key}
                  onClick={() => setCashType(o.key)}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition active:scale-[0.99] ${
                    cashType === o.key ? "border-emerald-600 bg-emerald-50" : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <span className="text-2xl">{o.emoji}</span>
                  <span className="text-sm font-semibold">{o.label}</span>
                </button>
              ))}
            </div>

            <label className="mb-1 block text-sm font-medium text-gray-600">Amount</label>
            <div className="mb-4 flex items-center rounded-2xl border-2 border-gray-200 bg-gray-50 px-4">
              <span className="text-2xl font-bold text-gray-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent py-4 pl-2 text-2xl font-bold outline-none"
              />
            </div>

            <label className="mb-1 block text-sm font-medium text-gray-600">Date</label>
            <input
              type="date"
              value={cashDate}
              min={minDate ?? undefined}
              onChange={(e) => setCashDate(e.target.value)}
              className="mb-4 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none"
            />

            <label className="mb-1 block text-sm font-medium text-gray-600">Note (optional)</label>
            <input
              type="text"
              value={cashNote}
              onChange={(e) => setCashNote(e.target.value)}
              placeholder="e.g. weekly top-up"
              className="mb-4 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none"
            />
          </div>
        )}

        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-2xl bg-emerald-700 py-4 text-lg font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
