"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Lead } from "@/lib/types";
import { Table, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Users, AlertCircle, Filter } from "lucide-react";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [intent, setIntent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback((intentFilter: string) => {
    setLoading(true);
    setError(null);
    const path = intentFilter
      ? `/admin/leads?intent=${encodeURIComponent(intentFilter)}`
      : "/admin/leads";
    apiFetch<Lead[]>(path)
      .then(setLeads)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load leads")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLeads(intent);
  }, [intent, fetchLeads]);

  const intentColors: Record<string, string> = {
    book_appointment: "bg-indigo-100 text-indigo-700",
    product_inquiry:  "bg-sky-100 text-sky-700",
    support:          "bg-amber-100 text-amber-700",
    other:            "bg-slate-100 text-slate-600",
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">Captured leads from all agent conversations</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="intent-filter" className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
            <Filter size={12} /> Intent
          </label>
          <select
            id="intent-filter"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="">All</option>
            <option value="book_appointment">Book Appointment</option>
            <option value="product_inquiry">Product Inquiry</option>
            <option value="support">Support</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 mb-6 flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />{error}
        </div>
      )}

      {!loading && !error && leads.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <Users size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No leads yet</p>
          <p className="text-slate-400 text-sm mt-1">Leads will appear when the agent captures contact info</p>
        </div>
      )}

      {!loading && !error && leads.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <thead>
              <TableRow isHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Phone</TableHeader>
                <TableHeader>Intent</TableHeader>
                <TableHeader>Created</TableHeader>
              </TableRow>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <span className="font-semibold text-slate-800">{lead.name ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-slate-600">{lead.phone ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${intentColors[lead.intent ?? "other"] ?? intentColors.other}`}>
                      {lead.intent ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDate(lead.created_at)}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
