import type { Metadata } from "next";

// /worker is a client component and can't export metadata itself, so the
// Indonesian browser-tab title is set here at the route-segment level.
export const metadata: Metadata = {
  title: "Catatan Belanja",
};

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
