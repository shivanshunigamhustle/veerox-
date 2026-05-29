"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Prompts, Tool } from "@/lib/types";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Settings2, Wrench, Bot, AlertCircle } from "lucide-react";

interface AdminSettings {
  environment: string;
  default_org_id: string;
  [key: string]: unknown;
}

import { ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="max-w-3xl">
      <CardHeader className="cursor-pointer select-none" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          </div>
          <ChevronRight size={15} className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        </div>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [prompts, setPrompts] = useState<Prompts | null>(null);
  const [promptsError, setPromptsError] = useState<string | null>(null);
  const [promptsLoading, setPromptsLoading] = useState(true);

  const [tools, setTools] = useState<Tool[] | null>(null);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [toolsLoading, setToolsLoading] = useState(true);

  useEffect(() => {
    apiFetch<AdminSettings>("/admin/settings")
      .then(setSettings)
      .catch((err: unknown) =>
        setSettingsError(
          err instanceof Error ? err.message : "Failed to load settings"
        )
      )
      .finally(() => setSettingsLoading(false));

    apiFetch<Prompts>("/admin/prompts")
      .then(setPrompts)
      .catch((err: unknown) =>
        setPromptsError(
          err instanceof Error ? err.message : "Failed to load prompts"
        )
      )
      .finally(() => setPromptsLoading(false));

    apiFetch<Tool[]>("/admin/tools")
      .then(setTools)
      .catch((err: unknown) =>
        setToolsError(
          err instanceof Error ? err.message : "Failed to load tools"
        )
      )
      .finally(() => setToolsLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Read-only view of backend configuration and agent tools</p>
      </div>

      <div className="flex flex-col gap-5">
        {settingsLoading && (
          <div className="h-32 rounded-2xl bg-white border border-slate-200 animate-pulse max-w-3xl" />
        )}

        {settingsError && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 max-w-3xl">❌ {settingsError}</div>
        )}

        {!settingsLoading && !settingsError && settings && (
          <Card className="max-w-3xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 size={16} className="text-slate-500" />
                <h2 className="text-sm font-bold text-slate-800">Backend Config</h2>
                <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  {settings.environment}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-slate-100">
                <div className="flex justify-between py-3 text-sm">
                  <dt className="text-slate-500 font-medium">Environment</dt>
                  <dd className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">{settings.environment}</dd>
                </div>
                <div className="flex justify-between py-3 text-sm">
                  <dt className="text-slate-500 font-medium">Default Org ID</dt>
                  <dd className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded break-all">{settings.default_org_id}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        <CollapsibleSection title="Active Prompts" icon={<Bot size={15} className="text-slate-400" />}>
          {promptsLoading && <div className="h-24 rounded-xl bg-slate-50 animate-pulse" />}
          {promptsError && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">❌ {promptsError}</div>}
          {!promptsLoading && !promptsError && prompts && (
            <div className="flex flex-col gap-4">
              {[["base", prompts.base], ["voice_append", prompts.voice_append], ["whatsapp_append", prompts.whatsapp_append]].map(([label, val]) => (
                <div key={label}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</p>
                  <pre className="rounded-xl bg-slate-900 text-slate-100 border border-slate-700 p-4 text-xs whitespace-pre-wrap break-words font-mono leading-relaxed">
                    {val}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Registered Tools" icon={<Wrench size={15} className="text-slate-400" />}>
          {toolsLoading && <div className="h-24 rounded-xl bg-slate-50 animate-pulse" />}
          {toolsError && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">❌ {toolsError}</div>}
          {!toolsLoading && !toolsError && tools && tools.length === 0 && (
            <p className="text-slate-500 text-sm">No tools registered.</p>
          )}
          {!toolsLoading && !toolsError && tools && tools.length > 0 && (
            <div className="flex flex-col gap-4">
              {tools.map((tool, idx) => {
                const name = tool.function?.name ?? (typeof tool.name === "string" ? tool.name : `tool_${idx}`);
                return (
                  <div key={`${name}_${idx}`}>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 mb-1.5">{name}</p>
                    <pre className="rounded-xl bg-slate-900 text-slate-100 border border-slate-700 p-4 text-xs whitespace-pre-wrap break-words font-mono leading-relaxed">
                      {JSON.stringify(tool, null, 2)}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}
