"use client";

import { useState, type ReactNode } from "react";
import { Bot, ChevronRight, Wrench } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { QueryBoundary } from "@/components/layout/query-boundary";
import { Card, CardContent, CardHeader, Skeleton } from "@/components/ui";
import { usePrompts, useTools } from "@/lib/hooks";
import type { Prompts, Tool } from "@/lib/types";

interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = `section-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <Card className="max-w-3xl">
      <CardHeader className="p-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex w-full items-center justify-between px-6 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
        >
          <span className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-bold text-slate-800">{title}</span>
          </span>
          <ChevronRight
            size={15}
            aria-hidden
            className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          />
        </button>
      </CardHeader>
      {open && (
        <CardContent id={contentId}>{children}</CardContent>
      )}
    </Card>
  );
}

function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-slate-100">
      {children}
    </pre>
  );
}

function PromptsBlocks({ prompts }: { prompts: Prompts }) {
  const entries: Array<[string, string]> = [
    ["base", prompts.base],
    ["voice_append", prompts.voice_append],
    ["whatsapp_append", prompts.whatsapp_append],
  ];
  return (
    <div className="flex flex-col gap-4">
      {entries.map(([label, value]) => (
        <div key={label}>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {label}
          </p>
          <CodeBlock>{value || "—"}</CodeBlock>
        </div>
      ))}
    </div>
  );
}

function ToolsBlocks({ tools }: { tools: Tool[] }) {
  return (
    <div className="flex flex-col gap-4">
      {tools.map((tool, idx) => {
        const name =
          tool.function?.name ??
          (typeof tool.name === "string" ? tool.name : `tool_${idx}`);
        return (
          <div key={`${name}_${idx}`}>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-indigo-500">
              {name}
            </p>
            <CodeBlock>{JSON.stringify(tool, null, 2)}</CodeBlock>
          </div>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const prompts = usePrompts();
  const tools = useTools();

  const loadingFallback = <Skeleton className="h-24 w-full rounded-xl" />;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Settings"
        description="Read-only view of the agent's active prompts and registered tools."
      />

      <div className="flex flex-col gap-5">
        <CollapsibleSection
          title="Active Prompts"
          icon={<Bot size={15} aria-hidden className="text-slate-400" />}
          defaultOpen
        >
          <QueryBoundary
            isLoading={prompts.isLoading}
            isError={prompts.isError}
            error={prompts.error}
            onRetry={() => prompts.refetch()}
            loadingFallback={loadingFallback}
          >
            {prompts.data && <PromptsBlocks prompts={prompts.data} />}
          </QueryBoundary>
        </CollapsibleSection>

        <CollapsibleSection
          title="Registered Tools"
          icon={<Wrench size={15} aria-hidden className="text-slate-400" />}
        >
          <QueryBoundary
            isLoading={tools.isLoading}
            isError={tools.isError}
            error={tools.error}
            isEmpty={(tools.data?.length ?? 0) === 0}
            onRetry={() => tools.refetch()}
            loadingFallback={loadingFallback}
            emptyFallback={
              <p className="text-sm text-slate-500">No tools registered.</p>
            }
          >
            {tools.data && <ToolsBlocks tools={tools.data} />}
          </QueryBoundary>
        </CollapsibleSection>
      </div>
    </div>
  );
}
