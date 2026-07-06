import { NextResponse } from "next/server";
import { query, CATEGORY_COLUMNS, mapCategoryRow } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH /api/categories/:key — update emoji / labels / big_category / order / active.
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
  const { emoji, label_en, label_id, big_category, sort_order, is_active } = (body ??
    {}) as Record<string, unknown>;

  // Validate provided fields.
  if (
    big_category !== undefined &&
    (typeof big_category !== "string" || big_category.trim() === "")
  ) {
    return NextResponse.json({ error: "Invalid big category" }, { status: 400 });
  }
  if (big_category !== undefined) {
    const big = await query(`SELECT 1 FROM big_categories WHERE key = $1`, [big_category]);
    if (big.rowCount === 0) {
      return NextResponse.json({ error: "Unknown big category" }, { status: 400 });
    }
  }

  const emojiVal = typeof emoji === "string" && emoji.trim() !== "" ? emoji.trim() : null;
  const labelEnVal =
    typeof label_en === "string" && label_en.trim() !== "" ? label_en.trim() : null;
  const labelIdProvided = label_id !== undefined;
  const labelIdVal = typeof label_id === "string" ? label_id.trim() : "";
  const bigVal = typeof big_category === "string" ? big_category : null;
  const sortVal = typeof sort_order === "number" ? sort_order : null;
  const activeProvided = is_active !== undefined;
  const activeVal = Boolean(is_active);

  try {
    const { rows } = await query(
      `UPDATE categories SET
         emoji        = COALESCE($2, emoji),
         label_en     = COALESCE($3, label_en),
         label_id     = CASE WHEN $4::boolean THEN $5 ELSE label_id END,
         big_category = COALESCE($6, big_category),
         sort_order   = COALESCE($7, sort_order),
         is_active    = CASE WHEN $8::boolean THEN $9 ELSE is_active END
       WHERE key = $1
       RETURNING ${CATEGORY_COLUMNS}`,
      [key, emojiVal, labelEnVal, labelIdProvided, labelIdVal, bigVal, sortVal, activeProvided, activeVal]
    );
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(mapCategoryRow(rows[0]));
  } catch (err) {
    console.error("PATCH /api/categories/[id] failed:", err);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

// DELETE /api/categories/:key
// - If any expenses reference it → soft-delete (hide from Quick Add, keep history).
// - If none → hard-delete the row.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const key = params.id;
  try {
    const used = await query(`SELECT 1 FROM expenses WHERE category = $1 LIMIT 1`, [key]);
    if (used.rowCount && used.rowCount > 0) {
      const { rows } = await query(
        `UPDATE categories SET is_active = false WHERE key = $1 RETURNING ${CATEGORY_COLUMNS}`,
        [key]
      );
      if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ softDeleted: true, category: mapCategoryRow(rows[0]) });
    }
    const del = await query(`DELETE FROM categories WHERE key = $1`, [key]);
    if (!del.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/categories/[id] failed:", err);
    return NextResponse.json({ error: "Failed to remove category" }, { status: 500 });
  }
}
