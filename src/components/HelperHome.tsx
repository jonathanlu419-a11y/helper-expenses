import Link from "next/link";

// Helper's home screen — 100% Bahasa Indonesia, links ONLY to /worker.
// Must contain no English and no path to Mum's dashboard.

export default function HelperHome() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Catatan Belanja</h1>
        <p className="mt-1 text-sm text-gray-500">Pengeluaran rumah tangga</p>
      </div>

      <Link
        href="/worker"
        className="rounded-2xl bg-green-600 p-6 text-center text-white shadow-sm transition active:scale-[0.98]"
      >
        <div className="text-4xl">🧾</div>
        <div className="mt-2 text-lg font-semibold">Catat Pengeluaran</div>
        <div className="text-sm text-green-100">Tambah &amp; lihat catatan belanja</div>
      </Link>
    </main>
  );
}
