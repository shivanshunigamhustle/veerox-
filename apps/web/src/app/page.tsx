"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { KillSwitchState, Stats } from "@/lib/types";
import StatCard from "@/components/stat-card";
import Button from "@/components/ui/button";
import { Pause, Play, AlertCircle, CheckCircle2 } from "lucide-react";

function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `$${value.toFixed(2)}`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [paused, setPaused] = useState<boolean>(false);
  const [killSwitchError, setKillSwitchError] = useState<string | null>(null);
  const [killSwitchBusy, setKillSwitchBusy] = useState(false);

  useEffect(() => {
    apiFetch<Stats>("/admin/stats")
      .then(setStats)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load stats")
      )
      .finally(() => setLoading(false));

    apiFetch<KillSwitchState>("/admin/kill-switch")
      .then((state) => setPaused(Boolean(state.enabled)))
      .catch((err: unknown) =>
        setKillSwitchError(
          err instanceof Error
            ? err.message
            : "Failed to load kill-switch state"
        )
      );
  }, []);

  async function toggleKillSwitch() {
    const next = !paused;
    setKillSwitchBusy(true);
    setKillSwitchError(null);
    try {
      const state = await apiFetch<KillSwitchState>("/admin/kill-switch", {
        method: "POST",
        body: JSON.stringify({ enabled: next }),
      });
      setPaused(Boolean(state.enabled));
    } catch (err: unknown) {
      setKillSwitchError(
        err instanceof Error ? err.message : "Failed to toggle kill-switch"
      );
    } finally {
      setKillSwitchBusy(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Real-time overview of your Veerox AI agent</p>
        </div>
        <Button
          onClick={toggleKillSwitch}
          disabled={killSwitchBusy}
          variant={paused ? "default" : "ghost"}
          className={paused ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 gap-2" : "border border-red-300 text-red-600 hover:bg-red-50 gap-2"}
        >
          {killSwitchBusy ? "Working…" : paused ? <><Play size={14} /> Resume Agent</> : <><Pause size={14} /> Pause Agent</>}
        </Button>
      </div>

      {/* Paused banner */}
      {paused && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-red-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-red-200">
          <AlertCircle size={18} className="shrink-0" />
          Agent is PAUSED — incoming messages will receive a hold response.
        </div>
      )}

      {killSwitchError && (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
          {killSwitchError}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 mb-6 flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />{error}
        </div>
      )}

      {/* Stat cards */}
      {!loading && !error && stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Users Today" value={stats.users_today} accent="from-indigo-500 to-violet-500" />
            <StatCard label="Calls Today" value={stats.calls_today} accent="from-sky-500 to-cyan-500" />
            <StatCard label="Leads Today" value={stats.leads_today} accent="from-emerald-500 to-teal-500" />
            <StatCard
              label="p50 Turn Latency"
              value={stats.p50_turn_latency_ms != null ? `${stats.p50_turn_latency_ms} ms` : "—"}
              sublabel="median response time"
              accent="from-amber-500 to-orange-500"
            />
            <StatCard
              label="USD Spend Today"
              value={formatUsd(stats.usd_spend_today)}
              sublabel="LLM + audio cost"
              accent="from-rose-500 to-pink-500"
            />
          </div>

          {/* Quick status */}
          <div className="mt-6 rounded-2xl bg-white border border-slate-200 px-6 py-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Agent Status</p>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${paused ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                {paused ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                {paused ? "Paused" : "Live & Running"}
              </span>
              <span className="text-sm text-slate-400">·</span>
              <span className="text-sm text-slate-500">Errors today: <strong className="text-slate-800">{stats.error_count_today ?? 0}</strong></span>
            </div>
          </div>
        </>
      )}

      {!loading && !error && !stats && (
        <p className="text-slate-500 text-sm">No stats available yet.</p>
      )}
    </div>
  );
}
