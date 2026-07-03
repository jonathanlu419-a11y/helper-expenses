"use client";

import { useState } from "react";
import type { Expense, ExpenseInput } from "@/lib/types";
import { useLedger } from "@/lib/useLedger";
import ExpenseSheet from "@/components/ExpenseSheet";
import Toast, { type ToastState } from "@/components/Toast";
import BalanceCard from "@/components/BalanceCard";
import DayGroupedEntries from "@/components/DayGroupedEntries";

export default function WorkerPage() {
  const {
    expenses,
    cash,
    settings,
    balance,
    loading,
    error,
    reload,
    addExpense,
    editExpense,
    removeExpense,
  } = useLedger();
  const [sheet, setSheet] = useState<
    { mode: "add" } | { mode: "edit"; expense: Expense } | null
  >(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  async function handleSubmit(input: ExpenseInput) {
    if (sheet?.mode === "edit") {
      await editExpense(sheet.expense.id, input);
      setToast({ message: "Perubahan tersimpan!", kind: "success" });
    } else {
      await addExpense(input);
      setToast({ message: "Tersimpan!", kind: "success" });
    }
    setSheet(null);
  }

  async function handleDelete(exp: Expense) {
    if (!window.confirm("Yakin mau hapus catatan ini?")) return;
    try {
      await removeExpense(exp.id);
      setToast({ message: "Dihapus.", kind: "success" });
    } catch (e) {
      setToast({
        message: e instanceof Error ? e.message : "Gagal menghapus.",
        kind: "error",
      });
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-28">
      <header className="sticky top-0 z-30 -mx-4 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold">Catatan Belanja</h1>
        <p className="text-xs text-gray-500">Pengeluaran rumah tangga</p>
      </header>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">Memuat…</p>
      ) : error ? (
        <div className="py-16 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={reload}
            className="mt-3 rounded-full bg-gray-800 px-4 py-2 text-sm text-white"
          >
            Coba lagi
          </button>
        </div>
      ) : (
        <>
          {/* Balance (read-only for the helper) */}
          <div className="pt-4">
            <BalanceCard balance={balance} lang="id" />
          </div>

          {/* Entries grouped by day */}
          <div className="pt-4">
            {expenses.length === 0 && cash.length === 0 ? (
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
              <DayGroupedEntries
                expenses={expenses}
                cash={cash}
                lang="id"
                onEdit={(e) => setSheet({ mode: "edit", expense: e })}
                onDelete={handleDelete}
              />
            )}
          </div>
        </>
      )}

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
          lang="id"
          initial={sheet.mode === "edit" ? sheet.expense : undefined}
          minDate={settings?.first_activity_date}
          onClose={() => setSheet(null)}
          onSubmit={handleSubmit}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
