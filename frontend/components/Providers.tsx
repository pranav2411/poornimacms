"use client";

import { SessionProvider } from "next-auth/react";
import { ConfirmProvider } from "@/lib/confirm-context";
import FCMHandler from "@/components/FCMHandler";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConfirmProvider>
        <FCMHandler />
        {children}
      </ConfirmProvider>
    </SessionProvider>
  );
}
