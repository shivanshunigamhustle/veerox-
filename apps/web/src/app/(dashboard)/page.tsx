"use client";

import {
  AlertTriangle,
  DollarSign,
  PhoneCall,
  Sparkles,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { QueryBoundary } from "@/components/layout/query-boundary";
import { StatCard } from "@/components/dashboard/stat-card";
import { KillSwitchBanner } from "@/components/dashboard/kill-switch-banner";
import { Skeleton, useToast } from "@/components/ui";
import { useStats, useKillSwitch, useSetKillSwitch } from "@/lib/hooks";
import { formatUsd } from "@/lib/format";

function StatCardSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-9 w-16" />
          <Skeleton className="mt-3 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const stats = useStats();
  const killSwitch = useKillSwitch();
  const setKillSwitch = useSetKillSwitch();
  const { toast } = useToast();

  const enabled = killSwitch.data?.enabled ?? false;

  function handleToggle(next: boolean) {
    setKillSwitch.mutate(next, {
      onSuccess: () =>
        toast({
          title: next ? "Agent paused" : "Agent resumed",
          description: next
            ? "Incoming messages now receive a hold response."
            : "The agent is answering messages again.",
          variant: next ? "info" : "success",
        }),
      onError: (err) =>
        toast({
          title: "Could not update the kill switch",
          description: err.message,
          variant: "error",
        }),
    });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of your Veerox AI agent"
      />

      {/* Kill-switch control reflects server state once loaded. */}
      {!killSwitch.isLoading && !killSwitch.isError && (
        <KillSwitchBanner
          enabled={enabled}
          loading={setKillSwitch.isPending}
          onToggle={handleToggle}
        />
      )}

      <QueryBoundary
        isLoading={stats.isLoading}
        isError={stats.isError}
        error={stats.error}
        onRetry={() => stats.refetch()}
        loadingFallback={<StatCardSkeletons />}
      >
        {stats.data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Users Today"
              value={stats.data.users_today}
              icon={Users}
              accent="from-indigo-500 to-violet-500"
            />
            <StatCard
              label="Calls Today"
              value={stats.data.calls_today}
              icon={PhoneCall}
              accent="from-sky-500 to-cyan-500"
            />
            <StatCard
              label="Leads Today"
              value={stats.data.leads_today}
              icon={Sparkles}
              accent="from-emerald-500 to-teal-500"
            />
            <StatCard
              label="USD Spend Today"
              value={formatUsd(stats.data.usd_spend_today)}
              sublabel="LLM + audio cost"
              icon={DollarSign}
              accent="from-rose-500 to-pink-500"
            />
            <StatCard
              label="Errors Today"
              value={stats.data.error_count_today ?? 0}
              sublabel={
                stats.data.p50_turn_latency_ms != null
                  ? `p50 latency ${stats.data.p50_turn_latency_ms} ms`
                  : "p50 latency —"
              }
              icon={AlertTriangle}
              accent="from-amber-500 to-orange-500"
            />
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
