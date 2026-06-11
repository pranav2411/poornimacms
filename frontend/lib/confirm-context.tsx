"use client";

import React, { createContext, useContext, useState, useRef } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, HelpCircle } from "lucide-react";

export type ConfirmOptions = {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning";
};

type ConfirmContextType = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    setOptions(options);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
    }
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {isOpen && options && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative z-10 w-full max-w-md"
            >
              <GlassCard className="p-6 border border-border shadow-2xl bg-surface/95" glow={options.variant === "destructive"}>
                <div className="flex gap-4">
                  {/* Icon Area */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      options.variant === "destructive"
                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                        : options.variant === "warning"
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        : "bg-primary/10 text-primary border border-primary/20"
                    }`}
                  >
                    {options.variant === "destructive" || options.variant === "warning" ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <HelpCircle className="h-5 w-5" />
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-heading font-jakarta leading-6">
                      {options.title || "Confirm Action"}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-body">
                      {options.description}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="rounded-full px-5 text-xs h-9 cursor-pointer"
                  >
                    {options.cancelText || "Cancel"}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirm}
                    className={`rounded-full px-5 text-xs h-9 font-semibold transition-all duration-200 cursor-pointer ${
                      options.variant === "destructive"
                        ? "bg-red-600 border-red-600 text-white hover:bg-transparent hover:text-red-600"
                        : options.variant === "warning"
                        ? "bg-amber-500 border-amber-500 text-white hover:bg-transparent hover:text-amber-500"
                        : "bg-primary border-primary text-white hover:bg-transparent hover:text-primary"
                    }`}
                  >
                    {options.confirmText || "Confirm"}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
