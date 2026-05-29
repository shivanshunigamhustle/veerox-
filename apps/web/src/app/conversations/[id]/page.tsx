"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { Message } from "@/lib/types";
import TranscriptBubble from "@/components/transcript-bubble";

const POLL_INTERVAL_MS = 5000;

export default function TranscriptPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function poll() {
      try {
        const data = await apiFetch<Message[]>(
          `/admin/conversations/${id}/messages`
        );
        if (cancelled) return;
        setMessages(data);
        setError(null);
        setLastUpdated(new Date());
      } catch (err: unknown) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load transcript"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Initial fetch immediately, then every 5 sec.
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/conversations"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Conversations
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Transcript</h1>
        {lastUpdated && (
          <span className="ml-auto text-xs text-gray-400">
            Live · updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-400 font-mono mb-6 break-all">
        Conversation ID: {id}
      </p>

      {loading && <p className="text-gray-500 text-sm">Loading transcript…</p>}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && messages.length === 0 && (
        <p className="text-gray-500 text-sm">No messages in this conversation.</p>
      )}

      {!loading && !error && messages.length > 0 && (
        <div className="flex flex-col gap-3 max-w-2xl">
          {messages.map((msg) => (
            <TranscriptBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={msg.created_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}
