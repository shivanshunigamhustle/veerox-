"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { KillSwitchState, Stats } from "@/lib/types";
import StatCard from "@/components/stat-card";
import Button from "@/components/ui/button";

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
    <div>
      {paused && (
        <div className="mb-6 rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-sm">
          Agent is PAUSED — incoming messages will receive a hold response.
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <Button
          onClick={toggleKillSwitch}
          disabled={killSwitchBusy}
          variant={paused ? "default" : "ghost"}
          className={
            paused
              ? ""
              : "border border-red-300 text-red-700 hover:bg-red-50"
          }
        >
          {killSwitchBusy
            ? "Working…"
            : paused
              ? "Resume Agent"
              : "Pause Agent"}
        </Button>
      </div>

      {killSwitchError && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {killSwitchError}
        </div>
      )}

      {loading && (
        <p className="text-gray-500 text-sm">Loading stats…</p>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {!loading && !error && stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Users Today" value={stats.users_today} />
          <StatCard label="Calls Today" value={stats.calls_today} />
          <StatCard label="Leads Today" value={stats.leads_today} />
          <StatCard
            label="p50 Turn Latency"
            value={
              stats.p50_turn_latency_ms !== null &&
              stats.p50_turn_latency_ms !== undefined
                ? `${stats.p50_turn_latency_ms} ms`
                : "—"
            }
            sublabel="median response time"
          />
          <StatCard
            label="USD Spend Today"
            value={formatUsd(stats.usd_spend_today)}
            sublabel="LLM + audio cost"
          />
        </div>
      )}

      {!loading && !error && !stats && (
        <p className="text-gray-500 text-sm">No stats available yet.</p>
      )}
    </div>
  );
}
