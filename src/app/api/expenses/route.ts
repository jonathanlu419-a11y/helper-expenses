import { NextResponse } from "next/server";
import { getSql, EXPENSE_COLUMNS, mapExpenseRow } from "@/lib/db";
import { isCategoryKey } from "@/lib/categories";

export const dynamic = "force-dynamic";

// GET /api/expenses — all entries, newest first.
export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql.query(
      `SELECT ${EXPENSE_COLUMNS} FROM expenses ORDER BY entry_date DESC, created_at DESC`
    );
    return NextResponse.json(rows.map(mapExpenseRow));
  } catch (err) {
    console.error("GET /api/expenses failed:", err);
    return NextResponse.json({ error: "Failed to load expenses" }, { status: 500 });
  }
}

// POST /api/expenses — create one entry.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { category, amount, entry_date, note } = (body ?? {}) as Record<string, unknown>;

  if (!isCategoryKey(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
  }

  const dateStr =
    typeof entry_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry_date)
      ? entry_date
      : null;

  const noteStr = typeof note === "string" && note.trim() !== "" ? note.trim() : null;

  try {
    const sql = getSql();
    const rows = await sql`
      INSERT INTO expenses (category, amount, entry_date, note)
      VALUES (
        ${category},
        ${amt},
        COALESCE(${dateStr}::date, CURRENT_DATE),
        ${noteStr}
      )
      RETURNING
        id, category, amount,
        to_char(entry_date, 'YYYY-MM-DD') AS entry_date,
        note, created_at
    `;
    return NextResponse.json(mapExpenseRow(rows[0]), { status: 201 });
  } catch (err) {
    console.error("POST /api/expenses failed:", err);
    return NextResponse.json({ error: "Failed to save expense" }, { status: 500 });
  }
}
