/**
 * glob — find files matching a pattern (npm `glob`)
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 *
 * Adaptation notes:
 *   - As-is: works with mastra, openai-agents-sdk-ts, langgraph-ts (AI SDK tool shape)
 *   - For other AI SDK callers: import the underlying `globImpl` function and rewrap
 *   - Depends on the npm `glob` package (kept explicit — fs.glob is Node 22+ only,
 *     and our cli-ts starter targets Node 20+).
 *
 * Security notes:
 *   - Pattern is passed to the npm `glob` matcher; no shell expansion.
 *   - Capped at `maxResults` (default 1000); sorted by mtime descending.
 */

import { tool } from "ai";
import { z } from "zod";
import { glob as globPkg } from "glob";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface GlobResult {
  matches: string[];
  truncated: boolean;
  total: number;
}

export async function globImpl(args: {
  pattern: string;
  cwd?: string;
  maxResults?: number;
}): Promise<GlobResult> {
  const cwd = args.cwd ?? process.cwd();
  const max = args.maxResults ?? 1000;
  const absMatches = await globPkg(args.pattern, { cwd, absolute: true, nodir: true });
  // Sort by mtime descending; tolerate stat errors (file vanished between glob and stat).
  const withMtime = await Promise.all(
    absMatches.map(async (abs) => {
      try {
        const st = await fs.stat(abs);
        return { abs, mtime: st.mtimeMs };
      } catch {
        return { abs, mtime: 0 };
      }
    }),
  );
  withMtime.sort((a, b) => b.mtime - a.mtime);
  const sliced = withMtime.slice(0, max);
  return {
    matches: sliced.map((m) => path.relative(cwd, m.abs)),
    truncated: withMtime.length > max,
    total: withMtime.length,
  };
}

export default tool({
  description:
    "Find files matching a glob pattern (e.g. 'src/**/*.ts'). Returns paths relative to cwd, sorted by mtime descending.",
  inputSchema: z.object({
    pattern: z.string().describe("Glob pattern, e.g. 'src/**/*.ts'."),
    cwd: z.string().optional().describe("Base directory. Defaults to the process cwd."),
    maxResults: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Cap on returned paths. Default 1000."),
  }),
  execute: async (input) => globImpl(input),
});
