import { NextResponse } from "next/server";
import { query, BIG_CATEGORY_COLUMNS, mapBigCategoryRow } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH /api/big-categories/:key — rename / reorder / activate.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const key = params.id;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { label_en, label_id, sort_order, is_active } = (body ?? {}) as Record<string, unknown>;

  const labelEnVal =
    typeof label_en === "string" && label_en.trim() !== "" ? label_en.trim() : null;
  const labelIdProvided = label_id !== undefined;
  const labelIdVal = typeof label_id === "string" ? label_id.trim() : "";
  const sortVal = typeof sort_order === "number" ? sort_order : null;
  const activeProvided = is_active !== undefined;
  const activeVal = Boolean(is_active);

  try {
    const { rows } = await query(
      `UPDATE big_categories SET
         label_en   = COALESCE($2, label_en),
         label_id   = CASE WHEN $3::boolean THEN $4 ELSE label_id END,
         sort_order = COALESCE($5, sort_order),
         is_active  = CASE WHEN $6::boolean THEN $7 ELSE is_active END
       WHERE key = $1
       RETURNING ${BIG_CATEGORY_COLUMNS}`,
      [key, labelEnVal, labelIdProvided, labelIdVal, sortVal, activeProvided, activeVal]
    );
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(mapBigCategoryRow(rows[0]));
  } catch (err) {
    console.error("PATCH /api/big-categories/[id] failed:", err);
    return NextResponse.json({ error: "Failed to update big category" }, { status: 500 });
  }
}

// DELETE /api/big-categories/:key[?reassign_to=<key>]
// - The fallback big category can never be deleted.
// - If categories are still assigned and no reassign target is given → 409.
// - With reassign_to, its categories are moved there first, then it's deleted.
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const key = params.id;
  const reassignTo = new URL(req.url).searchParams.get("reassign_to");

  try {
    const cur = await query(
      `SELECT is_fallback FROM big_categories WHERE key = $1`,
      [key]
    );
    if (cur.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (cur.rows[0].is_fallback) {
      return NextResponse.json({ error: "The fallback big category cannot be deleted" }, { status: 403 });
    }

    const assigned = await query(
      `SELECT count(*)::int AS n FROM categories WHERE big_category = $1`,
      [key]
    );
    const count = Number(assigned.rows[0].n);

    if (count > 0) {
      if (!reassignTo) {
        return NextResponse.json(
          { error: "Categories are still assigned", needsReassign: true, count },
          { status: 409 }
        );
      }
      if (reassignTo === key) {
        return NextResponse.json({ error: "Cannot reassign to itself" }, { status: 400 });
      }
      const target = await query(`SELECT 1 FROM big_categories WHERE key = $1`, [reassignTo]);
      if (target.rowCount === 0) {
        return NextResponse.json({ error: "Unknown reassign target" }, { status: 400 });
      }
      await query(`UPDATE categories SET big_category = $1 WHERE big_category = $2`, [reassignTo, key]);
    }

    await query(`DELETE FROM big_categories WHERE key = $1`, [key]);
    return NextResponse.json({ deleted: true, reassigned: count });
  } catch (err) {
    console.error("DELETE /api/big-categories/[id] failed:", err);
    return NextResponse.json({ error: "Failed to delete big category" }, { status: 500 });
  }
}
