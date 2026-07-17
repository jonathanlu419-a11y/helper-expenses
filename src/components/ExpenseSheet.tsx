"use client";

import { useEffect, useRef, useState } from "react";
import type { Category, CategoryKey } from "@/lib/categories";
import { todayISO } from "@/lib/time";
import type { Expense, ExpenseInput } from "@/lib/types";
import { resizeImageFile } from "@/lib/image";
import { analyzePhoto, visionEnabled } from "@/lib/client";

export type Lang = "id" | "en";

// Temporarily disabled: hides the "Ambil Foto" camera quick-add button (and
// its "atau pilih sendiri:" divider) without touching the underlying vision
// logic. Flip back to true to re-enable.
const CAMERA_QUICK_ADD_ENABLED = false;

// Bottom sheet used on both pages for adding and editing an expense.
// Copy switches on `lang`: "id" (Bahasa Indonesia, worker) or "en" (Mum).
//
// - "add" mode is a 2-step flow: pick a category, then enter the amount.
//   In add mode it also offers a camera option ("Ambil Foto") that uses Gemini
//   vision to PREFILL the category/amount from a receipt or price tag — the
//   helper always reviews and confirms before saving (never auto-submitted).
// - "edit" mode shows everything on one screen, pre-filled.

const STRINGS: Record<Lang, Record<string, string>> = {
  id: {
    addTitle: "Tambah Pengeluaran",
    editTitle: "Ubah Pengeluaran",
    close: "Tutup",
    pickCategory: "Pilih kategori:",
    changeCategory: "Ganti kategori",
    amount: "Jumlah",
    date: "Tanggal",
    save: "Simpan",
    saving: "Menyimpan…",
    errPickCategory: "Pilih kategori dulu.",
    errAmount: "Masukkan jumlah yang benar.",
    errSave: "Gagal menyimpan.",
    takePhoto: "📷 Ambil Foto",
    reading: "Membaca foto…",
    orManual: "atau pilih sendiri:",
    autoFilled: "🤖 Terisi otomatis — mohon periksa",
    photoNeedCategory: "Jumlah terbaca. Sekarang pilih kategori.",
    photoNoRead: "Foto tidak terbaca otomatis. Isi manual ya.",
  },
  en: {
    addTitle: "Add Expense",
    editTitle: "Edit Expense",
    close: "Close",
    pickCategory: "Choose a category:",
    changeCategory: "Change category",
    amount: "Amount",
    date: "Date",
    save: "Save",
    saving: "Saving…",
    errPickCategory: "Please pick a category first.",
    errAmount: "Enter a valid amount.",
    errSave: "Failed to save.",
    takePhoto: "📷 Take Photo",
    reading: "Reading photo…",
    orManual: "or choose manually:",
    autoFilled: "🤖 Auto-filled — please check",
    photoNeedCategory: "Amount read. Now pick a category.",
    photoNoRead: "Couldn't read the photo. Enter it manually.",
  },
};

export default function ExpenseSheet({
  mode,
  lang,
  categories,
  initial,
  onClose,
  onSubmit,
  minDate,
}: {
  mode: "add" | "edit";
  lang: Lang;
  categories: Category[];
  initial?: Expense;
  onClose: () => void;
  onSubmit: (input: ExpenseInput) => Promise<void>;
  minDate?: string | null;
}) {
  const t = STRINGS[lang];
  const catLabel = (c: Category) => (lang === "id" ? c.labelId : c.labelEn);
  const activeCats = categories
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

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

  // Camera Quick Add state
  const [cameraOn, setCameraOn] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Only offer the camera when adding and the vision API is configured.
  useEffect(() => {
    if (mode !== "add") return;
    let alive = true;
    visionEnabled().then((ok) => {
      if (alive) setCameraOn(ok);
    });
    return () => {
      alive = false;
    };
  }, [mode]);

  function pickCategory(key: CategoryKey) {
    setCategory(key);
    setStep(2);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;

    setError(null);
    setPhotoMsg(null);
    setAnalyzing(true);
    try {
      const { data, media_type } = await resizeImageFile(file);
      const r = await analyzePhoto(data, media_type);

      let filled = false;
      if (r.category) {
        setCategory(r.category);
        filled = true;
      }
      if (r.amount != null) {
        setAmount(String(r.amount));
        filled = true;
      }
      setAutoFilled(filled);

      if (r.category) {
        // Category known → go straight to the amount screen for review.
        setStep(2);
      } else if (r.amount != null) {
        // Amount read but category unknown → let her pick a category first.
        setPhotoMsg(t.photoNeedCategory);
      } else {
        setPhotoMsg(t.photoNoRead);
      }
    } catch {
      setPhotoMsg(t.photoNoRead);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    setError(null);
    const amt = Number(amount);
    if (!category) {
      setError(t.errPickCategory);
      setStep(1);
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError(t.errAmount);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ category, amount: amt, entry_date: date });
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errSave);
      setSaving(false);
    }
  }

  const title = mode === "add" ? t.addTitle : t.editTitle;
  const selected = categories.find((c) => c.key === category);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="animate-sheet-up flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header stays pinned so title/close are always visible, even if the
            fields below need to scroll on a short mobile viewport. */}
        <div className="shrink-0 px-5 pt-5">
          {/* grabber */}
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-300" />

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-gray-500"
              aria-label={t.close}
            >
              {t.close}
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 pb-8">
        {/* hidden camera/file input (photo taken or uploaded) */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />

        {/* Step 1: choose a category (with optional camera prefill) */}
        {step === 1 && (
          <div>
            {CAMERA_QUICK_ADD_ENABLED && mode === "add" && cameraOn && (
              <div className="mb-4">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={analyzing}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-base font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
                >
                  {analyzing ? t.reading : t.takePhoto}
                </button>
                {photoMsg && (
                  <p className="mt-2 text-sm font-medium text-amber-700">{photoMsg}</p>
                )}
                <p className="mt-3 text-center text-xs text-gray-400">{t.orManual}</p>
              </div>
            )}

            <p className="mb-3 text-sm text-gray-500">{t.pickCategory}</p>
            <div className="grid grid-cols-2 gap-3">
              {activeCats.map((c) => (
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
                    {catLabel(c)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: amount + date */}
        {step === 2 && category && selected && (
          <div>
            <button
              onClick={() => setStep(1)}
              className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-green-50 p-3 text-left"
            >
              <span className="text-3xl">{selected.emoji}</span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">
                  {catLabel(selected)}
                </span>
                <span className="text-xs text-green-700">{t.changeCategory}</span>
              </span>
              <span className="text-gray-400">›</span>
            </button>

            {autoFilled && (
              <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                {t.autoFilled}
              </div>
            )}

            <label className="mb-1 block text-sm font-medium text-gray-600">
              {t.amount}
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
              {t.date}
            </label>
            <input
              type="date"
              value={date}
              min={minDate ?? undefined}
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
              {saving ? t.saving : t.save}
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
