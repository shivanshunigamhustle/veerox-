import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names safely — clsx handles conditionals, twMerge
 * resolves conflicting utilities (e.g. "px-2 px-4" → "px-4"). This is the
 * helper every `cva`-based primitive composes with.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
