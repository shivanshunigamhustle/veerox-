// TypeScript types matching the backend's Pydantic schemas (apps/api/schemas/).
// Keep these in sync with the DB models defined in diagrams.md §5.

export interface Conversation {
  id: string;
  user_id: string;
  channel: "voice" | "whatsapp";
  started_at: string;
  ended_at: string | null;
  message_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  channel: string;
  tokens_in: number | null;
  tokens_out: number | null;
  audio_secs: number | null;
  created_at: string;
}

export interface Lead {
  id: string;
  org_id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  intent: string | null;
  // Backend column is named "metadata" but the SQLAlchemy attribute is
  // `metadata_` (to avoid shadowing SQLAlchemy's DeclarativeBase.metadata).
  // Pydantic serialises it back out as "metadata_" — keep that name here.
  metadata_: Record<string, unknown> | null;
  created_at: string;
}

// One entry sitting in the Redis human_handoff_queue. Shape produced by
// apps/api/core/tools.py:transfer_to_human.
export interface HandoffQueueEntry {
  reason: string;
  urgency: string;
  user_id: string | null;
  org_id: string;
  requested_at: string;
}

export interface Stats {
  users_today: number;
  calls_today: number;
  leads_today: number;
  p50_turn_latency_ms: number | null;
  usd_spend_today?: number | null;
  error_count_today?: number | null;
}

export interface Prompts {
  base: string;
  voice_append: string;
  whatsapp_append: string;
}

// Tool JSON schemas exposed by GET /admin/tools.
// Shape is a passthrough of the OpenAI tool definitions stored server-side.
export interface Tool {
  type?: string;
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
  // The endpoint returns the raw tool schemas — keep an index signature so
  // the UI can render any extra fields without losing type-safety on the
  // documented ones above.
  [key: string]: unknown;
}

// Response shape from GET /admin/escalations — backend returns both:
//   recent_leads: persisted Lead rows with intent='escalation'
//   queue:       live entries from the Redis human_handoff_queue
// The UI flattens these into a unified display list.
export interface EscalationsResponse {
  recent_leads: Lead[];
  queue: HandoffQueueEntry[];
}

// Unified row shape the escalations table actually renders.
export interface Escalation {
  source: "lead" | "queue";
  id?: string;
  created_at: string;
  user_id: string | null;
  user_phone: string | null;
  reason: string;
  urgency: string;
  conversation_id?: string | null;
}

export interface KillSwitchState {
  enabled: boolean;
}

export interface OutboundWhatsAppResponse {
  status: string;
  phone: string;
  text: string;
  // Meta Graph API message id — null when the backend's META_ACCESS_TOKEN
  // is unset (local-dev fallback returns status="queued" with no real send).
  wa_message_id: string | null;
}

export interface OutboundCallResponse {
  call_sid: string;
  status?: string;
}
