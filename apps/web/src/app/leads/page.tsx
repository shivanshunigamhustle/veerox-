"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import type { Lead } from "@/lib/types";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";

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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>

        <div className="flex items-center gap-2">
          <label
            htmlFor="intent-filter"
            className="text-sm text-gray-600 font-medium"
          >
            Filter by intent:
          </label>
          <select
            id="intent-filter"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">All</option>
            <option value="book_appointment">Book Appointment</option>
            <option value="product_inquiry">Product Inquiry</option>
            <option value="support">Support</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {loading && <p className="text-gray-500 text-sm">Loading…</p>}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {!loading && !error && leads.length === 0 && (
        <p className="text-gray-500 text-sm">No leads yet.</p>
      )}

      {!loading && !error && leads.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
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
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {lead.intent}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(lead.created_at)}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
