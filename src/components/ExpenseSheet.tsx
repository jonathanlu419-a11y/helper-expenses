"use client";

import { useState } from "react";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { todayISO } from "@/lib/format";
import type { Expense, ExpenseInput } from "@/lib/types";

// Bottom sheet used on the worker page for both adding and editing an expense.
// All copy is in Bahasa Indonesia.
//
// - "add" mode is a 2-step flow: pick a category, then enter the amount.
// - "edit" mode shows everything on one screen, pre-filled.

export default function ExpenseSheet({
  mode,
  initial,
  onClose,
  onSubmit,
}: {
  mode: "add" | "edit";
  initial?: Expense;
  onClose: () => void;
  onSubmit: (input: ExpenseInput) => Promise<void>;
}) {
  const [category, setCategory] = useState<CategoryKey | null>(
    initial?.category ?? null
  );
  const [amount, setAmount] = useState<string>(
    initial ? String(initial.amount) : ""
  );
  const [date, setDate] = useState<string>(initial?.entry_date ?? todayISO());
  const [step, setStep] = useState<1 | 2>(mode === "edit" ? 2 : 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickCategory(key: CategoryKey) {
    setCategory(key);
    setStep(2);
  }

  async function handleSave() {
    setError(null);
    const amt = Number(amount);
    if (!category) {
      setError("Pilih kategori dulu.");
      setStep(1);
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Masukkan jumlah yang benar.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ category, amount: amt, entry_date: date });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
      setSaving(false);
    }
  }

  const title = mode === "add" ? "Tambah Pengeluaran" : "Ubah Pengeluaran";

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* grabber */}
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-300" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-gray-500"
            aria-label="Tutup"
          >
            Tutup
          </button>
        </div>

        {/* Step 1: choose a category */}
        {step === 1 && (
          <div>
            <p className="mb-3 text-sm text-gray-500">Pilih kategori:</p>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => pickCategory(c.key)}
                  className={`flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-2xl border-2 p-3 text-center transition active:scale-95 ${
                    category === c.key
                      ? "border-green-600 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <span className="text-3xl">{c.emoji}</span>
                  <span className="text-xs font-medium leading-tight">
                    {c.labelId}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: amount + date */}
        {step === 2 && category && (
          <div>
            <button
              onClick={() => setStep(1)}
              className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-green-50 p-3 text-left"
            >
              <span className="text-3xl">
                {CATEGORIES.find((c) => c.key === category)?.emoji}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">
                  {CATEGORIES.find((c) => c.key === category)?.labelId}
                </span>
                <span className="text-xs text-green-700">Ganti kategori</span>
              </span>
              <span className="text-gray-400">›</span>
            </button>

            <label className="mb-1 block text-sm font-medium text-gray-600">
              Jumlah
            </label>
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

            <label className="mb-1 block text-sm font-medium text-gray-600">
              Tanggal
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mb-4 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none"
            />

            {error && (
              <p className="mb-3 text-sm font-medium text-red-600">{error}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-2xl bg-green-600 py-4 text-lg font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
