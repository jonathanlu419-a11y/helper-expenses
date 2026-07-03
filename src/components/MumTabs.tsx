import Link from "next/link";

// Shared top navigation for Mum's dashboard sub-pages.
// NOTE: intentionally contains NO link to /worker or the helper home — Mum's
// area must not expose any path to the worker's screens.

const TABS = [
  { key: "summary", label: "Summary", href: "/mum" },
  { key: "calendar", label: "Calendar", href: "/mum/calendar" },
  { key: "entries", label: "Entries", href: "/mum/entries" },
] as const;

export type MumTab = (typeof TABS)[number]["key"];

export default function MumTabs({ active }: { active: MumTab }) {
  return (
    <div className="mt-3 flex gap-2">
      {TABS.map((t) =>
        t.key === active ? (
          <span
            key={t.key}
            className="rounded-full bg-slate-800 px-3 py-1 text-sm font-medium text-white"
          >
            {t.label}
          </span>
        ) : (
          <Link
            key={t.key}
            href={t.href}
            className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600"
          >
            {t.label}
          </Link>
        )
      )}
    </div>
  );
}
