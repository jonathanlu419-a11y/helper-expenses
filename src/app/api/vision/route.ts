import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isCategoryKey } from "@/lib/categories";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // vision calls can take a few seconds

// Per the claude-api reference: default to claude-opus-4-8 unless a model is
// explicitly chosen. Vision + base64 image input, JSON-only prompt, parsed
// defensively so an unreadable photo falls back to blank rather than erroring.
const MODEL = "claude-opus-4-8";

const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const SYSTEM =
  "You extract a single household expense from a photo (a shop receipt, or a " +
  "price-tagged food/market item) for a home expense tracker. Respond with " +
  "ONLY a JSON object — no preamble, no markdown, no code fences.";

const PROMPT = `From the image, determine:

1) "amount": the TOTAL price actually shown, as a number (e.g. 42.50). Rules:
   - Use a receipt's TOTAL, or the clear total price printed on a single item's tag.
   - If only a UNIT price is visible (e.g. "$8/kg", "$3 each") with no quantity or total, set amount to null.
   - If the price is blurry/unreadable, missing, or there are multiple conflicting prices you cannot resolve, set amount to null.
   - Never guess or invent a number.

2) "category": your best guess of ONE category key from this list based on what is visible, or null if unclear. You MAY set a category even when amount is null.
   - "household_cleaning": cleaning / household supplies (soap, detergent, tissue, etc.)
   - "vegetables": fresh vegetables
   - "fruits": fresh fruit
   - "meat": meat, poultry, fish, seafood
   - "rice_noodles": rice, noodles, pasta
   - "other_food": other groceries / food staples (oil, spices, eggs, dairy, snacks, etc.)
   - "transport": transport, fares, fuel

3) "confidence_note": one short sentence on what you saw and any uncertainty.

Return ONLY: {"amount": number|null, "category": string|null, "confidence_note": string}`;

interface VisionResult {
  amount: number | null;
  category: string | null;
  note: string | null;
  unavailable?: boolean;
}

function blank(unavailable = false): VisionResult {
  return { amount: null, category: null, note: null, unavailable };
}

// Defensive parse: pull the first {...} block, validate every field, and never
// throw — anything unexpected yields a blank result (form stays empty).
function parseVision(text: string): VisionResult {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return blank();
    const obj = JSON.parse(match[0]) as Record<string, unknown>;

    const amt = obj.amount;
    const amount =
      typeof amt === "number" && Number.isFinite(amt) && amt > 0 ? amt : null;

    const category = isCategoryKey(obj.category) ? obj.category : null;
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
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const text = msg.content.find((b) => b.type === "text")?.text ?? "";
    return NextResponse.json(parseVision(text));
  } catch (err) {
    console.error("POST /api/vision failed:", err);
    // Graceful fallback — the client leaves the form blank for manual entry.
    return NextResponse.json(blank(true), { status: 200 });
  }
}
