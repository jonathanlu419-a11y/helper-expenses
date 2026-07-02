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

/**
 * Render a "YYYY-MM-DD" string as e.g. "2 Jul 2026".
 * Parsed at local noon so the displayed day never shifts. This is display
 * only — period boundaries are computed in time.ts (Toronto-anchored).
 */
export function formatDateShort(iso: string, locale = "en-GB"): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
