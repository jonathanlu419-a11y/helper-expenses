// Category TYPES and display helpers only. The actual category data now lives
// in the database (`categories` + `big_categories` tables) and is fetched via
// GET /api/categories, so Mum's edits are reflected everywhere immediately.
// Keys are dynamic strings.

export type CategoryKey = string;
export type BigCategoryKey = string;

export interface Category {
  key: CategoryKey;
  emoji: string;
  labelId: string;
  labelEn: string;
  bigCategory: BigCategoryKey;
  sortOrder: number;
  isActive: boolean;
}

export interface BigCategory {
  key: BigCategoryKey;
  labelEn: string;
  labelId: string;
  sortOrder: number;
  isActive: boolean;
  isFallback: boolean;
}

// Deterministic color set per big category, chosen by position. Class strings
// are literals so Tailwind keeps them in the build.
const BIG_COLORS = [
  { text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" },
  { text: "text-blue-600", badge: "bg-blue-100 text-blue-700", bar: "bg-blue-500" },
  { text: "text-amber-600", badge: "bg-amber-100 text-amber-700", bar: "bg-amber-500" },
  { text: "text-violet-600", badge: "bg-violet-100 text-violet-700", bar: "bg-violet-500" },
  { text: "text-rose-600", badge: "bg-rose-100 text-rose-700", bar: "bg-rose-500" },
  { text: "text-cyan-600", badge: "bg-cyan-100 text-cyan-700", bar: "bg-cyan-500" },
  { text: "text-lime-600", badge: "bg-lime-100 text-lime-700", bar: "bg-lime-500" },
  { text: "text-fuchsia-600", badge: "bg-fuchsia-100 text-fuchsia-700", bar: "bg-fuchsia-500" },
];

export function bigColor(index: number) {
  return BIG_COLORS[((index % BIG_COLORS.length) + BIG_COLORS.length) % BIG_COLORS.length];
}

/** key → Category lookup (includes inactive, so historical entries still render). */
export function buildCategoryMap(cats: Category[]): Record<string, Category> {
  return Object.fromEntries(cats.map((c) => [c.key, c]));
}

/** key → BigCategory lookup. */
export function buildBigMap(bigs: BigCategory[]): Record<string, BigCategory> {
  return Object.fromEntries(bigs.map((b) => [b.key, b]));
}

/** Localized label for a category, tolerant of a missing/unknown key. */
export function catLabel(cat: Category | undefined, lang: "id" | "en"): string {
  if (!cat) return "—";
  return (lang === "id" ? cat.labelId : cat.labelEn) || cat.labelEn || cat.key;
}
