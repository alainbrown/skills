/**
 * file-write — atomic write (tmp + rename), creates parent dirs
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 *
 * Adaptation notes:
 *   - As-is: works with mastra, openai-agents-sdk-ts, langgraph-ts (AI SDK tool shape)
 *   - For other AI SDK callers: import the underlying `fileWriteImpl` function and rewrap
 *
 * Security notes:
 *   - Path traversal blocked by default: resolved path must live under `cwd`. The
 *     `allow_outside_cwd` escape hatch is a CALLER option (second arg), NOT model-exposed.
 *   - Atomic via write-to-.tmp-then-rename. Same-filesystem rename only — if your tmp
 *     dir is on a different mount this falls back to a non-atomic copy.
 */

import { tool } from "ai";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface FileWriteOptions {
  /** Allow paths outside the resolved cwd. Default false. */
  allow_outside_cwd?: boolean;
  /** Base cwd for traversal check. Defaults to process.cwd(). */
  cwd?: string;
}

export interface FileWriteResult {
  path: string;
  bytesWritten: number;
  created: boolean;
}

function resolveSafe(p: string, opts: FileWriteOptions): string {
  const base = path.resolve(opts.cwd ?? process.cwd());
  const resolved = path.resolve(base, p);
  if (!opts.allow_outside_cwd) {
    if (resolved !== base && !resolved.startsWith(base + path.sep)) {
      throw new Error(`path traversal blocked: ${p} resolves outside ${base}`);
    }
  }
  return resolved;
}

export async function fileWriteImpl(
  args: { path: string; content: string },
  opts: FileWriteOptions = {},
): Promise<FileWriteResult> {
  const resolved = resolveSafe(args.path, opts);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  let created = true;
  try {
    await fs.access(resolved);
    created = false;
  } catch {
    /* fine */
  }
  const tmp = `${resolved}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  const buf = Buffer.from(args.content, "utf8");
  await fs.writeFile(tmp, buf);
  try {
    await fs.rename(tmp, resolved);
  } catch (err) {
    // cross-device fallback: copy + unlink
    await fs.copyFile(tmp, resolved);
    await fs.unlink(tmp);
    void err;
  }
  return { path: args.path, bytesWritten: buf.length, created };
}

export default tool({
  description:
    "Write content to a file atomically (tmp + rename). Creates parent directories. Returns {bytesWritten, created}.",
  inputSchema: z.object({
    path: z.string().describe("Absolute or cwd-relative file path to write."),
    content: z.string().describe("UTF-8 string content to write."),
  }),
  execute: async (input) => fileWriteImpl(input),
});
