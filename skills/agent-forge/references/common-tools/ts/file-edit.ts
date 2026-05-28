/**
 * file-edit — find/replace within a file, atomic write
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 *
 * Adaptation notes:
 *   - As-is: works with mastra, openai-agents-sdk-ts, langgraph-ts (AI SDK tool shape)
 *   - For other AI SDK callers: import the underlying `fileEditImpl` function and rewrap
 *
 * Security notes:
 *   - Path traversal blocked by default (same as file-read/file-write).
 *   - Errors when oldString missing OR non-unique (unless replaceAll). Forces the
 *     caller to provide enough context to disambiguate — Claude Code's pattern.
 *   - Atomic via .tmp + rename.
 */

import { tool } from "ai";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface FileEditOptions {
  /** Allow paths outside the resolved cwd. Default false. */
  allow_outside_cwd?: boolean;
  /** Base cwd for traversal check. Defaults to process.cwd(). */
  cwd?: string;
}

export interface FileEditResult {
  path: string;
  replacements: number;
}

function resolveSafe(p: string, opts: FileEditOptions): string {
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

export async function fileEditImpl(
  args: { path: string; oldString: string; newString: string; replaceAll?: boolean },
  opts: FileEditOptions = {},
): Promise<FileEditResult> {
  if (args.oldString === args.newString) {
    throw new Error("oldString and newString are identical");
  }
  if (args.oldString.length === 0) {
    throw new Error("oldString must be non-empty");
  }
  const resolved = resolveSafe(args.path, opts);
  const content = await fs.readFile(resolved, "utf8");
  const occurrences = countOccurrences(content, args.oldString);
  if (occurrences === 0) {
    throw new Error(`oldString not found in ${args.path}`);
  }
  if (occurrences > 1 && !args.replaceAll) {
    throw new Error(
      `oldString found ${occurrences} times; pass replaceAll:true or include more context to make it unique`,
    );
  }
  const next = args.replaceAll
    ? content.split(args.oldString).join(args.newString)
    : content.replace(args.oldString, args.newString);
  const tmp = `${resolved}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  await fs.writeFile(tmp, next, "utf8");
  try {
    await fs.rename(tmp, resolved);
  } catch {
    await fs.copyFile(tmp, resolved);
    await fs.unlink(tmp);
  }
  return { path: args.path, replacements: args.replaceAll ? occurrences : 1 };
}

export default tool({
  description:
    "Find/replace inside a file. Errors if oldString is missing or non-unique (unless replaceAll). Atomic write.",
  inputSchema: z.object({
    path: z.string().describe("Absolute or cwd-relative file path."),
    oldString: z.string().describe("Exact substring to find. Must be unique unless replaceAll is true."),
    newString: z.string().describe("Replacement substring. Must differ from oldString."),
    replaceAll: z
      .boolean()
      .optional()
      .describe("If true, replace every occurrence. Default false (single, must-be-unique)."),
  }),
  execute: async (input) => fileEditImpl(input),
});
