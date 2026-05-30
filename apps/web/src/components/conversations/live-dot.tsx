import { cn } from "@/lib/utils";

export interface LiveDotProps {
  /** Optional visible label rendered next to the dot. */
  label?: string;
  className?: string;
}

/**
 * Pulsing amber dot marking an in-progress conversation (UI plan §8.2 —
 * live = amber + pulsing dot). Carries an accessible label so the live state
 * is announced and not conveyed by color alone (a11y §10).
 */
export function LiveDot({ label = "Live", className }: LiveDotProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700", className)}
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
      </span>
      <span className="sr-only">Live conversation</span>
      {label && <span aria-hidden>{label}</span>}
    </span>
  );
}

export default LiveDot;
