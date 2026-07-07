// Minimal server-side wrapper around Google's Gemini (Generative Language) REST
// API. Used for category-label translation and the camera photo extraction.
// Raw fetch (no SDK) keeps deps light and the wire format explicit.
//
// Auth: GEMINI_API_KEY (from Google AI Studio) sent via the x-goog-api-key header.

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

// One multimodal model handles both text translation and image extraction.
export const GEMINI_MODEL = "gemini-2.5-flash";

export function geminiKey(): string | null {
  return process.env.GEMINI_API_KEY || null;
}

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

/**
 * Call Gemini generateContent and return the concatenated text of the first
 * candidate. Throws on missing key / non-2xx / network error — callers wrap in
 * try/catch and fall back to a safe default.
 */
export async function geminiGenerate(opts: {
  system?: string;
  parts: GeminiPart[];
  maxOutputTokens?: number;
  temperature?: number;
}): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: opts.parts }],
    generationConfig: {
      maxOutputTokens: opts.maxOutputTokens ?? 256,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    },
  };
  if (opts.system) body.system_instruction = { parts: [{ text: opts.system }] };

  const res = await fetch(`${ENDPOINT}/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return (
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? ""
  );
}
