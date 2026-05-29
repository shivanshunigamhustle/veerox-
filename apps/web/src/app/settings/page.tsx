"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Prompts, Tool } from "@/lib/types";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface AdminSettings {
  environment: string;
  default_org_id: string;
  [key: string]: unknown;
}

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="max-w-3xl">
      <CardHeader className="cursor-pointer select-none" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <span className="text-xs text-gray-500 font-mono">
            {open ? "▾" : "▸"}
          </span>
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
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        Read-only view of non-secret backend configuration.
      </p>

      <div className="flex flex-col gap-6">
        {settingsLoading && (
          <p className="text-gray-500 text-sm">Loading…</p>
        )}

        {settingsError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {settingsError}
          </div>
        )}

        {!settingsLoading && !settingsError && settings && (
          <Card className="max-w-3xl">
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-800">
                Backend Config
              </h2>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-gray-100">
                <div className="flex justify-between py-3 text-sm">
                  <dt className="text-gray-500 font-medium">Environment</dt>
                  <dd className="text-gray-900 font-mono">
                    {settings.environment}
                  </dd>
                </div>
                <div className="flex justify-between py-3 text-sm">
                  <dt className="text-gray-500 font-medium">Default Org ID</dt>
                  <dd className="text-gray-900 font-mono text-xs break-all">
                    {settings.default_org_id}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        <CollapsibleSection title="Active Prompts">
          {promptsLoading && (
            <p className="text-gray-500 text-sm">Loading prompts…</p>
          )}
          {promptsError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {promptsError}
            </div>
          )}
          {!promptsLoading && !promptsError && prompts && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  base
                </p>
                <pre className="rounded-md bg-gray-50 border border-gray-200 p-3 text-xs text-gray-800 whitespace-pre-wrap break-words font-mono">
                  {prompts.base}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  voice_append
                </p>
                <pre className="rounded-md bg-gray-50 border border-gray-200 p-3 text-xs text-gray-800 whitespace-pre-wrap break-words font-mono">
                  {prompts.voice_append}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  whatsapp_append
                </p>
                <pre className="rounded-md bg-gray-50 border border-gray-200 p-3 text-xs text-gray-800 whitespace-pre-wrap break-words font-mono">
                  {prompts.whatsapp_append}
                </pre>
              </div>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Registered Tools">
          {toolsLoading && (
            <p className="text-gray-500 text-sm">Loading tools…</p>
          )}
          {toolsError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {toolsError}
            </div>
          )}
          {!toolsLoading && !toolsError && tools && tools.length === 0 && (
            <p className="text-gray-500 text-sm">No tools registered.</p>
          )}
          {!toolsLoading && !toolsError && tools && tools.length > 0 && (
            <div className="flex flex-col gap-4">
              {tools.map((tool, idx) => {
                const name =
                  tool.function?.name ??
                  (typeof tool.name === "string" ? tool.name : `tool_${idx}`);
                return (
                  <div key={`${name}_${idx}`}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      {name}
                    </p>
                    <pre className="rounded-md bg-gray-50 border border-gray-200 p-3 text-xs text-gray-800 whitespace-pre-wrap break-words font-mono">
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
