/**
 * grep — search files for a regex pattern (pure-Node implementation)
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 *
 * Adaptation notes:
 *   - As-is: works with mastra, openai-agents-sdk-ts, langgraph-ts (AI SDK tool shape)
 *   - For other AI SDK callers: import the underlying `grepImpl` function and rewrap
 *   - No dependency on ripgrep / system grep — uses fs.readFile + RegExp.
 *
 * Security notes:
 *   - Skips binary files (null byte sniff). Skips files >10 MB.
 *   - Walks via the npm `glob` package using the `glob` filter (default: '**\/*').
 *   - `.gitignore` is best-effort: only the cwd's top-level .gitignore is consulted
 *     when respectGitignore is true. Not a substitute for full git semantics.
 */

import { tool } from "ai";
import { z } from "zod";
import { glob as globPkg } from "glob";
import { promises as fs } from "node:fs";
import path from "node:path";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const BINARY_SNIFF = 1024;

export interface GrepMatch {
  file: string;
  line: number;
  content: string;
}

export interface GrepResult {
  matches: GrepMatch[];
  truncated: boolean;
  filesSearched: number;
}

async function loadGitignorePatterns(root: string): Promise<string[]> {
  try {
    const text = await fs.readFile(path.join(root, ".gitignore"), "utf8");
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));
  } catch {
    return [];
  }
}

export async function grepImpl(args: {
  pattern: string;
  path?: string;
  glob?: string;
  caseInsensitive?: boolean;
  maxResults?: number;
  respectGitignore?: boolean;
}): Promise<GrepResult> {
  const root = path.resolve(args.path ?? ".");
  const pattern = new RegExp(args.pattern, args.caseInsensitive ? "i" : "");
  const max = args.maxResults ?? 100;
  const ignore = args.respectGitignore ? await loadGitignorePatterns(root) : [];
  const ignorePlus = [...ignore, "**/node_modules/**", "**/.git/**"];
  const files = await globPkg(args.glob ?? "**/*", {
    cwd: root,
    nodir: true,
    absolute: true,
    ignore: ignorePlus,
    dot: false,
  });
  const matches: GrepMatch[] = [];
  let filesSearched = 0;
  let truncated = false;
  for (const abs of files) {
    if (matches.length >= max) {
      truncated = true;
      break;
    }
    try {
      const st = await fs.stat(abs);
      if (st.size > MAX_FILE_BYTES) continue;
      const buf = await fs.readFile(abs);
      if (buf.subarray(0, Math.min(BINARY_SNIFF, buf.length)).includes(0)) continue;
      filesSearched++;
      const lines = buf.toString("utf8").split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i] ?? "")) {
          matches.push({
            file: path.relative(root, abs),
            line: i + 1,
            content: lines[i] ?? "",
          });
          if (matches.length >= max) {
            truncated = true;
            break;
          }
        }
      }
    } catch {
      // unreadable file — skip
    }
  }
  return { matches, truncated, filesSearched };
}

export default tool({
  description:
    "Search files for a regex pattern. Returns array of {file, line, content}. Skips binary files and files >10 MB.",
  inputSchema: z.object({
    pattern: z.string().describe("Regex pattern (JavaScript flavor)."),
    path: z.string().optional().describe("Root directory to search. Default '.'."),
    glob: z.string().optional().describe("Glob filter for files (e.g. '**/*.ts'). Default '**/*'."),
    caseInsensitive: z.boolean().optional().describe("Case-insensitive match. Default false."),
    maxResults: z.number().int().min(1).optional().describe("Cap on matches. Default 100."),
    respectGitignore: z
      .boolean()
      .optional()
      .describe("Best-effort: consult top-level .gitignore. Default false."),
  }),
  execute: async (input) => grepImpl(input),
});
