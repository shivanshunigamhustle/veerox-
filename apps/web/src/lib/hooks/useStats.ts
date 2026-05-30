import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { POLL, queryKeys } from "@/lib/query";
import type { Stats } from "@/lib/types";

/**
 * Dashboard headline metrics. Polls every 10s (POLL.dashboard) so the
 * operator's stat cards stay fresh without a manual refresh.
 *
 * GET /admin/stats → Stats
 */
export function useStats() {
  return useQuery<Stats>({
    queryKey: queryKeys.stats(),
    queryFn: () => apiFetch<Stats>("/admin/stats"),
    refetchInterval: POLL.dashboard,
  });
}
