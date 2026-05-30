import { ClipboardList, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Escalation } from "@/lib/types";

const SOURCE_META: Record<
  Escalation["source"],
  { label: string; cls: string }
> = {
  // Live, pending pickup → amber (matches the "live/in-progress" color, §8.2).
  queue: { label: "Live", cls: "bg-amber-100 text-amber-700" },
  // History → slate.
  lead: { label: "Lead", cls: "bg-slate-100 text-slate-600" },
};

export interface SourceBadgeProps {
  source: Escalation["source"];
  className?: string;
}

/**
 * Pill marking whether an escalation row is a live queue entry (pending pickup)
 * or a persisted lead (history). Color + icon (a11y §10).
 */
export function SourceBadge({ source, className }: SourceBadgeProps) {
  const meta = SOURCE_META[source];
  const Icon = source === "queue" ? Radio : ClipboardList;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        meta.cls,
        className,
      )}
    >
      <Icon size={12} aria-hidden className="shrink-0" />
      {meta.label}
    </span>
  );
}
