/**
 * Design tokens — the single source for the visual language (UI plan §8).
 * Components reference these names (or the Tailwind classes they map to) so
 * status colors and channel colors stay consistent across every surface.
 *
 * These are TS constants (not CSS vars) so they're tree-shakeable and usable
 * in logic (e.g. picking a badge variant). Tailwind classes remain the primary
 * styling mechanism; this file documents the canonical mapping.
 */

export const colors = {
  bg: "#f1f5f9", // slate-100  — app background
  surface: "#ffffff", // cards, tables
  sidebar: "#0f172a", // slate-900 — navigation
  primary: "#4f46e5", // indigo-600 — actions, active nav
  text: "#334155", // slate-700 — body
  muted: "#64748b", // slate-500 — secondary text
  success: "#059669", // emerald-600
  warning: "#d97706", // amber-600
  danger: "#dc2626", // red-600
} as const;

export const radii = {
  card: "rounded-xl", // 12px
  container: "rounded-2xl", // 16px
} as const;

/**
 * Status → visual language (UI plan §8.2). Domain badge components map their
 * semantic state to these Tailwind class bundles. Keeping the mapping here
 * means "live is amber, ended is slate" is defined once.
 */
export const statusStyles = {
  live: "bg-amber-100 text-amber-700", // in-progress
  ended: "bg-slate-100 text-slate-600", // done
  success: "bg-emerald-100 text-emerald-700",
  danger: "bg-red-100 text-red-700",
} as const;

/** Channel → color (UI plan §8.2). Voice = indigo, WhatsApp = emerald. */
export const channelStyles = {
  voice: "bg-indigo-100 text-indigo-700",
  whatsapp: "bg-emerald-100 text-emerald-700",
} as const;
