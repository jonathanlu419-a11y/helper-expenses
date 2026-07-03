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

// Full day + month names, explicit arrays (never rely on the runtime's Intl
// locale). Day index matches Date.getDay(): 0 = Sunday.
const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS_EN_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_ID_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/**
 * Long day header with weekday + full month name, e.g.
 *   id → "Jumat, 3 Juli 2026"
 *   en → "Friday, 3 July 2026"
 */
export function formatDayHeader(iso: string, lang: "id" | "en" = "en"): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(y, m - 1, d, 12).getDay(); // local noon; date-only, TZ-safe
  const days = lang === "id" ? DAYS_ID : DAYS_EN;
  const months = lang === "id" ? MONTHS_ID_FULL : MONTHS_EN_FULL;
  return `${days[dow]}, ${d} ${months[m - 1]} ${y}`;
}
