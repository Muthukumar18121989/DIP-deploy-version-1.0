import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, opts: { compact?: boolean } = {}): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.compact ? 1 : 0,
    notation: opts.compact ? "compact" : "standard",
  }).format(value);
}

export function formatPercent(value: number, opts: { signed?: boolean } = {}): string {
  const sign = opts.signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

/** Recharts Tooltip `formatter` values are typed loosely (string | number | array) — normalize to a display string. */
export function formatTooltipCurrency(value: unknown): string {
  return typeof value === "number" ? formatCurrency(value) : String(value);
}
