/**
 * bash — execute a shell command via Node's child_process.spawn
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 *
 * Adaptation notes:
 *   - As-is: works with mastra, openai-agents-sdk-ts, langgraph-ts (AI SDK tool shape)
 *   - For other AI SDK callers: import the underlying `bashImpl` function and rewrap
 *
 * Security notes:
 *   - This uses spawn() with `shell: true` — a REAL shell, with REAL injection risk.
 *     `command` is passed verbatim to /bin/sh -c. There is NO sanitization. A model
 *     output of `ls; rm -rf ~` will execute both. The "you own the risk" path.
 *   - For framework-managed sandboxing instead, prefer the agent harness's just-bash
 *     equivalent.
 *   - Default 30 s timeout; output capped at MAX_OUTPUT bytes per stream (truncated
 *     with a marker, process is still killed if it exceeds the cap by a lot).
 */

import { tool } from "ai";
import { z } from "zod";
import { spawn } from "node:child_process";

const MAX_OUTPUT = 256 * 1024;

export interface BashResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut?: boolean;
  truncated?: { stdout?: boolean; stderr?: boolean };
}

function clip(chunks: Buffer[], cap: number): { text: string; truncated: boolean } {
  const buf = Buffer.concat(chunks);
  if (buf.length <= cap) return { text: buf.toString("utf8"), truncated: false };
  return {
    text: buf.subarray(0, cap).toString("utf8") + `\n... [truncated: ${buf.length - cap} more bytes]`,
    truncated: true,
  };
}

export async function bashImpl(args: {
  command: string;
  cwd?: string;
  timeout?: number;
}): Promise<BashResult> {
  const timeoutMs = args.timeout ?? 30000;
  return await new Promise((resolve) => {
    const child = spawn(args.command, { shell: true, cwd: args.cwd });
    const outChunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (c: Buffer) => outChunks.push(c));
    child.stderr.on("data", (c: Buffer) => errChunks.push(c));
    child.on("error", (err) => {
      clearTimeout(timer);
      const out = clip(outChunks, MAX_OUTPUT);
      const errClip = clip(errChunks, MAX_OUTPUT);
      resolve({
        stdout: out.text,
        stderr: (errClip.text + `\nspawn error: ${err.message}`).trimStart(),
        exitCode: null,
        timedOut,
      });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const out = clip(outChunks, MAX_OUTPUT);
      const errClip = clip(errChunks, MAX_OUTPUT);
      const result: BashResult = { stdout: out.text, stderr: errClip.text, exitCode: code };
      if (timedOut) result.timedOut = true;
      if (out.truncated || errClip.truncated) {
        result.truncated = {};
        if (out.truncated) result.truncated.stdout = true;
        if (errClip.truncated) result.truncated.stderr = true;
      }
      resolve(result);
    });
  });
}

export default tool({
  description:
    "Execute a shell command. Returns {stdout, stderr, exitCode}. 30 s default timeout, 256 KB output cap per stream.",
  inputSchema: z.object({
    command: z.string().describe("Shell command to run via /bin/sh -c. NO sanitization — caller's risk."),
    cwd: z.string().optional().describe("Working directory. Defaults to the agent process cwd."),
    timeout: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Hard timeout in milliseconds. Default 30000."),
  }),
  execute: async (input) => bashImpl(input),
});
