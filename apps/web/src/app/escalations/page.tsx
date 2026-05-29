"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { AlertCircle, CheckCircle2, Radio, ClipboardList } from "lucide-react";
import type {
  Escalation,
  EscalationsResponse,
  HandoffQueueEntry,
  Lead,
} from "@/lib/types";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function urgencyClass(urgency: string): string {
  const u = (urgency ?? "").toLowerCase();
  if (u === "high" || u === "urgent" || u === "critical") return "bg-red-100 text-red-700";
  if (u === "medium" || u === "med") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

// Map a persisted Lead row (intent='escalation') into the unified row shape.
// reason/urgency live in metadata_ — see apps/api/core/tools.py:transfer_to_human.
function leadToEscalation(lead: Lead): Escalation {
  const meta = lead.metadata_ ?? {};
  return {
    source: "lead",
    id: lead.id,
    created_at: lead.created_at,
    user_id: lead.user_id,
    user_phone: lead.phone,
    reason: typeof meta.reason === "string" ? meta.reason : "—",
    urgency: typeof meta.urgency === "string" ? meta.urgency : "medium",
    conversation_id: null, // Lead rows don't carry conversation_id today.
  };
}

// Map a live Redis-queue entry into the unified row shape. The queue entry
// doesn't carry a phone (only user_id), so phone shows as "—".
function queueEntryToEscalation(entry: HandoffQueueEntry): Escalation {
  return {
    source: "queue",
    created_at: entry.requested_at,
    user_id: entry.user_id,
    user_phone: null,
    reason: entry.reason,
    urgency: entry.urgency ?? "medium",
    conversation_id: null,
  };
}

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<EscalationsResponse>("/admin/escalations")
      .then((resp) => {
        // Flatten: queue entries first (newest live requests), then persisted
        // leads. De-duplicate is not necessary today — a queue entry becomes a
        // lead only after an operator handles it, which removes it from queue.
        const fromQueue = (resp.queue ?? []).map(queueEntryToEscalation);
        const fromLeads = (resp.recent_leads ?? []).map(leadToEscalation);
        setEscalations([...fromQueue, ...fromLeads]);
      })
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : "Failed to load escalations"
        )
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Escalations</h1>
        <p className="mt-1 text-sm text-slate-500">
          Live <code className="font-mono bg-slate-100 px-1 rounded text-xs">transfer_to_human</code> events — queue rows are pending pickup, lead rows are history.
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 mb-6 flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />{error}
        </div>
      )}

      {!loading && !error && escalations.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <CheckCircle2 size={40} className="text-emerald-400 mb-3" />
          <p className="text-slate-500 font-medium">No pending escalations</p>
          <p className="text-slate-400 text-sm mt-1">All clear — no human handoffs needed right now</p>
        </div>
      )}

      {!loading && !error && escalations.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <thead>
              <TableRow isHeader>
                <TableHeader>Source</TableHeader>
                <TableHeader>Created</TableHeader>
                <TableHeader>User Phone</TableHeader>
                <TableHeader>Reason</TableHeader>
                <TableHeader>Urgency</TableHeader>
                <TableHeader>Conversation</TableHeader>
              </TableRow>
            </thead>
            <tbody>
              {escalations.map((e, idx) => (
                <TableRow key={e.id ?? `${e.source}_${e.created_at}_${idx}`}>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${e.source === "queue" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                      {e.source === "queue" ? <><Radio size={11} /> Live</> : <><ClipboardList size={11} /> Lead</>}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{formatDate(e.created_at)}</TableCell>
                  <TableCell><span className="font-mono text-xs text-slate-600">{e.user_phone ?? "—"}</span></TableCell>
                  <TableCell className="max-w-xs truncate text-slate-700">{e.reason}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${urgencyClass(e.urgency)}`}>
                      {e.urgency}
                    </span>
                  </TableCell>
                  <TableCell>
                    {e.conversation_id ? (
                      <Link href={`/conversations/${e.conversation_id}`} className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm hover:underline">
                        Open →
                      </Link>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
