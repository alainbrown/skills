/**
 * web-fetch — fetch a URL and convert HTML to markdown
 *
 * License: MIT (vendored — you own this file)
 * Maintained-by: project owner
 *
 * Adaptation notes:
 *   - As-is: works with mastra, openai-agents-sdk-ts, langgraph-ts (AI SDK tool shape)
 *   - For other AI SDK callers: import the underlying `webFetchImpl` function and rewrap
 *   - Uses Node's built-in `fetch` (undici). Turndown for HTML→markdown.
 *
 * Security notes:
 *   - Only http/https URLs allowed. file://, ftp://, data: etc. rejected.
 *   - SSRF guard: localhost, 127.0.0.0/8, ::1, link-local rejected by default.
 *     Pass { allow_localhost: true } to opts to disable — this is a CALLER option,
 *     NOT a model-exposed schema field.
 *   - 10 MB cap on response body; 30 s default timeout.
 */

import { tool } from "ai";
import { z } from "zod";
import TurndownService from "turndown";

const MAX_BYTES = 10 * 1024 * 1024;

export interface WebFetchOptions {
  /** Allow http(s) URLs that resolve to loopback / private hosts. Default false. */
  allow_localhost?: boolean;
}

export interface WebFetchResult {
  url: string;
  status: number;
  contentType: string;
  markdown: string;
  truncated?: boolean;
}

function assertSafeUrl(raw: string, opts: WebFetchOptions): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`invalid URL: ${raw}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`only http/https URLs allowed, got ${parsed.protocol}`);
  }
  if (!opts.allow_localhost) {
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.startsWith("127.") ||
      host.startsWith("169.254.") || // link-local
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)
    ) {
      throw new Error(`localhost / private host blocked: ${host}`);
    }
  }
  return parsed;
}

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

export async function webFetchImpl(
  args: { url: string; timeout?: number },
  opts: WebFetchOptions = {},
): Promise<WebFetchResult> {
  const parsed = assertSafeUrl(args.url, opts);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeout ?? 30000);
  let res: Response;
  try {
    res = await fetch(parsed, { signal: controller.signal, redirect: "follow" });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error(`fetch timed out after ${args.timeout ?? 30000} ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  const contentType = res.headers.get("content-type") ?? "";
  const reader = res.body?.getReader();
  let received = 0;
  const chunks: Uint8Array[] = [];
  let truncated = false;
  if (reader) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.length;
      if (received > MAX_BYTES) {
        truncated = true;
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
  }
  const body = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
  const looksHtml = /html/i.test(contentType) || body.trimStart().startsWith("<");
  const markdown = looksHtml ? turndown.turndown(body) : body;
  const result: WebFetchResult = {
    url: parsed.toString(),
    status: res.status,
    contentType,
    markdown,
  };
  if (truncated) result.truncated = true;
  return result;
}

export default tool({
  description:
    "Fetch a URL (http/https) and return its body as markdown. HTML is converted via turndown; non-HTML returned as-is. 10 MB cap.",
  inputSchema: z.object({
    url: z.string().describe("Absolute http or https URL."),
    timeout: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("Network timeout in milliseconds. Default 30000."),
  }),
  execute: async (input) => webFetchImpl(input),
});
