import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // vision calls can take a few seconds

// Per the claude-api reference: default to claude-opus-4-8 unless a model is
// explicitly chosen. Vision + base64 image input, JSON-only prompt, parsed
// defensively so an unreadable photo falls back to blank rather than erroring.
// The category list is read from the DB so it always matches Mum's categories.
const MODEL = "claude-opus-4-8";

const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const SYSTEM =
  "You extract a single household expense from a photo (a shop receipt, or a " +
  "price-tagged food/market item) for a home expense tracker. Respond with " +
  "ONLY a JSON object — no preamble, no markdown, no code fences.";

interface VisionResult {
  amount: number | null;
  category: string | null;
  note: string | null;
  unavailable?: boolean;
}

function blank(unavailable = false): VisionResult {
  return { amount: null, category: null, note: null, unavailable };
}

function parseVision(text: string, validKeys: Set<string>): VisionResult {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return blank();
    const obj = JSON.parse(match[0]) as Record<string, unknown>;
    const amt = obj.amount;
    const amount =
      typeof amt === "number" && Number.isFinite(amt) && amt > 0 ? amt : null;
    const category =
      typeof obj.category === "string" && validKeys.has(obj.category) ? obj.category : null;
    const note = typeof obj.confidence_note === "string" ? obj.confidence_note : null;
    return { amount, category, note };
  } catch {
    return blank();
  }
}

// GET → is the feature configured? (used to show/hide the camera button)
export async function GET() {
  return NextResponse.json({ enabled: Boolean(process.env.ANTHROPIC_API_KEY) });
}

// POST { image: base64, media_type } → { amount, category, note }
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json(blank(true));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(blank(), { status: 200 });
  }

  const { image, media_type } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof image !== "string" ||
    image.length === 0 ||
    typeof media_type !== "string" ||
    !ALLOWED_MEDIA.has(media_type)
  ) {
    return NextResponse.json(blank(), { status: 200 });
  }

  try {
    // Build the category choices from the live (active) category list.
    const { rows } = await query(
      `SELECT key, label_en FROM categories WHERE is_active = true ORDER BY sort_order, key`
    );
    const validKeys = new Set(rows.map((r) => String(r.key)));
    const catList = rows
      .map((r) => `   - "${r.key}": ${r.label_en}`)
      .join("\n");

    const prompt = `From the image, determine:

1) "amount": the TOTAL price actually shown, as a number (e.g. 42.50). Rules:
   - Use a receipt's TOTAL, or the clear total price printed on a single item's tag.
   - If only a UNIT price is visible (e.g. "$8/kg", "$3 each") with no quantity or total, set amount to null.
   - If the price is blurry/unreadable, missing, or there are multiple conflicting prices you cannot resolve, set amount to null.
   - Never guess or invent a number.

2) "category": your best guess of ONE category key from this list based on what is visible, or null if unclear. You MAY set a category even when amount is null.
${catList}

3) "confidence_note": one short sentence on what you saw and any uncertainty.

Return ONLY: {"amount": number|null, "category": string|null, "confidence_note": string}`;

    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: media_type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: image,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const text = msg.content.find((b) => b.type === "text")?.text ?? "";
    return NextResponse.json(parseVision(text, validKeys));
  } catch (err) {
    console.error("POST /api/vision failed:", err);
    return NextResponse.json(blank(true), { status: 200 });
  }
}
