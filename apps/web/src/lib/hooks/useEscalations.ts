import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { POLL, queryKeys } from "@/lib/query";
import type { EscalationsResponse } from "@/lib/types";

/**
 * Escalations feed: persisted escalation leads + the live Redis handoff queue.
 * Polls every 5s (POLL.escalations) — this is time-sensitive operator work.
 *
 * GET /admin/escalations → { recent_leads, queue }
 */
export function useEscalations() {
  return useQuery<EscalationsResponse>({
    queryKey: queryKeys.escalations(),
    queryFn: () => apiFetch<EscalationsResponse>("/admin/escalations"),
    refetchInterval: POLL.escalations,
  });
}
