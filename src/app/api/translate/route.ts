import { NextResponse } from "next/server";
import { geminiGenerate, geminiKey } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SYSTEM =
  "You translate short English labels for a household grocery / expense tracker " +
  "into natural, everyday Bahasa Indonesia (the kind a family would actually say, " +
  "not stiff or overly literal dictionary translations). Reply with ONLY the " +
  "translated label — no quotes, no explanation, no alternatives, no punctuation.";

// POST { text } → { label_id: string|null }. Never throws; null on any failure so
// category saving is never blocked (Mum can fill the Indonesian label manually).
export async function POST(req: Request) {
  if (!geminiKey()) return NextResponse.json({ label_id: null, unavailable: true });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ label_id: null }, { status: 200 });
  }
  const text = (body as Record<string, unknown>)?.text;
  if (typeof text !== "string" || text.trim() === "") {
    return NextResponse.json({ label_id: null }, { status: 200 });
  }

  try {
    const out = await geminiGenerate({
      system: SYSTEM,
      parts: [
        {
          text: `Translate to concise, natural everyday Bahasa Indonesia (household/grocery context): "${text.trim()}"`,
        },
      ],
      maxOutputTokens: 200,
    });
    const label = out.trim().replace(/^["'`]+|["'`.]+$/g, "").trim();
    return NextResponse.json({ label_id: label || null });
  } catch (err) {
    console.error("POST /api/translate failed:", err);
    return NextResponse.json({ label_id: null, unavailable: true }, { status: 200 });
  }
}
