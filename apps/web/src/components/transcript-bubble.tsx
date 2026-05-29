interface TranscriptBubbleProps {
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: string;
}

const ROLE_STYLES: Record<
  TranscriptBubbleProps["role"],
  { wrapper: string; bubble: string; label: string }
> = {
  user: {
    wrapper: "items-end",
    bubble: "bg-blue-600 text-white",
    label: "User",
  },
  assistant: {
    wrapper: "items-start",
    bubble: "bg-gray-100 text-gray-900 border border-gray-200",
    label: "Assistant",
  },
  tool: {
    wrapper: "items-start",
    bubble: "bg-amber-50 text-amber-900 border border-amber-200 font-mono",
    label: "Tool",
  },
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function TranscriptBubble({
  role,
  content,
  timestamp,
}: TranscriptBubbleProps) {
  const styles = ROLE_STYLES[role];

  return (
    <div className={`flex flex-col gap-1 ${styles.wrapper}`}>
      <span className="text-xs text-gray-400 px-1">
        {styles.label} &middot; {formatTime(timestamp)}
      </span>
      <div
        className={`max-w-prose rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${styles.bubble}`}
      >
        {content}
      </div>
    </div>
  );
}
