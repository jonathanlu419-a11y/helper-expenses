import Link from "next/link";

// Shared top navigation for Mum's dashboard sub-pages. Mounted under both
// /mum (public) and /admin (password-gated) via the `basePath` prop, so tabs
// stay within whichever area is currently active.
// NOTE: intentionally contains NO link to /worker or the helper home — Mum's
// area must not expose any path to the worker's screens.

const TABS = [
  { key: "summary", label: "Summary", path: "" },
  { key: "calendar", label: "Calendar", path: "/calendar" },
  { key: "entries", label: "Entries", path: "/entries" },
  { key: "settings", label: "Settings", path: "/settings" },
] as const;

export type MumTab = (typeof TABS)[number]["key"];

export default function MumTabs({
  active,
  basePath = "/mum",
}: {
  active: MumTab;
  basePath?: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {TABS.map((t) =>
        t.key === active ? (
          <span
            key={t.key}
            className="inline-flex min-h-11 items-center rounded-full bg-slate-800 px-3 text-sm font-medium text-white"
          >
            {t.label}
          </span>
        ) : (
          <Link
            key={t.key}
            href={`${basePath}${t.path}`}
            className="inline-flex min-h-11 items-center rounded-full bg-gray-200 px-3 text-sm font-medium text-gray-600"
          >
            {t.label}
          </Link>
        )
      )}
    </div>
  );
}
