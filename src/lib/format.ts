// Pure display helpers shared by both pages.
// (Date *math* lives in time.ts; this file only renders values.)

/** Format a number as "$1,234.50". */
export function formatMoney(amount: number): string {
  return (
    "$" +
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// Explicit month abbreviations so output never depends on the runtime's Intl
// locale data. Indonesian differs from English at Mei/Agu/Okt/Des.
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/**
 * Render a "YYYY-MM-DD" string as e.g. "2 Jul 2026" (en) / "2 Mei 2026" (id).
 * Display only — period boundaries are computed in time.ts (Hong Kong-anchored).
 */
export function formatDateShort(iso: string, lang: "id" | "en" = "en"): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = lang === "id" ? MONTHS_ID : MONTHS_EN;
  return `${d} ${months[m - 1]} ${y}`;
}
