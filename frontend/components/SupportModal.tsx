"use client";

import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";

export default function SupportModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-sm px-4"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <GlassCard className="p-6 text-center shadow-2xl">
              <div className="flex flex-col items-center">
                {/* Headset/Support Icon */}
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary mb-4 animate-pulse">
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
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <path d="M9 10h.01" />
                    <path d="M15 10h.01" />
                    <path d="M12 14c-1.5 0-2-1-2-1h4s-.5 1-2 1" />
                  </svg>
                </div>

                <h3 className="text-xl font-bold text-heading font-jakarta">
                  Contact Support
                </h3>
                <p className="mt-2 text-sm text-body leading-relaxed">
                  Have questions or need assistance? Reach out to our support team directly.
                </p>

                {/* Email Section */}
                <a
                  href="mailto:support@poornima.org?subject=CMS%20Support%20Request"
                  className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-border bg-surface/50 p-4 transition-all duration-200 hover:border-primary hover:bg-primary/5 group text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Email Address
                    </p>
                    <p className="text-sm font-medium text-heading truncate group-hover:text-primary">
                      support@poornima.org
                    </p>
                  </div>
                </a>

                {/* Phone Section */}
                <a
                  href="tel:+919123456789"
                  className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-surface/50 p-4 transition-all duration-200 hover:border-primary hover:bg-primary/5 group text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Phone Number
                    </p>
                    <p className="text-sm font-medium text-heading truncate group-hover:text-primary">
                      +91 9123456789
                    </p>
                  </div>
                </a>

                {/* Close Button */}
                <Button
                  variant="outline"
                  className="mt-6 w-full rounded-full border border-border hover:bg-surface text-heading hover:text-primary hover:border-primary"
                  onClick={onClose}
                >
                  Close
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
