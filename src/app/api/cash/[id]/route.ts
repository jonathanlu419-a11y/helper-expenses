import { NextResponse } from "next/server";
import { query, mapCashRow } from "@/lib/db";

export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PATCH /api/cash/:id — update type / amount / entry_date / note.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { type, amount, entry_date, note } = (body ?? {}) as Record<string, unknown>;

  let typeVal: string | null = null;
  if (type !== undefined) {
    if (type !== "given" && type !== "collected") {
      return NextResponse.json({ error: "type must be 'given' or 'collected'" }, { status: 400 });
    }
    typeVal = type;
  }

  let amountVal: number | null = null;
  if (amount !== undefined) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }
    amountVal = amt;
  }

  let dateVal: string | null = null;
  if (entry_date !== undefined) {
    if (typeof entry_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry_date)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    dateVal = entry_date;
  }

  const noteProvided = note !== undefined;
  const noteVal = typeof note === "string" && note.trim() !== "" ? note.trim() : null;

  try {
    const { rows } = await query(
      `UPDATE cash_transactions SET
         type       = COALESCE($2, type),
         amount     = COALESCE($3, amount),
         entry_date = COALESCE($4::date, entry_date),
         note       = CASE WHEN $5::boolean THEN $6 ELSE note END
       WHERE id = $1
       RETURNING id, type, amount,
                 to_char(entry_date, 'YYYY-MM-DD') AS entry_date, note, created_at`,
      [id, typeVal, amountVal, dateVal, noteProvided, noteVal]
    );
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(mapCashRow(rows[0]));
  } catch (err) {
    console.error("PATCH /api/cash/[id] failed:", err);
    return NextResponse.json({ error: "Failed to update cash transaction" }, { status: 500 });
  }
}

// DELETE /api/cash/:id
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = parseId(params.id);
  if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const { rowCount } = await query(`DELETE FROM cash_transactions WHERE id = $1`, [id]);
    if (!rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/cash/[id] failed:", err);
    return NextResponse.json({ error: "Failed to delete cash transaction" }, { status: 500 });
  }
}
