// Display helpers shared by both pages.

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

/** Today's local date as "YYYY-MM-DD" (for date input defaults). */
export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Parse a "YYYY-MM-DD" string into a local-midnight Date (TZ-safe). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** e.g. "2 Jul 2026" — used on the worker's Indonesian table too (month names are neutral). */
export function formatDateShort(iso: string, locale = "en-GB"): string {
  return parseISODate(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
