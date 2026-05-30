import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  /** Pixel size of the spinner (passed to the SVG width/height). */
  size?: number;
  className?: string;
  /** Accessible label announced to screen readers. */
  label?: string;
}

/**
 * Small inline loading spinner (Lucide `Loader2` + `animate-spin`).
 * Decorative by default (`aria-hidden`) when paired with text; pass a `label`
 * to make it an announced status indicator on its own.
 */
export function Spinner({ size = 16, className, label }: SpinnerProps) {
  return (
    <Loader2
      size={size}
      className={cn("animate-spin", className)}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

export default Spinner;
