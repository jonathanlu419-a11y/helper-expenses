"use client";

import { useState } from "react";
import type { Category, BigCategory } from "@/lib/categories";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createBigCategory,
  updateBigCategory,
  deleteBigCategory,
  translateLabel,
} from "@/lib/client";

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}

// ── Manage Categories section for /mum/settings ───────────────
// Full CRUD for regular categories AND big categories, with auto-translated
// Indonesian labels (Mum only types English; the app suggests the Indonesian
// label in an editable field). All reads come from the DB via the parent's
// useLedger, so edits reflect everywhere immediately after `reload()`.

export default function ManageCategories({
  categories,
  bigCategories,
  reload,
  onToast,
}: {
  categories: Category[];
  bigCategories: BigCategory[];
  reload: () => Promise<void>;
  onToast: (message: string, kind: "success" | "error") => void;
}) {
  const [editor, setEditor] = useState<
    | { kind: "category"; mode: "add" | "edit"; cat?: Category }
    | { kind: "big"; mode: "add" | "edit"; big?: BigCategory }
    | null
  >(null);
  const [reassign, setReassign] = useState<{ big: BigCategory; count: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const bigs = [...bigCategories].sort((a, b) => a.sortOrder - b.sortOrder);
  const cats = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const bigLabel = (key: string) => bigCategories.find((b) => b.key === key)?.labelEn ?? key;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      onToast(msg(e), "error");
    } finally {
      setBusy(false);
    }
  }

  // Reorder by swapping sort_order with the neighbor in the current order.
  async function move(list: { key: string; sortOrder: number }[], key: string, dir: -1 | 1, kind: "cat" | "big") {
    const i = list.findIndex((x) => x.key === key);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[i];
    const b = list[j];
    await run(async () => {
      const patch = kind === "cat" ? updateCategory : updateBigCategory;
      await patch(a.key, { sort_order: b.sortOrder });
      await patch(b.key, { sort_order: a.sortOrder });
      await reload();
    });
  }

  async function removeCategory(cat: Category) {
    if (!window.confirm(`Remove "${cat.labelEn}"?`)) return;
    await run(async () => {
      const r = await deleteCategory(cat.key);
      onToast(
        r.softDeleted
          ? "Category has entries — hidden from Quick Add, still shown in history."
          : "Category removed.",
        "success"
      );
      await reload();
    });
  }

  async function removeBig(big: BigCategory) {
    if (big.isFallback) {
      onToast("The fallback big category can't be deleted.", "error");
      return;
    }
    if (!window.confirm(`Delete big category "${big.labelEn}"?`)) return;
    await run(async () => {
      const r = await deleteBigCategory(big.key);
      if (r.deleted) {
        onToast("Big category deleted.", "success");
        await reload();
      } else if (r.needsReassign) {
        setReassign({ big, count: r.count ?? 0 });
      } else {
        onToast(r.error ?? "Failed to delete", "error");
      }
    });
  }

  async function confirmReassign(targetKey: string) {
    if (!reassign) return;
    await run(async () => {
      const r = await deleteBigCategory(reassign.big.key, targetKey);
      if (r.deleted) {
        onToast(`Reassigned ${reassign.count} and deleted.`, "success");
        setReassign(null);
        await reload();
      } else {
        onToast(r.error ?? "Failed", "error");
      }
    });
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-800">Manage Categories</h2>
      <p className="mb-3 mt-1 text-xs text-gray-500">
        Add, rename, reorder and remove the categories the helper picks from. Type
        the English label — the Indonesian one is suggested automatically.
      </p>

      {/* ── Big categories ── */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Big categories (calendar)
          </h3>
          <button
            onClick={() => setEditor({ kind: "big", mode: "add" })}
            className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-white"
          >
            + Add
          </button>
        </div>
        <ul className="divide-y divide-gray-50">
          {bigs.map((b, i) => (
            <li key={b.key} className="flex items-center gap-2 py-2">
              <span className="flex-1 text-sm text-gray-700">
                {b.labelEn}
                {b.labelId ? <span className="ml-1 text-xs text-gray-400">· {b.labelId}</span> : (
                  <span className="ml-1 text-xs text-amber-600" title="No Indonesian label">⚠️</span>
                )}
                {b.isFallback && <span className="ml-1 text-xs text-gray-400">🔒 fallback</span>}
              </span>
              <ReorderButtons
                disabled={busy}
                onUp={() => move(bigs, b.key, -1, "big")}
                onDown={() => move(bigs, b.key, 1, "big")}
                first={i === 0}
                last={i === bigs.length - 1}
              />
              <button
                onClick={() => setEditor({ kind: "big", mode: "edit", big: b })}
                disabled={busy}
                className="rounded-full px-2 py-1 text-xs text-blue-600"
              >
                Edit
              </button>
              {!b.isFallback && (
                <button
                  onClick={() => removeBig(b)}
                  disabled={busy}
                  className="rounded-full px-2 py-1 text-xs text-red-500"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Regular categories ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Categories
          </h3>
          <button
            onClick={() => setEditor({ kind: "category", mode: "add" })}
            className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-white"
          >
            + Add
          </button>
        </div>
        <ul className="divide-y divide-gray-50">
          {cats.map((c, i) => (
            <li key={c.key} className={`flex items-center gap-2 py-2 ${c.isActive ? "" : "opacity-50"}`}>
              <span className="text-lg">{c.emoji}</span>
              <span className="flex-1 text-sm text-gray-700">
                {c.labelEn}
                {c.labelId ? (
                  <span className="ml-1 text-xs text-gray-400">· {c.labelId}</span>
                ) : (
                  <span className="ml-1 text-xs text-amber-600" title="Needs Indonesian label">⚠️</span>
                )}
                <span className="ml-1 rounded bg-gray-100 px-1 text-[10px] text-gray-500">
                  {bigLabel(c.bigCategory)}
                </span>
                {!c.isActive && (
                  <span className="ml-1 text-[10px] font-medium text-gray-400">hidden</span>
                )}
              </span>
              <ReorderButtons
                disabled={busy}
                onUp={() => move(cats, c.key, -1, "cat")}
                onDown={() => move(cats, c.key, 1, "cat")}
                first={i === 0}
                last={i === cats.length - 1}
              />
              <button
                onClick={() => setEditor({ kind: "category", mode: "edit", cat: c })}
                disabled={busy}
                className="rounded-full px-2 py-1 text-xs text-blue-600"
              >
                Edit
              </button>
              {c.isActive ? (
                <button
                  onClick={() => removeCategory(c)}
                  disabled={busy}
                  className="rounded-full px-2 py-1 text-xs text-red-500"
                >
                  Remove
                </button>
              ) : (
                <button
                  onClick={() => run(async () => {
                    await updateCategory(c.key, { is_active: true });
                    await reload();
                  })}
                  disabled={busy}
                  className="rounded-full px-2 py-1 text-xs text-emerald-600"
                >
                  Show
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {editor?.kind === "category" && (
        <CategoryEditor
          mode={editor.mode}
          cat={editor.cat}
          bigCategories={bigs}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            await reload();
            onToast("Saved.", "success");
          }}
        />
      )}
      {editor?.kind === "big" && (
        <BigCategoryEditor
          mode={editor.mode}
          big={editor.big}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            await reload();
            onToast("Saved.", "success");
          }}
        />
      )}

      {reassign && (
        <ReassignModal
          big={reassign.big}
          count={reassign.count}
          options={bigs.filter((b) => b.key !== reassign.big.key)}
          onCancel={() => setReassign(null)}
          onConfirm={confirmReassign}
        />
      )}
    </section>
  );
}

function ReorderButtons({
  onUp,
  onDown,
  first,
  last,
  disabled,
}: {
  onUp: () => void;
  onDown: () => void;
  first: boolean;
  last: boolean;
  disabled: boolean;
}) {
  return (
    <span className="flex flex-col leading-none">
      <button
        onClick={onUp}
        disabled={disabled || first}
        className="px-1 text-xs text-gray-400 disabled:opacity-20"
        aria-label="Move up"
      >
        ▲
      </button>
      <button
        onClick={onDown}
        disabled={disabled || last}
        className="px-1 text-xs text-gray-400 disabled:opacity-20"
        aria-label="Move down"
      >
        ▼
      </button>
    </span>
  );
}

// ── shared translated-label field ──
function TranslatedLabelField({
  labelEn,
  labelId,
  setLabelId,
  onEnglishBlur,
  translating,
}: {
  labelEn: string;
  labelId: string;
  setLabelId: (v: string) => void;
  onEnglishBlur: () => void;
  translating: boolean;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-medium text-gray-600">
        Indonesian translation (auto-generated, edit if needed)
      </label>
      <div className="flex gap-2">
        <input
          value={labelId}
          onChange={(e) => setLabelId(e.target.value)}
          placeholder={translating ? "Translating…" : "e.g. Camilan"}
          className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
        />
        <button
          type="button"
          onClick={onEnglishBlur}
          disabled={!labelEn.trim() || translating}
          className="rounded-2xl border-2 border-gray-200 px-3 text-sm text-gray-500 disabled:opacity-40"
          title="Auto-translate from English"
        >
          {translating ? "…" : "✨"}
        </button>
      </div>
    </div>
  );
}

function CategoryEditor({
  mode,
  cat,
  bigCategories,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  cat?: Category;
  bigCategories: BigCategory[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [emoji, setEmoji] = useState(cat?.emoji ?? "🧾");
  const [labelEn, setLabelEn] = useState(cat?.labelEn ?? "");
  const [labelId, setLabelId] = useState(cat?.labelId ?? "");
  const [bigKey, setBigKey] = useState(cat?.bigCategory ?? bigCategories[0]?.key ?? "");
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function autoTranslate() {
    if (!labelEn.trim()) return;
    setTranslating(true);
    const t = await translateLabel(labelEn.trim());
    setTranslating(false);
    if (t) setLabelId(t);
  }
  function maybeTranslateOnBlur() {
    if (labelId.trim() === "") autoTranslate();
  }

  async function save() {
    setErr(null);
    if (!labelEn.trim()) return setErr("English label is required.");
    if (!bigKey) return setErr("Pick a big category.");
    setSaving(true);
    try {
      const payload = {
        emoji: emoji.trim() || "🧾",
        label_en: labelEn.trim(),
        label_id: labelId.trim(),
        big_category: bigKey,
      };
      if (mode === "add") await createCategory(payload);
      else await updateCategory(cat!.key, payload);
      await onSaved();
      onClose();
    } catch (e) {
      setErr(msg(e));
      setSaving(false);
    }
  }

  return (
    <Sheet title={mode === "add" ? "Add category" : "Edit category"} onClose={onClose}>
      <label className="mb-1 block text-xs font-medium text-gray-600">Emoji</label>
      <input
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
        className="mb-3 w-20 rounded-2xl border-2 border-gray-200 bg-gray-50 px-3 py-2 text-center text-2xl outline-none"
      />

      <label className="mb-1 block text-xs font-medium text-gray-600">English label</label>
      <input
        value={labelEn}
        onChange={(e) => setLabelEn(e.target.value)}
        onBlur={maybeTranslateOnBlur}
        placeholder="e.g. Snacks"
        className="mb-3 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
      />

      <TranslatedLabelField
        labelEn={labelEn}
        labelId={labelId}
        setLabelId={setLabelId}
        onEnglishBlur={autoTranslate}
        translating={translating}
      />

      <label className="mb-1 block text-xs font-medium text-gray-600">Big category</label>
      <select
        value={bigKey}
        onChange={(e) => setBigKey(e.target.value)}
        className="mb-4 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
      >
        {bigCategories.map((b) => (
          <option key={b.key} value={b.key}>
            {b.labelEn}
          </option>
        ))}
      </select>

      {err && <p className="mb-3 text-sm font-medium text-red-600">{err}</p>}
      <SaveButton onClick={save} saving={saving} />
    </Sheet>
  );
}

function BigCategoryEditor({
  mode,
  big,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  big?: BigCategory;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [labelEn, setLabelEn] = useState(big?.labelEn ?? "");
  const [labelId, setLabelId] = useState(big?.labelId ?? "");
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function autoTranslate() {
    if (!labelEn.trim()) return;
    setTranslating(true);
    const t = await translateLabel(labelEn.trim());
    setTranslating(false);
    if (t) setLabelId(t);
  }

  async function save() {
    setErr(null);
    if (!labelEn.trim()) return setErr("English name is required.");
    setSaving(true);
    try {
      const payload = { label_en: labelEn.trim(), label_id: labelId.trim() };
      if (mode === "add") await createBigCategory(payload);
      else await updateBigCategory(big!.key, payload);
      await onSaved();
      onClose();
    } catch (e) {
      setErr(msg(e));
      setSaving(false);
    }
  }

  return (
    <Sheet title={mode === "add" ? "Add big category" : "Edit big category"} onClose={onClose}>
      <label className="mb-1 block text-xs font-medium text-gray-600">English name</label>
      <input
        value={labelEn}
        onChange={(e) => setLabelEn(e.target.value)}
        onBlur={() => labelId.trim() === "" && autoTranslate()}
        placeholder="e.g. Health"
        className="mb-3 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
      />
      <TranslatedLabelField
        labelEn={labelEn}
        labelId={labelId}
        setLabelId={setLabelId}
        onEnglishBlur={autoTranslate}
        translating={translating}
      />
      {err && <p className="mb-3 text-sm font-medium text-red-600">{err}</p>}
      <SaveButton onClick={save} saving={saving} />
    </Sheet>
  );
}

function ReassignModal({
  big,
  count,
  options,
  onCancel,
  onConfirm,
}: {
  big: BigCategory;
  count: number;
  options: BigCategory[];
  onCancel: () => void;
  onConfirm: (targetKey: string) => void;
}) {
  const fallback = options.find((o) => o.isFallback);
  const [target, setTarget] = useState(fallback?.key ?? options[0]?.key ?? "");
  return (
    <Sheet title={`Delete "${big.labelEn}"`} onClose={onCancel}>
      <p className="mb-3 text-sm text-gray-600">
        {count} categor{count === 1 ? "y is" : "ies are"} still assigned to this big
        category. Reassign {count === 1 ? "it" : "them"} to another big category
        first:
      </p>
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="mb-4 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.labelEn}
            {o.isFallback ? " (fallback)" : ""}
          </option>
        ))}
      </select>
      <button
        onClick={() => onConfirm(target)}
        className="w-full rounded-2xl bg-red-600 py-3 text-sm font-bold text-white"
      >
        Reassign &amp; delete
      </button>
    </Sheet>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="animate-sheet-up w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-300" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-sm text-gray-500">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="w-full rounded-2xl bg-emerald-700 py-4 text-lg font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
    >
      {saving ? "Saving…" : "Save"}
    </button>
  );
}
