"use client";

import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AssignVendorModal({
  open,
  onClose,
  vendors,
  onAssign,
}: {
  open: boolean;
  onClose: () => void;
  vendors: string[];
  onAssign: (vendor: string) => void;
}) {
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
                    Assign Vendor
                  </p>
                  <p className="text-sm text-muted">
                    Choose a vendor to dispatch for this complaint.
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
              <div className="mt-4 grid gap-3">
                {vendors.map((vendor) => (
                  <Button
                    key={vendor}
                    type="button"
                    onClick={() => onAssign(vendor)}
                    size="lg"
                    className={cn(
                      "justify-start border-border bg-surface text-heading hover:bg-transparent hover:text-heading",
                      "hover:border-accent/60"
                    )}
                  >
                    {vendor}
                  </Button>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
