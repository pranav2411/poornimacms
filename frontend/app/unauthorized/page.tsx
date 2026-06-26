"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { signOut as firebaseSignOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import SupportModal from "@/components/SupportModal";

export default function UnauthorizedPage() {
  const [showHelp, setShowHelp] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    // Clear local storage user profile
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("poornima-user");
    }
    // Sign out of Firebase and NextAuth and redirect back to the login page
    void firebaseSignOut(getFirebaseAuth()).finally(() => {
      void signOut({ callbackUrl: "/login" });
    });
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-[#f4f6fb] px-6 py-12"
      style={{ backgroundImage: "url('/cmsbg.png')", backgroundSize: "480px" }}
    >
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f4f6fb]/80 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-accent" />
            <p className="text-sm font-semibold text-slate-800 animate-pulse">
              Signing you out...
            </p>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-black/10" />
      <GlassCard
        className="relative z-10 w-full max-w-md p-8 text-center shadow-[0_36px_96px_rgba(15,23,42,0.15)] md:p-10"
        glow
      >
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-heading font-jakarta">
            Access Denied
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-body">
            You do not have permission to view this page. This could be due to
            insufficient privileges or because your registration has been denied.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3">
            <Button
              onClick={handleLogout}
              className="w-full rounded-full border border-primary bg-primary text-white hover:bg-transparent hover:text-primary shadow-md transition-all duration-200"
            >
              Back to Login
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowHelp(true)}
              className="w-full rounded-full border-border bg-transparent text-heading hover:bg-surface/50"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </GlassCard>

      <SupportModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
