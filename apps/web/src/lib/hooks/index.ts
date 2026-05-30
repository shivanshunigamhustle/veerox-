// Data-fetching hook layer for the Veerox AI admin dashboard (UI plan §6).
// Pages call these hooks instead of touching apiFetch / useEffect directly.

export { useStats } from "./useStats";
export {
  useConversations,
  useConversationMessages,
  type ConversationFilters,
  type ConversationMessagesOptions,
} from "./useConversations";
export { useLeads, type LeadFilters } from "./useLeads";
export { useEscalations } from "./useEscalations";
export { useKillSwitch, useSetKillSwitch } from "./useKillSwitch";
export { usePrompts, useTools } from "./useConfig";
export {
  useOutboundCall,
  useOutboundWhatsApp,
  type OutboundCallInput,
  type OutboundWhatsAppInput,
} from "./useOutbound";
