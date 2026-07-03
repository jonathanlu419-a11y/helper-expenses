"use client";

import { useState } from "react";
import { todayISO } from "@/lib/time";
import type { CashInput, CashType } from "@/lib/types";

// Mum-only bottom sheet to log a cash transaction (given / collected).
// English copy. The helper's page never renders this.

export default function CashSheet({
  onClose,
  onSubmit,
  minDate,
}: {
  onClose: () => void;
  onSubmit: (input: CashInput) => Promise<void>;
  minDate?: string | null;
}) {
  const [type, setType] = useState<CashType>("given");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        type,
        amount: amt,
        entry_date: date,
        note: note.trim() || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
      setSaving(false);
    }
  }

  const options: { key: CashType; label: string; emoji: string }[] = [
    { key: "given", label: "Gave cash to helper", emoji: "➡️" },
    { key: "collected", label: "Collected cash from helper", emoji: "⬅️" },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-300" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Log Cash</h2>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-gray-500"
          >
            Close
          </button>
        </div>

        {/* Type */}
        <div className="mb-4 grid grid-cols-1 gap-2">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => setType(o.key)}
              className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition active:scale-[0.99] ${
                type === o.key
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <span className="text-2xl">{o.emoji}</span>
              <span className="text-sm font-semibold">{o.label}</span>
            </button>
          ))}
        </div>

        {/* Amount */}
        <label className="mb-1 block text-sm font-medium text-gray-600">Amount</label>
        <div className="mb-4 flex items-center rounded-2xl border-2 border-gray-200 bg-gray-50 px-4">
          <span className="text-2xl font-bold text-gray-400">$</span>
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-transparent py-4 pl-2 text-2xl font-bold outline-none"
          />
        </div>

        {/* Date */}
        <label className="mb-1 block text-sm font-medium text-gray-600">Date</label>
        <input
          type="date"
          value={date}
          min={minDate ?? undefined}
          onChange={(e) => setDate(e.target.value)}
          className="mb-4 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none"
        />

        {/* Note (optional) */}
        <label className="mb-1 block text-sm font-medium text-gray-600">
          Note (optional)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. weekly top-up"
          className="mb-4 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none"
        />

        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-emerald-700 py-4 text-lg font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
