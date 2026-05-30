import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import type { KillSwitchState } from "@/lib/types";

/**
 * Current global kill-switch state. Gates a site-wide banner, so it uses a
 * short staleTime (2s) to react quickly after a toggle elsewhere. Not polled —
 * useSetKillSwitch invalidates this key on change.
 *
 * GET /admin/kill-switch → KillSwitchState
 */
export function useKillSwitch() {
  return useQuery<KillSwitchState>({
    queryKey: queryKeys.killSwitch(),
    queryFn: () => apiFetch<KillSwitchState>("/admin/kill-switch"),
    staleTime: 2_000,
  });
}

/**
 * Engage / release the global kill switch.
 *
 * POST /admin/kill-switch { enabled } → KillSwitchState
 *
 * Optimistically flips the cached banner state so the UI reacts instantly,
 * rolls back on error, and invalidates on settle to reconcile with the server.
 */
export function useSetKillSwitch() {
  const queryClient = useQueryClient();

  return useMutation<
    KillSwitchState,
    Error,
    boolean,
    { previous: KillSwitchState | undefined }
  >({
    mutationFn: (enabled: boolean) =>
      apiFetch<KillSwitchState>("/admin/kill-switch", {
        method: "POST",
        body: JSON.stringify({ enabled }),
      }),
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.killSwitch() });
      const previous = queryClient.getQueryData<KillSwitchState>(
        queryKeys.killSwitch()
      );
      queryClient.setQueryData<KillSwitchState>(queryKeys.killSwitch(), {
        enabled,
      });
      return { previous };
    },
    onError: (_err, _enabled, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.killSwitch(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.killSwitch() });
    },
  });
}
