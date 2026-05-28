import { useState } from 'react';

export interface ToolInvocationData {
  id: string;
  name: string;
  input: unknown;
  output?: unknown;
  isError?: boolean;
  state: 'pending' | 'done';
}

export function ToolInvocation({ invocation }: { invocation: ToolInvocationData }) {
  const [open, setOpen] = useState(false);
  const { name, input, output, state, isError } = invocation;

  return (
    <div
      data-testid="tool-invocation"
      className={`rounded-lg border px-3 py-2 text-xs ${
        isError
          ? 'border-red-900/60 bg-red-950/30'
          : state === 'pending'
            ? 'border-slate-700 bg-slate-900/40'
            : 'border-slate-800 bg-slate-900/60'
      }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isError ? 'bg-red-400' : state === 'pending' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          <span className="font-mono text-slate-200">{name}</span>
          <span className="text-slate-500">{state === 'pending' ? 'running…' : 'complete'}</span>
        </span>
        <span className="text-slate-500">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="mt-2 grid grid-cols-1 gap-2">
          <Block label="input" value={input} />
          {state === 'done' && <Block label={isError ? 'error' : 'output'} value={output} />}
        </div>
      )}
    </div>
  );
}

function Block({ label, value }: { label: string; value: unknown }) {
  const text =
    typeof value === 'string' ? value : safeStringify(value);
  return (
    <div>
      <div className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <pre className="max-h-48 overflow-auto rounded bg-slate-950 px-2 py-1.5 font-mono text-[11px] text-slate-200">
        {text}
      </pre>
    </div>
  );
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
