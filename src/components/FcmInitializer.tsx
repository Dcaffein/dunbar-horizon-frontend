"use client";

import { useEffect, useState } from "react";
import { setupForegroundHandler } from "@/lib/firebase";

interface ToastState {
  title: string;
  body: string;
}

export default function FcmInitializer() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const notify = (title: string, body: string) => setToast({ title, body });
    const unsubscribe = setupForegroundHandler(notify);

    if (process.env.NODE_ENV === "development") {
      (window as unknown as Record<string, unknown>).__testFcmToast = notify;
    }

    return () => {
      unsubscribe();
      if (process.env.NODE_ENV === "development") {
        delete (window as unknown as Record<string, unknown>).__testFcmToast;
      }
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-80 rounded-xl bg-white shadow-lg border border-gray-100 p-4 flex items-start gap-3">
      <span className="text-lg shrink-0">🔔</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{toast.title}</p>
        {toast.body && (
          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{toast.body}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => setToast(null)}
        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="닫기"
      >
        ✕
      </button>
    </div>
  );
}
