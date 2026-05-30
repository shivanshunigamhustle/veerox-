"use client";

import { CheckCircle2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { QueryBoundary } from "@/components/layout/query-boundary";
import { EscalationTable } from "@/components/escalations/escalation-table";
import { EmptyState, SkeletonRows, Table } from "@/components/ui";
import { useEscalations } from "@/lib/hooks";
import type { Escalation, HandoffQueueEntry, Lead } from "@/lib/types";

/**
 * Map a persisted Lead row (intent='escalation') into the unified row shape.
 * reason/urgency live in metadata_ — see apps/api/core/tools.py:transfer_to_human.
 */
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

/**
 * Map a live Redis-queue entry into the unified row shape. The queue entry
 * doesn't carry a phone (only user_id), so phone shows as "—".
 */
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
  const { data, isLoading, isError, error, refetch } = useEscalations();

  // Flatten: queue entries first (live, pending pickup), then persisted leads
  // (history). A queue entry becomes a lead only after it's handled, which
  // removes it from the queue — so no de-dup is needed today.
  const escalations: Escalation[] = [
    ...(data?.queue ?? []).map(queueEntryToEscalation),
    ...(data?.recent_leads ?? []).map(leadToEscalation),
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Escalations"
        description="Live transfer_to_human events — queue rows are pending pickup, lead rows are history."
      />

      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={escalations.length === 0}
        onRetry={() => refetch()}
        loadingFallback={
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Table>
              <tbody>
                <SkeletonRows rows={4} cols={6} />
              </tbody>
            </Table>
          </div>
        }
        emptyFallback={
          <EmptyState
            icon={CheckCircle2}
            title="No pending escalations"
            description="All clear — no human handoffs needed right now."
          />
        }
      >
        <EscalationTable escalations={escalations} />
      </QueryBoundary>
    </div>
  );
}
