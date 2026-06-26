"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";

export default function RequestVendorChangeModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
      setReason("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-lg px-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold text-heading">
                    Request Vendor Change
                  </p>
                  <p className="text-sm text-muted">
                    Explain why you find this job undoable.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={onClose}
                  size="icon-sm"
                  aria-label="Close"
                  className="border-red-500 bg-red-500 text-white hover:bg-transparent hover:text-red-500"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12" />
                    <path d="M6 18L18 6" />
                  </svg>
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Reason for Request
                  </label>
                  <textarea
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter the reason why you can't do this job..."
                    rows={4}
                    className="w-full rounded-2xl border border-border bg-surface/50 p-3 text-sm text-heading outline-none focus:border-primary focus:bg-surface resize-none transition-all duration-200"
                  />
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="rounded-full border border-border hover:bg-surface"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={submitting}
                    className="rounded-full border-primary text-primary hover:bg-primary hover:text-white transition-all duration-200"
                  >
                    {submitting ? "Sending..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
