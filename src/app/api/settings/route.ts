import { NextResponse } from "next/server";
import { query, mapSettingsRow } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/settings — the single settings row.
export async function GET() {
  try {
    const { rows } = await query(
      `SELECT opening_balance, to_char(first_activity_date, 'YYYY-MM-DD') AS first_activity_date
       FROM settings WHERE id = 1`
    );
    if (rows.length === 0) {
      // Fallback default if the row somehow doesn't exist yet.
      return NextResponse.json({ opening_balance: 0, first_activity_date: null });
    }
    return NextResponse.json(mapSettingsRow(rows[0]));
  } catch (err) {
    console.error("GET /api/settings failed:", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

// PUT /api/settings — update opening_balance and/or first_activity_date.
export async function PUT(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { opening_balance, first_activity_date } = (body ?? {}) as Record<string, unknown>;

  let openingVal: number | null = null;
  if (opening_balance !== undefined) {
    const n = Number(opening_balance);
    if (!Number.isFinite(n)) {
      return NextResponse.json({ error: "opening_balance must be a number" }, { status: 400 });
    }
    openingVal = n;
  }

  // first_activity_date may be set to a date, or explicitly cleared with null.
  const dateProvided = first_activity_date !== undefined;
  let dateVal: string | null = null;
  if (dateProvided && first_activity_date !== null) {
    if (
      typeof first_activity_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(first_activity_date)
    ) {
      return NextResponse.json({ error: "Invalid first_activity_date" }, { status: 400 });
    }
    dateVal = first_activity_date;
  }

  try {
    const { rows } = await query(
      `UPDATE settings SET
         opening_balance     = COALESCE($1, opening_balance),
         first_activity_date = CASE WHEN $2::boolean THEN $3::date ELSE first_activity_date END,
         updated_at          = now()
       WHERE id = 1
       RETURNING opening_balance, to_char(first_activity_date, 'YYYY-MM-DD') AS first_activity_date`,
      [openingVal, dateProvided, dateVal]
    );
    return NextResponse.json(mapSettingsRow(rows[0]));
  } catch (err) {
    console.error("PUT /api/settings failed:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
