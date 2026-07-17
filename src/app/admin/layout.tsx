"use client";

import { useEffect, useState } from "react";

// Gates every /admin/* page behind a password. Checks the admin_session
// cookie on load (the cookie itself is httpOnly, so this goes through an API
// call rather than reading it directly); shows a login form until a valid
// session exists, then renders the actual page.
//
// This gates the /admin page shell only — it does not add auth to the
// underlying /api/expenses, /api/cash, /api/settings, /api/categories
// routes, since those must stay public for /worker and /mum.

type Status = "checking" | "authed" | "unauthed";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data) => {
        if (alive) setStatus(data.authenticated ? "authed" : "unauthed");
      })
      .catch(() => {
        if (alive) setStatus("unauthed");
      });
    return () => {
      alive = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Incorrect password.");
        setSubmitting(false);
        return;
      }
      setStatus("authed");
    } catch {
      setError("Failed to log in. Try again.");
      setSubmitting(false);
    }
  }

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </main>
    );
  }

  if (status === "unauthed") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm"
        >
          <h1 className="mb-1 text-lg font-bold">Admin login</h1>
          <p className="mb-4 text-sm text-gray-500">Enter the admin password to continue.</p>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="mb-3 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none"
          />
          {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full rounded-2xl bg-slate-800 py-3 text-base font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "Checking…" : "Log in"}
          </button>
        </form>
      </main>
    );
  }

  return <>{children}</>;
}
