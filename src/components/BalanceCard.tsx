"use client";

import { formatMoney } from "@/lib/format";
import type { Lang } from "./ExpenseSheet";

// Running cash-float balance. Positive = the helper is holding Mum's money.
//
// The wording is deliberately explicit about direction so it can't be
// misread (we've had debit/credit-direction bugs before).

export default function BalanceCard({
  balance,
  lang,
}: {
  balance: number;
  lang: Lang;
}) {
  const positive = balance >= 0;

  const copy =
    lang === "id"
      ? {
          title: "Uang Mum yang kamu pegang",
          hintPos: "Ini uang Mum yang masih kamu pegang.",
          hintNeg: "Kamu menombok — Mum berhutang ke kamu sebesar ini.",
        }
      : {
          title: "Cash held by helper",
          hintPos: "Positive = the helper is holding Mum's money.",
          hintNeg: "Negative = the helper is out of pocket; Mum owes this back.",
        };

  return (
    <div
      className={`rounded-2xl p-5 text-white shadow-sm ${
        positive ? "bg-emerald-700" : "bg-rose-700"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-white/70">
        {copy.title}
      </div>
      <div className="mt-1 text-3xl font-bold">
        {positive ? "" : "−"}
        {formatMoney(Math.abs(balance))}
      </div>
      <div className="mt-1 text-xs text-white/70">
        {positive ? copy.hintPos : copy.hintNeg}
      </div>
    </div>
  );
}
