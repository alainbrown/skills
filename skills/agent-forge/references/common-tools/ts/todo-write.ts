/**
 * todo-write — agent self-tracking todo list
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 *
 * Persists the agent's current todo list to <cwd>/.agent-todos.json.
 * The agent re-emits the COMPLETE list each call; this tool replaces the file.
 *
 * UI rendering:
 *   See references/ui-components/{web,cli}/TodoList — they watch this file
 *   (chokidar / fs.watch) and render the list visibly. The tool is the agent's
 *   interface; the file is the storage; the UI is the presenter.
 *
 * Why a file (not in-memory):
 *   - Survives agent restarts (mid-session crash recovery)
 *   - Decouples the tool from the UI — UI watches the file, no IPC needed
 *
 * Why replace-whole-list (not append/update):
 *   - Matches Claude Code's TodoWrite — the agent always re-emits the full list.
 *   - Simpler tool surface; no consistency bugs around removed-vs-omitted items.
 *
 * Adaptation notes:
 *   - As-is: works with mastra, openai-agents-sdk-ts, langgraph-ts, vercel-ai-sdk
 *
 * Security notes:
 *   - Atomic write to .tmp + rename. No cross-FS fallback needed; default path
 *     lives in the agent's cwd which is the same FS as the rename target.
 *   - Default path is `.agent-todos.json` relative to process.cwd(). Override
 *     via the impl-only `todo_file` option (NOT model-exposed).
 */

import { tool } from "ai";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_TODO_PATH = ".agent-todos.json";

export type TodoStatus = "pending" | "in_progress" | "completed";

export interface TodoItem {
  text: string;
  status: TodoStatus;
}

export interface TodoWriteOptions {
  /** Override the storage path. Default: `<cwd>/.agent-todos.json`. */
  todo_file?: string;
  /** Base cwd. Defaults to process.cwd(). */
  cwd?: string;
}

export interface TodoWriteResult {
  path: string;
  count: number;
  by_status: { pending: number; in_progress: number; completed: number };
}

export async function todoWriteImpl(
  args: { todos: TodoItem[] },
  opts: TodoWriteOptions = {},
): Promise<TodoWriteResult> {
  // Defense-in-depth: zod already validates, but guard against direct impl callers.
  if (!Array.isArray(args.todos)) {
    throw new Error("todos must be an array");
  }
  for (let i = 0; i < args.todos.length; i++) {
    const t = args.todos[i]!;
    if (typeof t.text !== "string" || t.text.length === 0) {
      throw new Error(`todo ${i}: text must be a non-empty string`);
    }
    if (t.status !== "pending" && t.status !== "in_progress" && t.status !== "completed") {
      throw new Error(`todo ${i}: status must be pending|in_progress|completed`);
    }
  }

  const base = path.resolve(opts.cwd ?? process.cwd());
  const target = path.resolve(base, opts.todo_file ?? DEFAULT_TODO_PATH);

  const by_status = { pending: 0, in_progress: 0, completed: 0 };
  for (const t of args.todos) by_status[t.status]++;

  const payload = {
    version: 1,
    updated_at: new Date().toISOString(),
    todos: args.todos.map((t) => ({ text: t.text, status: t.status })),
  };

  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(payload, null, 2) + "\n", "utf8");
  try {
    await fs.rename(tmp, target);
  } catch {
    // Cross-FS fallback (rare for cwd-local files but cheap insurance).
    await fs.copyFile(tmp, target);
    await fs.unlink(tmp);
  }

  return {
    path: target,
    count: args.todos.length,
    by_status,
  };
}

export default tool({
  description:
    "Replace the current todo list. Use this to plan multi-step work and track progress as you go. " +
    "Statuses: pending (not started), in_progress (currently working on), completed (done). " +
    "Always include the FULL list — the previous list is replaced. The UI watches this list.",
  inputSchema: z.object({
    todos: z
      .array(
        z.object({
          text: z
            .string()
            .min(1)
            .max(500)
            .describe("Short description of the task (1-500 chars)."),
          status: z
            .enum(["pending", "in_progress", "completed"])
            .describe("pending = not started; in_progress = active now; completed = done."),
        }),
      )
      .describe("Full todo list. Replaces the previous list."),
  }),
  execute: async (input) => todoWriteImpl(input),
});
