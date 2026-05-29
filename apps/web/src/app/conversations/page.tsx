"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Conversation } from "@/lib/types";
import { Table, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Mic, MessageSquare, AlertCircle, Inbox } from "lucide-react";

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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
        <Mic size={11} /> Voice
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <MessageSquare size={11} /> WhatsApp
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
        setError(err instanceof Error ? err.message : "Failed to load conversations")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Conversations</h1>
        <p className="mt-1 text-sm text-slate-500">All voice and WhatsApp sessions with your AI agent</p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 mb-6 flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />{error}
        </div>
      )}

      {!loading && !error && conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <Inbox size={40} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No conversations yet</p>
          <p className="text-slate-400 text-sm mt-1">Conversations will appear here when the agent starts talking</p>
        </div>
      )}

      {!loading && !error && conversations.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <thead>
              <TableRow isHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>User</TableHeader>
                <TableHeader>Channel</TableHeader>
                <TableHeader>Started</TableHeader>
                <TableHeader>Ended</TableHeader>
                <TableHeader>Messages</TableHeader>
              </TableRow>
            </thead>
            <tbody>
              {conversations.map((c) => {
                const isLive = c.ended_at === null;
                return (
                  <TableRow key={c.id} onClick={() => router.push(`/conversations/${c.id}`)} className="cursor-pointer">
                    <TableCell>
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                          Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                          Ended
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                        {c.user_id.slice(0, 8)}…
                      </span>
                    </TableCell>
                    <TableCell><ChannelBadge channel={c.channel} /></TableCell>
                    <TableCell className="text-slate-500 text-xs">{formatDate(c.started_at)}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{formatDate(c.ended_at)}</TableCell>
                    <TableCell>
                      <span className="font-bold text-slate-800">{c.message_count ?? "—"}</span>
                    </TableCell>
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
