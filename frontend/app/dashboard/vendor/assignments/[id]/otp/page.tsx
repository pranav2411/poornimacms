"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import GlassCard from "@/components/GlassCard";
import OTPInput from "@/components/OTPInput";
import GlassButton from "@/components/GlassButton";
import { verifyOtp } from "@/lib/api";
import { useToast } from "@/lib/toast";

export default function VendorOtpPage() {
  const { addToast } = useToast();
  const params = useParams<{ id: string }>();
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isValid = otp.length === 6;

  const handleSubmit = async () => {
    if (!isValid || !params.id) return;
    setIsSubmitting(true);
    try {
      await verifyOtp(params.id, otp);
      addToast({
        title: "OTP verified",
        description: "Work completion confirmed.",
      });
      setOtp("");
    } catch (error) {
      addToast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Invalid OTP",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              label={isSubmitting ? "Verifying..." : "Confirm Fix"}
              disabled={!isValid || isSubmitting}
              className="w-48"
              onClick={handleSubmit}
            />
          </div>
        </GlassCard>
      </div>
    </DashboardShell>
  );
}
