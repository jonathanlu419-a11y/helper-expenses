// The 7 fixed categories for the MVP.
// `key` is the internal English value stored in the database.
// `labelId` is the Bahasa Indonesia label shown to the worker.
// `labelEn` is the English label shown on Mum's dashboard.

export type CategoryKey =
  | "household_cleaning"
  | "vegetables"
  | "fruits"
  | "meat"
  | "rice_noodles"
  | "other_food"
  | "transport";

export interface Category {
  key: CategoryKey;
  emoji: string;
  labelId: string;
  labelEn: string;
}

export const CATEGORIES: Category[] = [
  { key: "household_cleaning", emoji: "🧹", labelId: "Kebutuhan Rumah Tangga", labelEn: "Household & Cleaning Supplies" },
  { key: "vegetables", emoji: "🥬", labelId: "Sayuran", labelEn: "Vegetables" },
  { key: "fruits", emoji: "🍎", labelId: "Buah-buahan", labelEn: "Fruits" },
  { key: "meat", emoji: "🥩", labelId: "Daging", labelEn: "Meat" },
  { key: "rice_noodles", emoji: "🍚", labelId: "Beras & Mie", labelEn: "Rice & Noodles" },
  { key: "other_food", emoji: "🧂", labelId: "Bahan Makanan Lain", labelEn: "Other Food Items" },
  { key: "transport", emoji: "🚗", labelId: "Transportasi", labelEn: "Transportation" },
];

export const CATEGORY_KEYS: CategoryKey[] = CATEGORIES.map((c) => c.key);

export const CATEGORY_MAP: Record<CategoryKey, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c])
) as Record<CategoryKey, Category>;

export function isCategoryKey(value: unknown): value is CategoryKey {
  return typeof value === "string" && (CATEGORY_KEYS as string[]).includes(value);
}
