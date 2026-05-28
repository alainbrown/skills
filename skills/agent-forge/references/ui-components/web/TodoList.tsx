/**
 * TodoList — render the agent's self-tracking todos with status icons + counts.
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 *
 * Pairs with the `todo-write` tool (persists to .agent-todos.json by default).
 *
 * Tech-stack coupling:
 *   - React 19 (uses React.useEffect/useState; no concurrent-only APIs)
 *   - Tailwind v4 (uses @theme tokens for colors; plain utility classes here)
 *   - NO shadcn imports — uses plain HTML elements so the same file works
 *     unmodified in both web-ts and electron-ts starters.
 *
 * Hook coupling:
 *   - `useTodosFile` is a polling default. It expects `fetch(path)` to return
 *     JSON. That works in Next.js (file served from /public) and in any web
 *     project with a /api endpoint. ELECTRON: replace the hook body with
 *     `window.api.watchFile(path, cb)` — IPC-driven, no polling. WEB+BACKEND:
 *     swap to SSE/WS subscription. Do not auto-detect — own the choice.
 */

'use client';

import * as React from 'react';

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface Todo {
  text: string;
  status: TodoStatus;
}

export interface TodoListProps {
  todos: Todo[];
  className?: string;
}

const STATUS_ICON: Record<TodoStatus, string> = {
  pending: '○',
  in_progress: '◐',
  completed: '●',
};

const STATUS_LABEL: Record<TodoStatus, string> = {
  pending: 'pending',
  in_progress: 'in progress',
  completed: 'completed',
};

function countByStatus(todos: Todo[]): Record<TodoStatus, number> {
  const counts: Record<TodoStatus, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
  };
  for (const t of todos) counts[t.status]++;
  return counts;
}

export function TodoList({ todos, className }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div
        data-testid="todo-list-empty"
        className={[
          'rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground',
          className ?? '',
        ]
          .join(' ')
          .trim()}
      >
        No todos yet &mdash; the agent will add tasks as it plans.
      </div>
    );
  }

  const counts = countByStatus(todos);
  const summary = `${todos.length} todo${todos.length === 1 ? '' : 's'} · ${counts.in_progress} in progress · ${counts.completed} completed`;

  return (
    <div
      data-testid="todo-list"
      className={[
        'flex flex-col rounded-md border border-border bg-card/60 text-sm',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      <div
        data-testid="todo-list-header"
        className="sticky top-0 z-10 rounded-t-md border-b border-border/60 bg-card/95 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur"
      >
        {summary}
      </div>
      <ol className="flex flex-col gap-1 p-2" aria-label="Agent todos">
        {todos.map((todo, i) => (
          <TodoRow key={`${i}-${todo.text}`} todo={todo} />
        ))}
      </ol>
    </div>
  );
}

function TodoRow({ todo }: { todo: Todo }) {
  const isCompleted = todo.status === 'completed';
  const isInProgress = todo.status === 'in_progress';
  return (
    <li
      data-testid={`todo-row-${todo.status}`}
      aria-label={`${STATUS_LABEL[todo.status]}: ${todo.text}`}
      className={[
        'flex items-start gap-2 rounded px-2 py-1 text-sm',
        isInProgress ? 'animate-pulse bg-muted/30' : '',
        isCompleted ? 'text-muted-foreground line-through' : '',
      ]
        .join(' ')
        .trim()}
    >
      <span
        aria-hidden="true"
        className={[
          'mt-0.5 select-none font-mono text-xs',
          isCompleted ? 'text-emerald-600' : '',
          isInProgress ? 'text-amber-500' : '',
        ]
          .join(' ')
          .trim()}
      >
        {STATUS_ICON[todo.status]}
      </span>
      <span className="flex-1 break-words">{todo.text}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// useTodosFile — polling default. Swap for IPC/SSE in your host project.
// ---------------------------------------------------------------------------

export interface UseTodosFileResult {
  todos: Todo[];
  loading: boolean;
  error: string | null;
}

export function useTodosFile(
  path = '.agent-todos.json',
  intervalMs = 1000,
): UseTodosFileResult {
  const [todos, setTodos] = React.useState<Todo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) {
          // 404 => no todos yet; surface as empty, not error.
          if (res.status === 404) {
            if (!cancelled) {
              setTodos([]);
              setError(null);
              setLoading(false);
            }
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as Todo[];
        if (!cancelled) {
          setTodos(Array.isArray(data) ? data : []);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    }

    void load();
    const id = setInterval(() => void load(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [path, intervalMs]);

  return { todos, loading, error };
}
