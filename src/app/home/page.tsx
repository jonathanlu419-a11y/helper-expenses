import type { Metadata } from "next";
import HelperHome from "@/components/HelperHome";

export const metadata: Metadata = {
  title: "Catatan Belanja",
};

// /home — same helper home as root (Indonesian, links only to /worker).
export default function HomePage() {
  return <HelperHome />;
}
