"use client";

import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import OTPInput from "@/components/OTPInput";
import GlassButton from "@/components/GlassButton";

export default function VendorOtpPage() {
  const [otp, setOtp] = useState("");
  const isValid = otp.length === 6;

  return (
    <DashboardShell
      role="vendor"
      title="OTP Verification"
      subtitle="Confirm the faculty approval"
      userName="Ravi Kumar"
      avatarUrl="/user-no-av.png"
    >
      <div className="mx-auto max-w-xl">
        <GlassCard className="p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            OTP verification
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-heading">
            Enter the 6-digit code
          </h2>
          <p className="mt-2 text-sm text-muted">
            The faculty will receive an OTP when you mark the issue fixed.
          </p>
          <div className="mt-6 flex justify-center">
            <OTPInput onChange={setOtp} />
          </div>
          <div className="mt-8 flex justify-center">
            <GlassButton
              label="Confirm Fix"
              disabled={!isValid}
              className="w-48"
            />
          </div>
        </GlassCard>
      </div>
    </DashboardShell>
  );
}
