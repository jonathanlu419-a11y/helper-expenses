import type { Metadata } from "next";

// English browser-tab title for all of Mum's pages (/mum, /mum/calendar,
// /mum/entries), which are client components and can't export metadata.
export const metadata: Metadata = {
  title: "Spending Dashboard",
};

export default function MumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
