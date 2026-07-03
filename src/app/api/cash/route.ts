import { NextResponse } from "next/server";
import { query, CASH_COLUMNS, mapCashRow } from "@/lib/db";
import { todayISO } from "@/lib/time";

export const dynamic = "force-dynamic";

// GET /api/cash — all cash transactions, newest first.
export async function GET() {
  try {
    const { rows } = await query(
      `SELECT ${CASH_COLUMNS} FROM cash_transactions ORDER BY entry_date DESC, created_at DESC`
    );
    return NextResponse.json(rows.map(mapCashRow));
  } catch (err) {
    console.error("GET /api/cash failed:", err);
    return NextResponse.json({ error: "Failed to load cash transactions" }, { status: 500 });
  }
}

// POST /api/cash — create a cash transaction.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { type, amount, entry_date, note } = (body ?? {}) as Record<string, unknown>;

  if (type !== "given" && type !== "collected") {
    return NextResponse.json({ error: "type must be 'given' or 'collected'" }, { status: 400 });
  }

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
  }

  const dateStr =
    typeof entry_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry_date)
      ? entry_date
      : todayISO();

  const noteStr = typeof note === "string" && note.trim() !== "" ? note.trim() : null;

  try {
    const { rows } = await query(
      `INSERT INTO cash_transactions (type, amount, entry_date, note)
       VALUES ($1, $2, $3::date, $4)
       RETURNING id, type, amount,
                 to_char(entry_date, 'YYYY-MM-DD') AS entry_date, note, created_at`,
      [type, amt, dateStr, noteStr]
    );
    return NextResponse.json(mapCashRow(rows[0]), { status: 201 });
  } catch (err) {
    console.error("POST /api/cash failed:", err);
    return NextResponse.json({ error: "Failed to save cash transaction" }, { status: 500 });
  }
}
