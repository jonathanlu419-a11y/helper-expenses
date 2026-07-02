"use client";

import { useEffect } from "react";

export interface ToastState {
  message: string;
  kind: "success" | "error";
}

export default function Toast({
  toast,
  onDismiss,
  duration = 2200,
}: {
  toast: ToastState | null;
  onDismiss: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [toast, duration, onDismiss]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      <div
        className={`animate-toast-in rounded-full px-5 py-3 text-sm font-medium text-white shadow-lg ${
          toast.kind === "success" ? "bg-green-600" : "bg-red-600"
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}
