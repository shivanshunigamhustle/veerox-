import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { POLL, queryKeys } from "@/lib/query";
import type { Lead } from "@/lib/types";

export interface LeadFilters {
  intent?: string;
}

function buildLeadsPath(filters?: LeadFilters): string {
  if (filters?.intent) {
    return `/admin/leads?intent=${encodeURIComponent(filters.intent)}`;
  }
  return "/admin/leads";
}

/**
 * Captured leads, newest first. Polls every 30s (POLL.leads). Optional
 * `intent` filter is forwarded to the backend as ?intent=.
 *
 * GET /admin/leads → Lead[]
 */
export function useLeads(filters?: LeadFilters) {
  return useQuery<Lead[]>({
    queryKey: queryKeys.leads(filters),
    queryFn: () => apiFetch<Lead[]>(buildLeadsPath(filters)),
    refetchInterval: POLL.leads,
  });
}
