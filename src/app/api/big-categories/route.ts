import { NextResponse } from "next/server";
import { query, BIG_CATEGORY_COLUMNS, mapBigCategoryRow } from "@/lib/db";

export const dynamic = "force-dynamic";

function slugify(label: string): string {
  return (
    label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) ||
    "big"
  );
}

async function uniqueKey(base: string): Promise<string> {
  const { rows } = await query(`SELECT key FROM big_categories`);
  const taken = new Set(rows.map((r) => String(r.key)));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) if (!taken.has(`${base}_${i}`)) return `${base}_${i}`;
  return `${base}_${Date.now()}`;
}

// POST /api/big-categories — create a big category.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { label_en, label_id } = (body ?? {}) as Record<string, unknown>;
  if (typeof label_en !== "string" || label_en.trim() === "") {
    return NextResponse.json({ error: "English label is required" }, { status: 400 });
  }

  try {
    const key = await uniqueKey(slugify(label_en));
    // Slot new big categories after the last non-fallback one (fallback stays last).
    const nextOrder = await query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM big_categories WHERE is_fallback = false`
    );
    const { rows } = await query(
      `INSERT INTO big_categories (key, label_en, label_id, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING ${BIG_CATEGORY_COLUMNS}`,
      [key, label_en.trim(), typeof label_id === "string" ? label_id.trim() : "", Number(nextOrder.rows[0].n)]
    );
    return NextResponse.json(mapBigCategoryRow(rows[0]), { status: 201 });
  } catch (err) {
    console.error("POST /api/big-categories failed:", err);
    return NextResponse.json({ error: "Failed to create big category" }, { status: 500 });
  }
}
