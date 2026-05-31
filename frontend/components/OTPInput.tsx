"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function OTPInput({
  length = 6,
  onChange,
  className,
}: {
  length?: number;
  onChange?: (value: string) => void;
  className?: string;
}) {
  const [values, setValues] = useState(() => Array.from({ length }, () => ""));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    onChange?.(values.join(""));
  }, [values, onChange]);

  const updateValue = (index: number, value: string) => {
    setValues((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleChange = (index: number, rawValue: string) => {
    const digits = rawValue.replace(/\D/g, "");
    if (!digits) {
      updateValue(index, "");
      return;
    }

    const nextValues = [...values];
    let currentIndex = index;

    digits.split("").forEach((digit) => {
      if (currentIndex < length) {
        nextValues[currentIndex] = digit;
        currentIndex += 1;
      }
    });

    setValues(nextValues);
    const nextInput = inputsRef.current[Math.min(currentIndex, length - 1)];
    nextInput?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (event.key === "Backspace" && !values[index] && index > 0) {
      const prevInput = inputsRef.current[index - 1];
      prevInput?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {values.map((value, index) => (
        <input
          key={`otp-${index}`}
          ref={(element) => {
            inputsRef.current[index] = element;
          }}
          value={value}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          inputMode="numeric"
          maxLength={1}
          className="h-12 w-12 rounded-xl border border-border bg-surface/70 text-center font-mono text-lg text-heading shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      ))}
    </div>
  );
}
