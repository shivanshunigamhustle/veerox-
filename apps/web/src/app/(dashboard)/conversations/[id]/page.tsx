"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { QueryBoundary } from "@/components/layout/query-boundary";
import { EmptyState, Skeleton } from "@/components/ui";
import { TranscriptBubble } from "@/components/conversations/transcript-bubble";
import { LiveDot } from "@/components/conversations/live-dot";
import { useConversations, useConversationMessages } from "@/lib/hooks";
import { formatRelative } from "@/lib/format";

function TranscriptSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={i % 2 === 0 ? "flex flex-col items-start gap-1" : "flex flex-col items-end gap-1"}
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-12 w-64 rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

export default function TranscriptPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : (params.id?.[0] ?? "");

  // The messages endpoint doesn't report whether the conversation has ended, so
  // we read ended_at from the (already cached + polled) conversation list. If
  // the row isn't found we default to live so we don't prematurely stop polling.
  const conversations = useConversations();
  const conversation = conversations.data?.find((c) => c.id === id);
  const isLive = conversation ? conversation.ended_at === null : true;

  const messages = useConversationMessages(id, { isLive });
  const rows = messages.data ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/conversations"
        className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <ArrowLeft size={15} aria-hidden />
        Conversations
      </Link>

      <PageHeader
        title="Transcript"
        description={`Conversation ${id}`}
        action={
          isLive && messages.dataUpdatedAt ? (
            <LiveDot label={`Live · updated ${formatRelative(new Date(messages.dataUpdatedAt).toISOString())}`} />
          ) : undefined
        }
      />

      <QueryBoundary
        isLoading={messages.isLoading}
        isError={messages.isError}
        error={messages.error}
        isEmpty={!messages.isLoading && rows.length === 0}
        onRetry={() => messages.refetch()}
        loadingFallback={<TranscriptSkeleton />}
        emptyFallback={
          <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            description="This conversation has no transcript to show. Messages appear here as the agent and user talk."
          />
        }
      >
        <div className="flex max-w-2xl flex-col gap-4">
          {rows.map((msg) => (
            <TranscriptBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={msg.created_at}
              isVoice={msg.channel === "voice" || (msg.audio_secs ?? 0) > 0}
            />
          ))}
        </div>
      </QueryBoundary>
    </div>
  );
}
