"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import { useLedger } from "@/lib/useLedger";
import MumTabs from "@/components/MumTabs";
import ManageCategories from "@/components/ManageCategories";
import Toast, { type ToastState } from "@/components/Toast";

// Shared Settings dashboard, mounted at both /mum (public) and /admin
// (password-gated) — see MumTabs for the basePath convention.
export default function MumSettingsView({ basePath }: { basePath: string }) {
  const {
    settings,
    balance,
    categories,
    bigCategories,
    reloadCategories,
    loading,
    error,
    saveSettings,
    reset,
  } = useLedger();
  const [opening, setOpening] = useState("");
  const [firstDate, setFirstDate] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (settings && !initialized) {
      setOpening(String(settings.opening_balance));
      setFirstDate(settings.first_activity_date ?? "");
      setInitialized(true);
    }
  }, [settings, initialized]);

  async function handleSave() {
    const ob = Number(opening);
    if (!Number.isFinite(ob)) {
      setToast({ message: "Opening balance must be a number.", kind: "error" });
      return;
    }
    setSavingSettings(true);
    try {
      await saveSettings({
        opening_balance: ob,
        first_activity_date: firstDate || null,
      });
      setToast({ message: "Settings saved.", kind: "success" });
    } catch (e) {
      setToast({
        message: e instanceof Error ? e.message : "Failed to save.",
        kind: "error",
      });
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleClear() {
    if (
      !window.confirm(
        "This permanently deletes ALL expense entries and cash transactions. Your settings (opening balance, first day) are kept. Continue?"
      )
    )
      return;
    if (!window.confirm("Are you absolutely sure? This cannot be undone.")) return;
    setClearing(true);
    try {
      await reset();
      setToast({ message: "All data cleared.", kind: "success" });
    } catch (e) {
      setToast({
        message: e instanceof Error ? e.message : "Failed to clear data.",
        kind: "error",
      });
    } finally {
      setClearing(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 mb-4 border-b border-gray-100 bg-gray-50/90 px-4 py-4 backdrop-blur">
        <h1 className="text-xl font-bold">Settings</h1>
        <MumTabs active="settings" basePath={basePath} />
      </header>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
      ) : error ? (
        <p className="py-16 text-center text-sm text-red-600">{error}</p>
      ) : (
        <div className="space-y-6">
          {/* Current balance preview (reflects opening-balance changes on save) */}
          <div className="rounded-2xl bg-slate-800 p-4 text-white">
            <div className="text-xs uppercase tracking-wide text-slate-300">
              Current balance held by helper
            </div>
            <div className="mt-1 text-2xl font-bold">{formatMoney(balance)}</div>
          </div>

          {/* Opening balance */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800">Opening balance</h2>
            <p className="mb-3 mt-1 text-xs text-gray-500">
              The starting cash float, before any logged cash or expenses.
            </p>
            <div className="flex items-center rounded-2xl border-2 border-gray-200 bg-gray-50 px-4">
              <span className="text-xl font-bold text-gray-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent py-3 pl-2 text-xl font-bold outline-none"
              />
            </div>
          </section>

          {/* First day of activity */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800">First day of activity</h2>
            <p className="mb-3 mt-1 text-xs text-gray-500">
              Mark when real use begins. The calendar won&apos;t page to months
              before this, and date pickers won&apos;t allow earlier dates.
              Leave blank for no limit.
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={firstDate}
                onChange={(e) => setFirstDate(e.target.value)}
                className="flex-1 rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none"
              />
              {firstDate && (
                <button
                  onClick={() => setFirstDate("")}
                  className="rounded-2xl border-2 border-gray-200 px-4 text-sm text-gray-500"
                >
                  Clear
                </button>
              )}
            </div>
          </section>

          <button
            onClick={handleSave}
            disabled={savingSettings}
            className="w-full rounded-2xl bg-emerald-700 py-4 text-lg font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
          >
            {savingSettings ? "Saving…" : "Save settings"}
          </button>

          {/* Manage categories + big categories */}
          <ManageCategories
            categories={categories}
            bigCategories={bigCategories}
            reload={reloadCategories}
            onToast={(message, kind) => setToast({ message, kind })}
          />

          {/* Danger zone */}
          <section className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
            <h2 className="text-sm font-semibold text-red-800">Reset for real use</h2>
            <p className="mb-3 mt-1 text-xs text-red-700">
              Deletes every expense entry and cash transaction so you can hand a
              clean app to the helper. Opening balance and first-day settings are
              kept, so the balance resets to just the opening balance.
            </p>
            <button
              onClick={handleClear}
              disabled={clearing}
              className="w-full rounded-2xl bg-red-600 py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
            >
              {clearing ? "Clearing…" : "Clear all data"}
            </button>
          </section>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
