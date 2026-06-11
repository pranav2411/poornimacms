"use client";

import { SessionProvider } from "next-auth/react";
import { ConfirmProvider } from "@/lib/confirm-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConfirmProvider>
        {children}
      </ConfirmProvider>
    </SessionProvider>
  );
}
