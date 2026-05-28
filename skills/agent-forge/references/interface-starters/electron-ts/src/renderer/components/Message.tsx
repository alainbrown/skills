import { useCallback, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ToolInvocation, type ToolInvocationData } from './ToolInvocation';
import { openPath } from '../lib/agent-client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  toolInvocations?: ToolInvocationData[];
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export function Message({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [message.content]);

  const isUser = message.role === 'user';

  // Look for plausible filesystem paths in the message body. If we find any, render
  // each as a click-to-open link that defers to `shell.openPath` in the main process.
  const detectedPaths = useMemo(() => extractPaths(message.content), [message.content]);

  return (
    <div
      data-testid={`message-${message.role}`}
      className={`group relative rounded-xl border px-4 py-3 ${
        isUser
          ? 'self-end border-brand-700/40 bg-brand-900/30 ml-auto max-w-[80%]'
          : 'border-slate-800 bg-slate-900/50 mr-auto max-w-[90%]'
      }`}
    >
      {isUser ? (
        <div className="whitespace-pre-wrap text-sm text-slate-100">{message.content}</div>
      ) : (
        <div className="prose-chat text-sm text-slate-100">
          {message.content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          ) : (
            <span className="text-slate-500 italic">…</span>
          )}
        </div>
      )}

      {message.toolInvocations && message.toolInvocations.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {message.toolInvocations.map((t) => (
            <ToolInvocation key={t.id} invocation={t} />
          ))}
        </div>
      )}

      {detectedPaths.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {detectedPaths.map((p) => (
            <button
              key={p}
              onClick={() => void openPath(p)}
              title={`Open ${p} in the OS file manager`}
              className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 hover:border-brand-500 hover:text-brand-300"
            >
              {truncatePath(p)}
            </button>
          ))}
        </div>
      )}

      {!isUser && message.content && (
        <button
          onClick={copy}
          className="absolute right-2 top-2 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-400 opacity-0 transition group-hover:opacity-100"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
    </div>
  );
}

// Match POSIX-style absolute paths and Windows drive paths. Keep it conservative so we
// don't false-positive on every slashy substring in the markdown.
const PATH_PATTERN = /(?:[A-Za-z]:\\[\w.\\-]+|\/(?:[\w.-]+\/)+[\w.-]+)/g;

function extractPaths(text: string): string[] {
  const matches = text.match(PATH_PATTERN);
  if (!matches) return [];
  // De-dup while preserving order.
  return Array.from(new Set(matches));
}

function truncatePath(p: string, max = 48): string {
  if (p.length <= max) return p;
  return '…' + p.slice(-(max - 1));
}
