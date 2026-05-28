/**
 * TodoList — Ink (CLI) sibling of references/ui-components/web/TodoList.tsx
 *
 * Same prop shape as the web version. Renders to terminal using Ink primitives.
 * The PATTERN is shared (status visualization, sticky header, count summary);
 * the rendering is terminal-specific.
 *
 * Watches the same data source — `.agent-todos.json` written by the `todo-write`
 * common tool. In the CLI host (Ink), poll or fs.watch that file and pass the
 * parsed array in via `todos`.
 *
 * Status markers:
 *   [ ]  pending
 *   [~]  in_progress  (bold)
 *   [x]  completed    (dim, strikethrough-ish)
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 */

import React from 'react';
import { Box, Text } from 'ink';

export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export type Todo = {
  text: string;
  status: TodoStatus;
};

/** Backwards-compatible alias — some callers used `TodoItem`. Prefer `Todo`. */
export type TodoItem = Todo;

export type TodoListProps = {
  todos: Todo[];
  /** Optional title shown above the list. */
  title?: string;
};

function marker(status: TodoStatus): string {
  switch (status) {
    case 'pending':
      return '[ ]';
    case 'in_progress':
      return '[~]';
    case 'completed':
      return '[x]';
  }
}

function colorFor(status: TodoStatus): { color?: string; dimColor?: boolean; bold?: boolean } {
  switch (status) {
    case 'pending':
      return {};
    case 'in_progress':
      return { color: 'yellow', bold: true };
    case 'completed':
      return { dimColor: true };
  }
}

export function TodoList({ todos, title = 'Todos' }: TodoListProps): React.JSX.Element {
  const total = todos.length;
  const done = todos.filter((t) => t.status === 'completed').length;
  const active = todos.filter((t) => t.status === 'in_progress').length;
  const pending = total - done - active;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
      {/* Sticky header — count summary, always pinned at top of the panel. */}
      <Box>
        <Text bold>{title} </Text>
        <Text dimColor>
          ({done}/{total} done
          {active > 0 ? `, ${active} active` : ''}
          {pending > 0 ? `, ${pending} pending` : ''})
        </Text>
      </Box>

      {total === 0 ? (
        <Box marginTop={1}>
          <Text dimColor italic>
            (no todos)
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {todos.map((todo, idx) => {
            const style = colorFor(todo.status);
            return (
              <Box key={idx}>
                <Text {...style}>
                  {marker(todo.status)} {todo.text}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default TodoList;
