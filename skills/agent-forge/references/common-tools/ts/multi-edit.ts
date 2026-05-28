/**
 * multi-edit — apply a sequence of find/replace edits atomically to a single file
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 *
 * Adaptation notes:
 *   - As-is: works with mastra, openai-agents-sdk-ts, langgraph-ts, vercel-ai-sdk
 *     (AI SDK tool shape)
 *   - For other AI SDK callers: import the underlying `multiEditImpl` function and rewrap
 *
 * Behavior:
 *   - Reads the file ONCE, applies edits sequentially in memory, then writes ONCE.
 *   - Edit N+1 sees the result of edit N (sequential semantics).
 *   - All-or-nothing: if ANY edit fails to apply, nothing is written and the
 *     underlying file remains untouched.
 *
 * Security notes:
 *   - Path traversal blocked by default (same as file-edit / file-write).
 *   - `allow_outside_cwd` is a CALLER option (second arg), NOT model-exposed.
 *   - Atomic write: write to .tmp + rename. Cross-device fallback to copy+unlink.
 */

import { tool } from "ai";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface MultiEditOptions {
  /** Allow paths outside the resolved cwd. Default false. */
  allow_outside_cwd?: boolean;
  /** Base cwd for traversal check. Defaults to process.cwd(). */
  cwd?: string;
}

export interface MultiEditItem {
  oldString: string;
  newString: string;
  replaceAll?: boolean;
}

export interface MultiEditResult {
  path: string;
  replacements_per_edit: number[];
  total_replacements: number;
}

function resolveSafe(p: string, opts: MultiEditOptions): string {
  const base = path.resolve(opts.cwd ?? process.cwd());
  const resolved = path.resolve(base, p);
  if (!opts.allow_outside_cwd) {
    if (resolved !== base && !resolved.startsWith(base + path.sep)) {
      throw new Error(`path traversal blocked: ${p} resolves outside ${base}`);
    }
  }
  return resolved;
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

export async function multiEditImpl(
  args: { path: string; edits: MultiEditItem[] },
  opts: MultiEditOptions = {},
): Promise<MultiEditResult> {
  if (!Array.isArray(args.edits) || args.edits.length === 0) {
    throw new Error("edits must be a non-empty array");
  }
  // Pre-validate every edit BEFORE any I/O. Fail fast on shape errors.
  for (let i = 0; i < args.edits.length; i++) {
    const e = args.edits[i]!;
    if (e.oldString === e.newString) {
      throw new Error(`edit ${i}: oldString and newString are identical`);
    }
    if (e.oldString.length === 0) {
      throw new Error(`edit ${i}: oldString must be non-empty`);
    }
  }

  const resolved = resolveSafe(args.path, opts);
  const original = await fs.readFile(resolved, "utf8");

  // Apply edits sequentially IN MEMORY. If any fails, throw — original is untouched.
  let working = original;
  const replacements_per_edit: number[] = [];
  for (let i = 0; i < args.edits.length; i++) {
    const e = args.edits[i]!;
    const occurrences = countOccurrences(working, e.oldString);
    if (occurrences === 0) {
      throw new Error(
        `edit ${i}: oldString not found in ${args.path} (after ${i} prior edits)`,
      );
    }
    if (occurrences > 1 && !e.replaceAll) {
      throw new Error(
        `edit ${i}: oldString found ${occurrences} times; pass replaceAll:true or include more context to make it unique`,
      );
    }
    working = e.replaceAll
      ? working.split(e.oldString).join(e.newString)
      : working.replace(e.oldString, e.newString);
    replacements_per_edit.push(e.replaceAll ? occurrences : 1);
  }

  // If we got here, every edit applied cleanly. Now write atomically.
  // No-op shortcut: working === original is impossible given the per-edit
  // checks (each must produce at least one replacement of a non-identical
  // old/new), so we always write.
  const tmp = `${resolved}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  await fs.writeFile(tmp, working, "utf8");
  try {
    await fs.rename(tmp, resolved);
  } catch {
    await fs.copyFile(tmp, resolved);
    await fs.unlink(tmp);
  }

  const total_replacements = replacements_per_edit.reduce((a, b) => a + b, 0);
  return { path: args.path, replacements_per_edit, total_replacements };
}

export default tool({
  description:
    "Apply a sequence of find/replace edits atomically to a single file. " +
    "Edits are applied in order; edit N+1 sees the result of edit N. " +
    "All-or-nothing: if any edit fails (oldString missing, non-unique without replaceAll, " +
    "or old===new), nothing is written. Atomic write.",
  inputSchema: z.object({
    path: z.string().describe("Absolute or cwd-relative file path."),
    edits: z
      .array(
        z.object({
          oldString: z
            .string()
            .describe("Exact substring to find. Must be unique unless replaceAll is true."),
          newString: z.string().describe("Replacement substring. Must differ from oldString."),
          replaceAll: z
            .boolean()
            .optional()
            .describe("If true, replace every occurrence in this edit. Default false."),
        }),
      )
      .min(1)
      .describe("Sequence of edits applied in order. Edit N+1 sees the result of edit N."),
  }),
  execute: async (input) => multiEditImpl(input),
});
