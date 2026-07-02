// All "today" and period-boundary logic is anchored to Toronto local time,
// NOT the server's timezone (which is UTC on Vercel). This avoids the classic
// UTC-boundary bug where an entry logged late at night lands in the wrong day
// / week / month.
//
// The ONLY timezone-sensitive step is deriving today's Toronto calendar date.
// Everything after that is pure calendar arithmetic on a noon-anchored plain
// Date (noon dodges any DST midnight wobble), so results are stable and never
// cross a day boundary by accident.

import { formatInTimeZone } from "date-fns-tz";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export const APP_TZ = "America/Toronto";

export type Period = "weekly" | "monthly";

export interface PeriodRange {
  /** inclusive, "YYYY-MM-DD" */
  startISO: string;
  /** exclusive, "YYYY-MM-DD" */
  endISO: string;
  label: string;
}

/** Today's calendar date in Toronto as "YYYY-MM-DD". */
export function todayISO(): string {
  return formatInTimeZone(new Date(), APP_TZ, "yyyy-MM-dd");
}

/** Plain local Date at noon representing a "YYYY-MM-DD" — a vehicle for math. */
function plainDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function toISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/**
 * Range for the given period, offset from the current Toronto period.
 * offset 0 = current, -1 = previous, +1 = next.
 * Weekly = Monday–Sunday. Monthly = calendar month. end is exclusive.
 */
export function getPeriodRange(period: Period, offset: number): PeriodRange {
  const anchor = plainDate(todayISO());

  if (period === "weekly") {
    const start = addWeeks(startOfWeek(anchor, { weekStartsOn: 1 }), offset);
    const end = addDays(start, 7);
    const lastDay = addDays(start, 6);
    return {
      startISO: toISO(start),
      endISO: toISO(end),
      label: `${format(start, "d MMM")} – ${format(lastDay, "d MMM")}`,
    };
  }

  const start = addMonths(startOfMonth(anchor), offset);
  const end = addMonths(start, 1);
  return {
    startISO: toISO(start),
    endISO: toISO(end),
    label: format(start, "MMMM yyyy"),
  };
}

/** Whether a "YYYY-MM-DD" entry_date falls within [startISO, endISO). */
export function isWithin(entryISO: string, range: PeriodRange): boolean {
  return entryISO >= range.startISO && entryISO < range.endISO;
}
