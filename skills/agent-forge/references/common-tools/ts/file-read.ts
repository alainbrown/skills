/**
 * file-read — read file content with line numbers, size + binary guards
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 *
 * Adaptation notes:
 *   - As-is: works with mastra, openai-agents-sdk-ts, langgraph-ts (AI SDK tool shape)
 *   - For other AI SDK callers: import the underlying `fileReadImpl` function and rewrap
 *
 * Security notes:
 *   - Path traversal blocked by default: resolved path must live under `cwd`.
 *     The `allow_outside_cwd` escape hatch is a CALLER option (second arg to
 *     fileReadImpl), NOT a model-exposed field. Do not move it onto the zod schema.
 *   - 10 MB hard size cap; binary files (null byte in first 1 KB) return a stub.
 */

import { tool } from "ai";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";

const MAX_BYTES = 10 * 1024 * 1024;
const BINARY_SNIFF_BYTES = 1024;

export interface FileReadOptions {
  /** Allow paths outside the resolved cwd. Default false (path-traversal guard on). */
  allow_outside_cwd?: boolean;
  /** Base cwd for the traversal check. Defaults to process.cwd(). */
  cwd?: string;
}

export interface FileReadResult {
  path: string;
  totalLines: number;
  startLine: number;
  endLine: number;
  content: string;
  truncated?: boolean;
  binary?: boolean;
  size?: number;
}

function resolveSafe(p: string, opts: FileReadOptions): string {
  const base = path.resolve(opts.cwd ?? process.cwd());
  const resolved = path.resolve(base, p);
  if (!opts.allow_outside_cwd) {
    if (resolved !== base && !resolved.startsWith(base + path.sep)) {
      throw new Error(`path traversal blocked: ${p} resolves outside ${base}`);
    }
  }
  return resolved;
}

export async function fileReadImpl(
  args: { path: string; offset?: number; limit?: number },
  opts: FileReadOptions = {},
): Promise<FileReadResult> {
  const resolved = resolveSafe(args.path, opts);
  const stat = await fs.stat(resolved);
  if (!stat.isFile()) throw new Error(`not a file: ${args.path}`);
  if (stat.size > MAX_BYTES) {
    throw new Error(`file too large: ${stat.size} bytes (max ${MAX_BYTES})`);
  }
  const buf = await fs.readFile(resolved);
  const sniff = buf.subarray(0, Math.min(BINARY_SNIFF_BYTES, buf.length));
  if (sniff.includes(0)) {
    return {
      path: args.path,
      totalLines: 0,
      startLine: 0,
      endLine: 0,
      content: `binary file (skipped), size=${stat.size} bytes`,
      binary: true,
      size: stat.size,
    };
  }
  const text = buf.toString("utf8");
  const lines = text.split("\n");
  const totalLines = lines.length;
  const offset = Math.max(0, args.offset ?? 0);
  const limit = Math.max(1, args.limit ?? 2000);
  const end = Math.min(totalLines, offset + limit);
  const slice = lines.slice(offset, end);
  const numbered = slice
    .map((l, i) => `${String(offset + i + 1).padStart(6, " ")}\t${l}`)
    .join("\n");
  return {
    path: args.path,
    totalLines,
    startLine: offset + 1,
    endLine: end,
    content: numbered,
    truncated: end < totalLines,
  };
}

export default tool({
  description:
    "Read a file. Returns content with line numbers prefixed and a total line count. Caps at 10 MB; binary files are skipped.",
  inputSchema: z.object({
    path: z.string().describe("Absolute or cwd-relative file path."),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("0-indexed line offset to start reading from. Default 0."),
    limit: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Max number of lines to return. Default 2000."),
  }),
  execute: async (input) => fileReadImpl(input),
});
