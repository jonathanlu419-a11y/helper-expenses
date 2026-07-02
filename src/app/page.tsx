import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Helper Expenses</h1>
        <p className="mt-1 text-sm text-gray-500">Household spending tracker</p>
      </div>

      <Link
        href="/worker"
        className="rounded-2xl bg-green-600 p-6 text-center text-white shadow-sm transition active:scale-[0.98]"
      >
        <div className="text-3xl">🧾</div>
        <div className="mt-2 text-lg font-semibold">Catat Pengeluaran</div>
        <div className="text-sm text-green-100">Worker entry screen</div>
      </Link>

      <Link
        href="/mum"
        className="rounded-2xl bg-slate-800 p-6 text-center text-white shadow-sm transition active:scale-[0.98]"
      >
        <div className="text-3xl">📊</div>
        <div className="mt-2 text-lg font-semibold">Spending Dashboard</div>
        <div className="text-sm text-slate-300">Review by category</div>
      </Link>
    </main>
  );
}
