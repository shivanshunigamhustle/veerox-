"use client";

import { useState } from "react";
import { Download, Filter, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { QueryBoundary } from "@/components/layout/query-boundary";
import { LeadTable } from "@/components/leads/lead-table";
import { Button, EmptyState, SkeletonRows, Table, useToast } from "@/components/ui";
import { useLeads } from "@/lib/hooks";

const INTENT_OPTIONS = [
  { value: "", label: "All" },
  { value: "book_appointment", label: "Book Appointment" },
  { value: "product_inquiry", label: "Product Inquiry" },
  { value: "support", label: "Support" },
  { value: "other", label: "Other" },
] as const;

const TOKEN_KEY = "veerox_admin_token";

/**
 * Trigger a browser download of the leads CSV. `GET /admin/leads.csv` requires
 * the X-Admin-Token header (see lib/api.ts), so a plain `<a href>` won't work —
 * we fetch with the header, read the body as a Blob, and download it via an
 * object URL. We mirror api.ts's token + base-URL logic rather than editing it.
 */
async function downloadLeadsCsv(): Promise<void> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const token =
    typeof window === "undefined" ? "" : localStorage.getItem(TOKEN_KEY) ?? "";

  const headers: Record<string, string> = {};
  if (token) headers["X-Admin-Token"] = token;

  const res = await fetch(`${base}/admin/leads.csv`, { headers });
  if (!res.ok) {
    throw new Error(`Export failed (${res.status} ${res.statusText})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `leads-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function LeadsPage() {
  const [intent, setIntent] = useState("");
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const filters = intent ? { intent } : undefined;
  const { data, isLoading, isError, error, refetch } = useLeads(filters);
  const leads = data ?? [];

  async function handleExport() {
    setExporting(true);
    try {
      await downloadLeadsCsv();
      toast({ title: "Export started", description: "Your CSV download is ready.", variant: "success" });
    } catch (err: unknown) {
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Could not export leads.",
        variant: "error",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Leads"
        description="Captured leads from all agent conversations"
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="intent-filter"
                className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-slate-400"
              >
                <Filter size={12} aria-hidden /> Intent
              </label>
              <select
                id="intent-filter"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {INTENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              size="md"
              loading={exporting}
              onClick={handleExport}
              disabled={exporting || leads.length === 0}
            >
              {!exporting && <Download size={15} aria-hidden />}
              Export CSV
            </Button>
          </div>
        }
      />

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={leads.length === 0}
        onRetry={() => refetch()}
        loadingFallback={
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Table>
              <tbody>
                <SkeletonRows rows={5} cols={4} />
              </tbody>
            </Table>
          </div>
        }
        emptyFallback={
          <EmptyState
            icon={Users}
            title="No leads yet"
            description="Leads will appear when the agent captures contact info."
          />
        }
      >
        <LeadTable leads={leads} />
      </QueryBoundary>
    </div>
  );
}
