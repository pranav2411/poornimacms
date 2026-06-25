import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "";
  try {
    let date: Date;
    if (typeof dateInput === "string") {
      let normalized = dateInput.trim();
      if (!/[Zz]$|[\+\-]\d{2}:?\d{2}$/.test(normalized)) {
        normalized = normalized + "Z";
      }
      date = new Date(normalized);
    } else {
      date = dateInput;
    }
    if (isNaN(date.getTime())) return String(dateInput);

    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const day = parts.find((p) => p.type === "day")?.value || "";
    const month = parts.find((p) => p.type === "month")?.value || "";
    const fullYear = parts.find((p) => p.type === "year")?.value || "";
    const year = fullYear.slice(-2);
    const hours = parts.find((p) => p.type === "hour")?.value || "";
    const minutes = parts.find((p) => p.type === "minute")?.value || "";

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(dateInput);
  }
}
