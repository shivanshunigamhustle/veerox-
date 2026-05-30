import { QueryClient } from "@tanstack/react-query";

/**
 * Single QueryClient factory. Defaults tuned for an operator dashboard:
 * - retry transient failures 3x with backoff
 * - don't refetch on window focus (operators keep the tab open; polling covers freshness)
 * - 30s staleTime baseline; individual queries override refetchInterval for live data
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  });
}

/**
 * Centralized query keys — the single source of truth for cache identity.
 * Mutations invalidate by these keys so the UI reconciles automatically.
 *
 * Convention mirrors the UI plan §6.2.
 */
export const queryKeys = {
  stats: () => ["stats"] as const,
  conversations: (filters?: { channel?: string; status?: string }) =>
    ["conversations", filters ?? {}] as const,
  conversationMessages: (id: string) => ["conversation", id, "messages"] as const,
  leads: (filters?: { intent?: string }) => ["leads", filters ?? {}] as const,
  escalations: () => ["escalations"] as const,
  killSwitch: () => ["kill-switch"] as const,
  prompts: () => ["prompts"] as const,
  tools: () => ["tools"] as const,
  settings: () => ["settings"] as const,
};

/**
 * Polling intervals (ms) per the UI plan §6.3 live-data strategy.
 * Centralized so the cadence is consistent and tunable in one place.
 */
export const POLL = {
  liveConversation: 5_000,
  escalations: 5_000,
  dashboard: 10_000,
  conversationList: 10_000,
  leads: 30_000,
} as const;
