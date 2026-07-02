import { NextResponse } from "next/server";
import { query, mapExpenseRow } from "@/lib/db";
import { isCategoryKey } from "@/lib/categories";

export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// PATCH /api/expenses/:id — update category / amount / entry_date / note.
// Any omitted field keeps its current value.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = parseId(params.id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { category, amount, entry_date, note } = (body ?? {}) as Record<string, unknown>;

  // Validate only the fields that were actually provided.
  let categoryVal: string | null = null;
  if (category !== undefined) {
    if (!isCategoryKey(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    categoryVal = category;
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

  // note can be explicitly cleared to null; only touch it when provided.
  const noteProvided = note !== undefined;
  const noteVal =
    typeof note === "string" && note.trim() !== "" ? note.trim() : null;

  try {
    const { rows } = await query(
      `UPDATE expenses SET
         category   = COALESCE($2, category),
         amount     = COALESCE($3, amount),
         entry_date = COALESCE($4::date, entry_date),
         note       = CASE WHEN $5::boolean THEN $6 ELSE note END
       WHERE id = $1
       RETURNING id, category, amount,
                 to_char(entry_date, 'YYYY-MM-DD') AS entry_date, note, created_at`,
      [id, categoryVal, amountVal, dateVal, noteProvided, noteVal]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(mapExpenseRow(rows[0]));
  } catch (err) {
    console.error("PATCH /api/expenses/[id] failed:", err);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

// DELETE /api/expenses/:id
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = parseId(params.id);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const { rowCount } = await query(`DELETE FROM expenses WHERE id = $1`, [id]);
    if (!rowCount) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/expenses/[id] failed:", err);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
