import { Badge } from "@/components/ui/badge";
import type { Conversation } from "@/lib/types";

export interface ChannelBadgeProps {
  channel: Conversation["channel"];
}

/**
 * Channel indicator (UI plan §8.2): voice = indigo + mic, WhatsApp = emerald +
 * message. Color is never the only signal — the Badge primitive pairs each
 * variant with an icon and we render the channel name as text.
 */
export function ChannelBadge({ channel }: ChannelBadgeProps) {
  if (channel === "voice") {
    return <Badge variant="voice">Voice</Badge>;
  }
  return <Badge variant="whatsapp">WhatsApp</Badge>;
}

export default ChannelBadge;
