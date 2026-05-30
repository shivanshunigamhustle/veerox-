import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  /** Optional Lucide icon shown in the corner accent. */
  icon?: LucideIcon;
  /** Gradient accent bar at the top of the card. */
  accent?: string;
  className?: string;
}

/**
 * Single headline metric for the dashboard (UI plan §7.2). Style-only — the
 * page feeds it already-formatted values via the `format` helpers.
 */
export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent = "from-indigo-500 to-violet-500",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80 transition-opacity group-hover:opacity-100",
          accent,
        )}
      />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </p>
        {Icon && <Icon size={16} className="shrink-0 text-slate-300" aria-hidden />}
      </div>
      <p className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">
        {value}
      </p>
      {sublabel && <p className="mt-2 text-xs text-slate-400">{sublabel}</p>}
    </div>
  );
}

export default StatCard;
