/**
 * ApprovalPanel — HITL approve/reject for pending agent tool calls.
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 *
 * Adapted from wiki-agent's renderer/components/ApprovalPanel.tsx. Generalized:
 *   - Decoupled from Electron IPC. The host wires `onApprove(id)` / `onReject(id)`
 *     to its own transport (window.api.* for Electron, fetch('/api/approve') for
 *     web).
 *   - `streamId` removed — caller uses a single `id` per request.
 *   - The per-tool preview was inlined for `wiki_edit_page` in the original;
 *     here, `renderToolPreview` lets each caller decide how to visualize args
 *     (e.g. compose with DiffView for edit-style tools).
 *
 * Tech-stack coupling:
 *   - React 19
 *   - Tailwind v4 (utility classes only; no @theme tokens hardcoded)
 *   - NO shadcn imports — plain <button> + <details> so this works unmodified
 *     in both web-ts and electron-ts starters.
 *
 * Behaviour: empty list => returns null (no decorative chrome). Cards animate
 * to max-height: 0 over 200ms before unmounting, so removal feels smooth.
 */

'use client';

import * as React from 'react';

export interface ApprovalRequest {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  summary?: string;
}

export interface ApprovalPanelProps {
  requests: ApprovalRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  renderToolPreview?: (req: ApprovalRequest) => React.ReactNode;
  className?: string;
}

const REMOVAL_MS = 200;

export function ApprovalPanel({
  requests,
  onApprove,
  onReject,
  renderToolPreview,
  className,
}: ApprovalPanelProps) {
  // Track ids that have been "resolved" — kept in the DOM during the collapse
  // transition, then dropped from `visible` once their timer fires.
  const [removing, setRemoving] = React.useState<Set<string>>(new Set());

  const beginRemove = React.useCallback((id: string) => {
    setRemoving((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setTimeout(() => {
      setRemoving((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, REMOVAL_MS);
  }, []);

  if (requests.length === 0) return null;

  // Newest-on-top.
  const ordered = [...requests].reverse();

  return (
    <div
      data-testid="approval-panel"
      role="region"
      aria-label="Pending tool approvals"
      className={[
        'flex flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-50/40 p-2 dark:bg-amber-950/20',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
        Pending approvals ({requests.length})
      </div>
      {ordered.map((req) => (
        <ApprovalCard
          key={req.id}
          request={req}
          removing={removing.has(req.id)}
          renderToolPreview={renderToolPreview}
          onApprove={(id) => {
            beginRemove(id);
            onApprove(id);
          }}
          onReject={(id) => {
            beginRemove(id);
            onReject(id);
          }}
        />
      ))}
    </div>
  );
}

interface ApprovalCardProps {
  request: ApprovalRequest;
  removing: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  renderToolPreview?: (req: ApprovalRequest) => React.ReactNode;
}

function ApprovalCard({
  request,
  removing,
  onApprove,
  onReject,
  renderToolPreview,
}: ApprovalCardProps) {
  return (
    <div
      data-testid={`approval-card-${request.id}`}
      style={{
        maxHeight: removing ? 0 : 800,
        opacity: removing ? 0 : 1,
        overflow: 'hidden',
        transition: `max-height ${REMOVAL_MS}ms ease, opacity ${REMOVAL_MS}ms ease`,
      }}
      className="rounded border border-amber-500/30 bg-card/70 p-2 text-xs"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono font-medium text-amber-700 dark:text-amber-300">
          {request.toolName}
        </span>
        {request.summary && (
          <span className="truncate text-muted-foreground" title={request.summary}>
            {request.summary}
          </span>
        )}
      </div>
      <details
        data-testid={`approval-details-${request.id}`}
        className="group mb-2 rounded border border-border/40"
      >
        <summary className="cursor-pointer select-none px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground">
          Show details
        </summary>
        <div className="border-t border-border/40 p-2">
          {renderToolPreview ? (
            renderToolPreview(request)
          ) : (
            <DefaultPreview args={request.args} />
          )}
        </div>
      </details>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onApprove(request.id)}
          data-testid={`approve-${request.id}`}
          disabled={removing}
          className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => onReject(request.id)}
          data-testid={`reject-${request.id}`}
          disabled={removing}
          className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

const MAX_PREVIEW = 2000;

function DefaultPreview({ args }: { args: Record<string, unknown> }) {
  let text: string;
  try {
    text = JSON.stringify(args, null, 2);
  } catch {
    text = String(args);
  }
  const truncated = text.length > MAX_PREVIEW;
  const shown = truncated ? text.slice(0, MAX_PREVIEW) + '\n...[truncated]' : text;
  return (
    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
      {shown}
    </pre>
  );
}
