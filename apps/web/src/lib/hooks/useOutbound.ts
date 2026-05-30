import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query";
import type {
  OutboundCallResponse,
  OutboundWhatsAppResponse,
} from "@/lib/types";

export interface OutboundCallInput {
  to_phone: string;
}

/**
 * Place an outbound voice call.
 *
 * POST /admin/outbound/call { to_phone } → OutboundCallResponse
 *
 * A successful dial creates a conversation server-side, so the conversation
 * list and dashboard stats are invalidated to surface it.
 */
export function useOutboundCall() {
  const queryClient = useQueryClient();

  return useMutation<OutboundCallResponse, Error, OutboundCallInput>({
    mutationFn: ({ to_phone }: OutboundCallInput) =>
      apiFetch<OutboundCallResponse>("/admin/outbound/call", {
        method: "POST",
        body: JSON.stringify({ to_phone }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
    },
  });
}

export interface OutboundWhatsAppInput {
  phone: string;
  text: string;
}

/**
 * Send an outbound WhatsApp message.
 *
 * POST /admin/outbound/whatsapp { phone, text } → OutboundWhatsAppResponse
 *
 * The backend persists the assistant turn into a (possibly new) WhatsApp
 * conversation but does not return its id, so we invalidate the conversation
 * list + stats. Pages that have a known conversation id open should additionally
 * invalidate queryKeys.conversationMessages(id) themselves — see report.
 */
export function useOutboundWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation<OutboundWhatsAppResponse, Error, OutboundWhatsAppInput>({
    mutationFn: ({ phone, text }: OutboundWhatsAppInput) =>
      apiFetch<OutboundWhatsAppResponse>("/admin/outbound/whatsapp", {
        method: "POST",
        body: JSON.stringify({ phone, text }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
    },
  });
}
