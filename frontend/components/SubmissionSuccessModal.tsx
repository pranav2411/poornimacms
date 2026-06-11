"use client";

import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import type { Complaint } from "@/lib/types";

export default function SubmissionSuccessModal({
  open,
  complaint,
  onClose,
  onViewDashboard,
}: {
  open: boolean;
  complaint: Complaint | null;
  onClose: () => void;
  onViewDashboard: () => void;
}) {
  if (!complaint) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-lg px-6"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <GlassCard className="p-8 text-center glass-grid" glow>
              <div className="flex flex-col items-center">
                {/* Animated Green Checkmark Ring */}
                <motion.div
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-fixed/15 text-fixed border-2 border-fixed/30"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-10 w-10 stroke-fixed"
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <motion.path
                      d="M20 6L9 17l-5-5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    />
                  </svg>
                </motion.div>

                <h3 className="mt-6 text-xl font-bold text-heading">
                  Complaint Registered!
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Your complaint has been successfully submitted and logged.
                </p>

                {/* Complaint Details Card */}
                <div className="mt-6 w-full rounded-2xl border border-border bg-surface/40 p-4 text-left backdrop-blur-sm">
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="text-muted">Complaint ID</span>
                      <span className="font-mono font-semibold text-primary">
                        {complaint.id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Room / Location</span>
                      <span className="font-medium text-heading">
                        {complaint.room}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Category</span>
                      <span className="font-medium text-heading">
                        {complaint.category}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-muted whitespace-nowrap">Title</span>
                      <span className="font-medium text-heading text-right line-clamp-1">
                        {complaint.title}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    onClick={onViewDashboard}
                    className="flex-1 rounded-2xl border-primary bg-primary text-surface hover:bg-transparent hover:text-primary transition h-11"
                  >
                    Go to Dashboard
                  </Button>
                  <Button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-2xl border border-border bg-surface text-heading hover:bg-transparent transition h-11"
                  >
                    Submit Another
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
