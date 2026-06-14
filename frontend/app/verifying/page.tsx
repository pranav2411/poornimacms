"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";

export default function VerifyingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users/check-status");
      if (!res.ok) {
        throw new Error("Failed to check status");
      }
      const data = (await res.json()) as {
        status: string;
        role: string | null;
      };

      if (data.status === "verified" && data.role) {
        const dashboardMap: Record<string, string> = {
          faculty: "/dashboard/faculty",
          vendor: "/dashboard/vendor",
          admin: "/dashboard/admin",
          superadmin: "/dashboard/superadmin",
        };
        const target = dashboardMap[data.role] || "/unauthorized";
        // Do a hard redirect to make sure middleware and session sync completely
        window.location.href = target;
      } else if (data.status === "denied") {
        window.location.href = "/unauthorized";
      } else {
        setError(
          "Your account is still pending review. Please wait or try again later."
        );
      }
    } catch (err) {
      setError("An error occurred while checking your status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-[#f4f6fb] px-6 py-12"
      style={{ backgroundImage: "url('/cmsbg.png')", backgroundSize: "480px" }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <GlassCard
        className="relative z-10 w-full max-w-md p-8 text-center shadow-[0_36px_96px_rgba(15,23,42,0.15)] md:p-10"
        glow
        pulse
      >
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500 animate-pulse">
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-heading font-jakarta">
            Account Under Review
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-body">
            Your account is under review by a Superadmin. You will be redirected
            once your role is assigned and verified.
          </p>

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-xs text-rose-700 backdrop-blur-sm">
              {error}
            </div>
          )}

          <div className="mt-8 flex w-full flex-col gap-3">
            <Button
              onClick={handleRefresh}
              disabled={loading}
              className="w-full rounded-full shadow-md transition-all duration-200"
            >
              {loading ? "Checking status..." : "Refresh Status"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowHelp(true)}
              className="w-full rounded-full border-border bg-transparent text-heading hover:bg-surface/50"
            >
              Get Help
            </Button>
          </div>
        </div>
      </GlassCard>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          />
          <GlassCard className="relative z-10 w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-heading font-jakarta">
              Need Assistance?
            </h3>
            <p className="mt-2 text-sm text-body">
              If your account verification is taking too long, please contact support.
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-mono text-slate-600 border border-slate-100">
              support@poornima.org
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                className="flex-1 rounded-full bg-primary text-white"
                onClick={() =>
                  (window.location.href =
                    "mailto:support@poornima.org?subject=CMS%20Account%20Verification")
                }
              >
                Send Email
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-full"
                onClick={() => setShowHelp(false)}
              >
                Close
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
