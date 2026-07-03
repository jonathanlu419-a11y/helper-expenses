import type { Metadata } from "next";
import HelperHome from "@/components/HelperHome";

export const metadata: Metadata = {
  title: "Catatan Belanja",
};

// Root — the helper's home (Indonesian, links only to /worker).
export default function Home() {
  return <HelperHome />;
}
