"use client";

import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { QueryBoundary } from "@/components/layout/query-boundary";
import {
  Badge,
  EmptyState,
  SkeletonRows,
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { ChannelBadge } from "@/components/conversations/channel-badge";
import { LiveDot } from "@/components/conversations/live-dot";
import { useConversations } from "@/lib/hooks";
import { formatDateTime } from "@/lib/format";

const COLUMNS = ["Live", "Channel", "Started", "Ended", "# Messages"] as const;

export default function ConversationsPage() {
  const router = useRouter();
  const conversations = useConversations();

  const rows = conversations.data ?? [];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Conversations"
        description="All voice and WhatsApp sessions with your AI agent"
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <thead>
            <TableRow isHeader>
              {COLUMNS.map((col) => (
                <TableHeader key={col}>{col}</TableHeader>
              ))}
            </TableRow>
          </thead>
          <tbody>
            <QueryBoundaryRows
              isLoading={conversations.isLoading}
              isError={conversations.isError}
              error={conversations.error}
              isEmpty={!conversations.isLoading && rows.length === 0}
              onRetry={() => conversations.refetch()}
            >
              {rows.map((c) => {
                const isLive = c.ended_at === null;
                return (
                  <TableRow
                    key={c.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open conversation ${c.id}`}
                    onClick={() => router.push(`/conversations/${c.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/conversations/${c.id}`);
                      }
                    }}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                  >
                    <TableCell>
                      {isLive ? (
                        <LiveDot />
                      ) : (
                        <Badge variant="ended">Ended</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <ChannelBadge channel={c.channel} />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDateTime(c.started_at)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDateTime(c.ended_at)}
                    </TableCell>
                    <TableCell className="font-bold text-slate-800">
                      {c.message_count ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </QueryBoundaryRows>
          </tbody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Wraps QueryBoundary's loading/empty/error states in a full-width table row so
 * they render correctly inside `<tbody>`. Loading shows skeleton rows; empty and
 * error span all columns.
 */
function QueryBoundaryRows({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isEmpty: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return <SkeletonRows rows={6} cols={COLUMNS.length} />;
  }

  if (isError || isEmpty) {
    return (
      <tr>
        <td colSpan={COLUMNS.length} className="p-0">
          <QueryBoundary
            isLoading={false}
            isError={isError}
            error={error}
            isEmpty={isEmpty}
            onRetry={onRetry}
            emptyFallback={
              <EmptyState
                icon={Inbox}
                title="No conversations yet"
                description="Conversations appear here once the agent starts talking to a user."
                className="border-0"
              />
            }
          >
            {null}
          </QueryBoundary>
        </td>
      </tr>
    );
  }

  return <>{children}</>;
}
