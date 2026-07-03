import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/reset — destructive: delete ALL expenses and cash transactions.
// Settings (opening_balance, first_activity_date) are intentionally preserved,
// so after a reset the balance equals just the opening_balance.
export async function POST() {
  try {
    await query(`DELETE FROM expenses`);
    await query(`DELETE FROM cash_transactions`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/reset failed:", err);
    return NextResponse.json({ error: "Failed to clear data" }, { status: 500 });
  }
}
