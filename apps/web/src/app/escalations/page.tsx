"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
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
  if (u === "high" || u === "urgent" || u === "critical") {
    return "bg-red-100 text-red-700";
  }
  if (u === "medium" || u === "med") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-gray-100 text-gray-700";
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
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
        Escalations
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Live <code className="font-mono text-xs">transfer_to_human</code> events
        from the agent. <span className="text-amber-700">Live queue</span> rows
        are pending operator pickup; <span className="text-gray-500">Lead</span>{" "}
        rows are persisted history.
      </p>

      {loading && <p className="text-gray-500 text-sm">Loading…</p>}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {!loading && !error && escalations.length === 0 && (
        <p className="text-gray-500 text-sm">No pending escalations.</p>
      )}

      {!loading && !error && escalations.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
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
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        e.source === "queue"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {e.source === "queue" ? "Live queue" : "Lead"}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(e.created_at)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {e.user_phone ?? "—"}
                  </TableCell>
                  <TableCell>{e.reason}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${urgencyClass(
                        e.urgency
                      )}`}
                    >
                      {e.urgency}
                    </span>
                  </TableCell>
                  <TableCell>
                    {e.conversation_id ? (
                      <Link
                        href={`/conversations/${e.conversation_id}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Open
                      </Link>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
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
