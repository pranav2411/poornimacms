"use client";

import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VendorItem } from "@/lib/types";

export default function AssignVendorModal({
  open,
  onClose,
  vendors,
  onAssign,
  isLoading = false,
}: {
  open: boolean;
  onClose: () => void;
  vendors: VendorItem[];
  onAssign: (vendor: VendorItem) => void;
  isLoading?: boolean;
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
                  disabled={isLoading}
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
              <div className="mt-4 grid gap-3 max-h-96 overflow-y-auto pr-1">
                {vendors.map((vendor) => (
                  <Button
                    key={vendor.id}
                    type="button"
                    onClick={() => onAssign(vendor)}
                    disabled={isLoading}
                    className={cn(
                      "flex flex-col items-start justify-center h-auto py-3 px-4 border border-border bg-surface text-heading hover:bg-transparent hover:text-heading",
                      "hover:border-accent/60 w-full transition-all duration-200"
                    )}
                  >
                    <div className="flex w-full justify-between items-center gap-4">
                      <span className="font-semibold text-heading text-sm">{vendor.name}</span>
                      <span className="text-xs text-muted truncate">{vendor.email || ""}</span>
                    </div>
                    <div className="flex w-full justify-between items-center mt-2 text-xs text-muted/80 pt-1.5 border-t border-border/20">
                      <span>Active complaints: <strong className="text-accent">{vendor.activeComplaints ?? 0}</strong></span>
                      <span>Avg resolution: <strong className="text-heading font-medium">{vendor.avgResolutionTime || "N/A"}</strong></span>
                    </div>
                  </Button>
                ))}
                {vendors.length === 0 && (
                  <p className="text-center text-sm text-muted py-4">No vendors available.</p>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
