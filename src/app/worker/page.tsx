"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CATEGORY_MAP } from "@/lib/categories";
import { formatMoney, formatDateShort } from "@/lib/format";
import type { Expense, ExpenseInput } from "@/lib/types";
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/lib/client";
import ExpenseSheet from "@/components/ExpenseSheet";
import Toast, { type ToastState } from "@/components/Toast";

export default function WorkerPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<
    { mode: "add" } | { mode: "edit"; expense: Expense } | null
  >(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      setExpenses(await fetchExpenses());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(input: ExpenseInput) {
    if (sheet?.mode === "edit") {
      const updated = await updateExpense(sheet.expense.id, input);
      setExpenses((prev) =>
        prev
          .map((e) => (e.id === updated.id ? updated : e))
          .sort(sortByDateDesc)
      );
      setToast({ message: "Perubahan tersimpan!", kind: "success" });
    } else {
      const created = await createExpense(input);
      setExpenses((prev) => [created, ...prev].sort(sortByDateDesc));
      setToast({ message: "Tersimpan!", kind: "success" });
    }
    setSheet(null);
  }

  async function handleDelete(exp: Expense) {
    if (!window.confirm("Yakin mau hapus catatan ini?")) return;
    try {
      await deleteExpense(exp.id);
      setExpenses((prev) => prev.filter((e) => e.id !== exp.id));
      setToast({ message: "Dihapus.", kind: "success" });
    } catch (e) {
      setToast({
        message: e instanceof Error ? e.message : "Gagal menghapus.",
        kind: "error",
      });
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md pb-28">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Catatan Belanja</h1>
            <p className="text-xs text-gray-500">Pengeluaran rumah tangga</p>
          </div>
          <Link href="/mum" className="text-xs text-gray-400">
            Dashboard →
          </Link>
        </div>
      </header>

      <section className="px-4 pt-4">
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-400">Memuat…</p>
        ) : loadError ? (
          <div className="py-16 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
            <button
              onClick={load}
              className="mt-3 rounded-full bg-gray-800 px-4 py-2 text-sm text-white"
            >
              Coba lagi
            </button>
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl">🧾</div>
            <p className="mt-3 text-sm text-gray-500">
              Belum ada catatan.
              <br />
              Tekan tombol{" "}
              <span className="font-bold text-green-600">+</span> untuk menambah.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="px-3 py-2 font-medium">Tanggal</th>
                  <th className="px-3 py-2 font-medium">Kategori</th>
                  <th className="px-3 py-2 text-right font-medium">Jumlah</th>
                  <th className="px-1 py-2" />
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const cat = CATEGORY_MAP[exp.category];
                  return (
                    <tr
                      key={exp.id}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td
                        className="cursor-pointer px-3 py-3 text-gray-500"
                        onClick={() => setSheet({ mode: "edit", expense: exp })}
                      >
                        {formatDateShort(exp.entry_date, "id-ID")}
                      </td>
                      <td
                        className="cursor-pointer px-3 py-3"
                        onClick={() => setSheet({ mode: "edit", expense: exp })}
                      >
                        <span className="mr-1">{cat?.emoji}</span>
                        <span className="text-gray-700">{cat?.labelId}</span>
                      </td>
                      <td
                        className="cursor-pointer px-3 py-3 text-right font-semibold"
                        onClick={() => setSheet({ mode: "edit", expense: exp })}
                      >
                        {formatMoney(exp.amount)}
                      </td>
                      <td className="px-1 py-3 text-right">
                        <button
                          onClick={() => handleDelete(exp)}
                          className="rounded-full px-2 py-1 text-gray-300 hover:text-red-500"
                          aria-label="Hapus"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Floating Quick-Add button */}
      <button
        onClick={() => setSheet({ mode: "add" })}
        className="fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-4xl font-light text-white shadow-lg transition active:scale-90"
        aria-label="Tambah pengeluaran"
      >
        +
      </button>

      {sheet && (
        <ExpenseSheet
          mode={sheet.mode}
          initial={sheet.mode === "edit" ? sheet.expense : undefined}
          onClose={() => setSheet(null)}
          onSubmit={handleSubmit}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}

function sortByDateDesc(a: Expense, b: Expense): number {
  if (a.entry_date !== b.entry_date) {
    return a.entry_date < b.entry_date ? 1 : -1;
  }
  return b.created_at < a.created_at ? -1 : 1;
}
