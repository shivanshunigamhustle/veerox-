"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Conversation } from "@/lib/types";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

interface ChannelBadgeProps {
  channel: Conversation["channel"];
}

function ChannelBadge({ channel }: ChannelBadgeProps) {
  if (channel === "voice") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
        <span aria-hidden>🎙</span>
        Voice
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      <span aria-hidden>💬</span>
      WhatsApp
    </span>
  );
}

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Conversation[]>("/admin/conversations")
      .then(setConversations)
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : "Failed to load conversations"
        )
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        Conversations
      </h1>

      {loading && <p className="text-gray-500 text-sm">Loading…</p>}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {!loading && !error && conversations.length === 0 && (
        <p className="text-gray-500 text-sm">No conversations yet.</p>
      )}

      {!loading && !error && conversations.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <Table>
            <thead>
              <TableRow isHeader>
                <TableHeader>Live</TableHeader>
                <TableHeader>User</TableHeader>
                <TableHeader>Channel</TableHeader>
                <TableHeader>Started</TableHeader>
                <TableHeader>Ended</TableHeader>
                <TableHeader># Messages</TableHeader>
              </TableRow>
            </thead>
            <tbody>
              {conversations.map((c) => {
                const isLive = c.ended_at === null;
                return (
                  <TableRow
                    key={c.id}
                    onClick={() => router.push(`/conversations/${c.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      {isLive ? (
                        <span
                          className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse"
                          aria-label="Live conversation"
                          title="Live"
                        />
                      ) : (
                        <span className="inline-block h-2 w-2" aria-hidden />
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-blue-600 font-medium">
                        {c.user_id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ChannelBadge channel={c.channel} />
                    </TableCell>
                    <TableCell>{formatDate(c.started_at)}</TableCell>
                    <TableCell>{formatDate(c.ended_at)}</TableCell>
                    <TableCell>{c.message_count ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
