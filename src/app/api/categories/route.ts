import { NextResponse } from "next/server";
import {
  query,
  CATEGORY_COLUMNS,
  BIG_CATEGORY_COLUMNS,
  mapCategoryRow,
  mapBigCategoryRow,
} from "@/lib/db";

export const dynamic = "force-dynamic";

// Build a unique key from a label (e.g. "Pet Supplies" → "pet_supplies").
function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "cat"
  );
}

async function uniqueKey(table: string, base: string): Promise<string> {
  const { rows } = await query(`SELECT key FROM ${table}`);
  const taken = new Set(rows.map((r) => String(r.key)));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const k = `${base}_${i}`;
    if (!taken.has(k)) return k;
  }
  return `${base}_${Date.now()}`;
}

// GET /api/categories — all categories + big categories (active and inactive).
export async function GET() {
  try {
    const [cats, bigs] = await Promise.all([
      query(`SELECT ${CATEGORY_COLUMNS} FROM categories ORDER BY sort_order, key`),
      query(`SELECT ${BIG_CATEGORY_COLUMNS} FROM big_categories ORDER BY sort_order, key`),
    ]);
    return NextResponse.json({
      categories: cats.rows.map(mapCategoryRow),
      bigCategories: bigs.rows.map(mapBigCategoryRow),
    });
  } catch (err) {
    console.error("GET /api/categories failed:", err);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}

// POST /api/categories — create a category.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { emoji, label_en, label_id, big_category } = (body ?? {}) as Record<string, unknown>;

  if (typeof label_en !== "string" || label_en.trim() === "") {
    return NextResponse.json({ error: "English label is required" }, { status: 400 });
  }
  if (typeof big_category !== "string" || big_category.trim() === "") {
    return NextResponse.json({ error: "Big category is required" }, { status: 400 });
  }

  try {
    const big = await query(`SELECT 1 FROM big_categories WHERE key = $1`, [big_category]);
    if (big.rowCount === 0) {
      return NextResponse.json({ error: "Unknown big category" }, { status: 400 });
    }

    const key = await uniqueKey("categories", slugify(label_en));
    const nextOrder = await query(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM categories`);
    const sortOrder = Number(nextOrder.rows[0].n);

    const { rows } = await query(
      `INSERT INTO categories (key, emoji, label_id, label_en, big_category, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${CATEGORY_COLUMNS}`,
      [
        key,
        typeof emoji === "string" && emoji.trim() !== "" ? emoji.trim() : "🧾",
        typeof label_id === "string" ? label_id.trim() : "",
        label_en.trim(),
        big_category,
        sortOrder,
      ]
    );
    return NextResponse.json(mapCategoryRow(rows[0]), { status: 201 });
  } catch (err) {
    console.error("POST /api/categories failed:", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
