"use client";

import { useEffect, useState } from "react";
import { subscribe, type Toast } from "@/lib/toast";

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe((newToasts) => {
      setToasts(newToasts);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="fixed bottom-0 right-0 z-100 flex max-h-screen w-full flex-col-reverse gap-4 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:w-105">
      {toasts.map((toast) => {
        const isDestructive = toast.variant === "destructive";
        const bgColor = isDestructive
          ? "bg-red-500/95 border-red-500"
          : "bg-green-500/95 border-green-500";
        const textColor = isDestructive ? "text-white" : "text-white";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative w-full overflow-hidden rounded-2xl border backdrop-blur-sm p-4 shadow-lg ${bgColor}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {toast.title && (
                  <p className={`text-sm font-semibold ${textColor}`}>
                    {toast.title}
                  </p>
                )}
                {toast.description && (
                  <p className={`mt-1 text-sm ${textColor}/90`}>
                    {toast.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
