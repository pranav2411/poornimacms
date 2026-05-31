"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StepForm({
  steps,
  currentStep,
  className,
  children,
}: {
  steps: string[];
  currentStep: number;
  className?: string;
  children: React.ReactNode;
}) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="font-medium text-heading">{steps[currentStep]}</span>
        <span>Step {currentStep + 1} of {steps.length}</span>
      </div>
      <div className="h-1 w-full rounded-full bg-border/70">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={`step-${currentStep}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
