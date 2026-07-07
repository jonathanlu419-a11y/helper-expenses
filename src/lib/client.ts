// Browser-side helpers for talking to the API routes.

import type {
  Expense,
  ExpenseInput,
  CashTransaction,
  CashInput,
  Settings,
} from "./types";
import type { CategoryKey, Category, BigCategory } from "./categories";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function fetchExpenses(): Promise<Expense[]> {
  return handle<Expense[]>(await fetch("/api/expenses", { cache: "no-store" }));
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  return handle<Expense>(
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function updateExpense(
  id: number,
  input: Partial<ExpenseInput>
): Promise<Expense> {
  return handle<Expense>(
    await fetch(`/api/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function deleteExpense(id: number): Promise<void> {
  await handle<{ ok: true }>(
    await fetch(`/api/expenses/${id}`, { method: "DELETE" })
  );
}

// ── Cash transactions ─────────────────────────────────────────
export async function fetchCash(): Promise<CashTransaction[]> {
  return handle<CashTransaction[]>(await fetch("/api/cash", { cache: "no-store" }));
}

export async function createCash(input: CashInput): Promise<CashTransaction> {
  return handle<CashTransaction>(
    await fetch("/api/cash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function deleteCash(id: number): Promise<void> {
  await handle<{ ok: true }>(await fetch(`/api/cash/${id}`, { method: "DELETE" }));
}

// ── Settings ──────────────────────────────────────────────────
export async function fetchSettings(): Promise<Settings> {
  return handle<Settings>(await fetch("/api/settings", { cache: "no-store" }));
}

export async function updateSettings(input: Partial<Settings>): Promise<Settings> {
  return handle<Settings>(
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

// ── Destructive reset ─────────────────────────────────────────
export async function resetAllData(): Promise<void> {
  await handle<{ ok: true }>(await fetch("/api/reset", { method: "POST" }));
}

// ── Vision (camera Quick Add) ─────────────────────────────────
export interface VisionResult {
  amount: number | null;
  category: CategoryKey | null;
  note: string | null;
  unavailable?: boolean;
}

/** Whether the camera Quick Add is configured (GEMINI_API_KEY present). */
export async function visionEnabled(): Promise<boolean> {
  try {
    const res = await fetch("/api/vision", { cache: "no-store" });
    if (!res.ok) return false;
    const body = (await res.json()) as { enabled?: boolean };
    return Boolean(body.enabled);
  } catch {
    return false;
  }
}

/** Send a base64 photo for extraction. Never throws — returns blanks on failure. */
export async function analyzePhoto(
  image: string,
  media_type: string
): Promise<VisionResult> {
  try {
    const res = await fetch("/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, media_type }),
    });
    if (!res.ok) return { amount: null, category: null, note: null, unavailable: true };
    return (await res.json()) as VisionResult;
  } catch {
    return { amount: null, category: null, note: null, unavailable: true };
  }
}

// ── Categories & big categories ───────────────────────────────
export interface CategoryInput {
  emoji?: string;
  label_en: string;
  label_id?: string;
  big_category: CategoryKey;
}
export interface CategoryPatch {
  emoji?: string;
  label_en?: string;
  label_id?: string;
  big_category?: CategoryKey;
  sort_order?: number;
  is_active?: boolean;
}
export interface BigCategoryInput {
  label_en: string;
  label_id?: string;
}
export interface BigCategoryPatch {
  label_en?: string;
  label_id?: string;
  sort_order?: number;
  is_active?: boolean;
}

export async function fetchCategories(): Promise<{
  categories: Category[];
  bigCategories: BigCategory[];
}> {
  return handle(await fetch("/api/categories", { cache: "no-store" }));
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  return handle<Category>(
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}
export async function updateCategory(key: string, patch: CategoryPatch): Promise<Category> {
  return handle<Category>(
    await fetch(`/api/categories/${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  );
}
export async function deleteCategory(
  key: string
): Promise<{ deleted?: boolean; softDeleted?: boolean; category?: Category }> {
  return handle(await fetch(`/api/categories/${encodeURIComponent(key)}`, { method: "DELETE" }));
}

export async function createBigCategory(input: BigCategoryInput): Promise<BigCategory> {
  return handle<BigCategory>(
    await fetch("/api/big-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}
export async function updateBigCategory(key: string, patch: BigCategoryPatch): Promise<BigCategory> {
  return handle<BigCategory>(
    await fetch(`/api/big-categories/${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  );
}
/**
 * Delete a big category. Pass reassignTo to move its categories first.
 * Returns { needsReassign: true, count } (not an error) when it still has
 * categories and no target was given, so the UI can prompt for reassignment.
 */
export async function deleteBigCategory(
  key: string,
  reassignTo?: string
): Promise<{ deleted: boolean; needsReassign?: boolean; count?: number; error?: string }> {
  const qs = reassignTo ? `?reassign_to=${encodeURIComponent(reassignTo)}` : "";
  const res = await fetch(`/api/big-categories/${encodeURIComponent(key)}${qs}`, {
    method: "DELETE",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) return { deleted: true };
  return {
    deleted: false,
    needsReassign: Boolean(body.needsReassign),
    count: typeof body.count === "number" ? body.count : undefined,
    error: typeof body.error === "string" ? body.error : "Failed to delete",
  };
}

/** Auto-translate an English label to Indonesian. Returns null on any failure. */
export async function translateLabel(text: string): Promise<string | null> {
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { label_id?: string | null };
    return body.label_id ?? null;
  } catch {
    return null;
  }
}
