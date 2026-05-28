'use client';

import * as React from 'react';
import {
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Loader2,
  Wrench,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ToolInvocation } from '@/lib/chat-types';

export function ToolInvocationCard({ tool }: { tool: ToolInvocation }) {
  const [open, setOpen] = React.useState(false);
  const StatusIcon = tool.isError
    ? CircleAlert
    : tool.status === 'pending'
      ? Loader2
      : CircleCheck;

  return (
    <div
      data-testid="tool-invocation"
      className={cn(
        'w-full rounded-lg border border-border bg-muted/30 text-xs',
        tool.isError && 'border-destructive/40 bg-destructive/5',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`tool-${tool.id}-body`}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {open ? (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground" />
        )}
        <Wrench className="size-3.5 text-muted-foreground" />
        <span className="font-mono font-medium">{tool.name}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          <StatusIcon
            className={cn(
              'size-3',
              tool.status === 'pending' && 'animate-spin',
              tool.isError && 'text-destructive',
              !tool.isError && tool.status === 'complete' && 'text-emerald-600',
            )}
          />
          {tool.isError
            ? 'error'
            : tool.status === 'pending'
              ? 'running'
              : 'done'}
        </span>
      </button>

      {open && (
        <div
          id={`tool-${tool.id}-body`}
          className="space-y-2 border-t border-border/60 p-3"
        >
          <Section label="Input">
            <Json value={tool.input} />
          </Section>
          {tool.status === 'complete' && (
            <Section label={tool.isError ? 'Error' : 'Result'}>
              <Json value={tool.result} />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function Json({ value }: { value: unknown }) {
  let text: string;
  try {
    text = JSON.stringify(value, null, 2) ?? 'undefined';
  } catch {
    text = String(value);
  }
  return (
    <pre className="max-h-72 overflow-auto rounded-md bg-background/60 p-2 font-mono text-[11px] leading-relaxed">
      {text}
    </pre>
  );
}
