/**
 * agent-cli entrypoint.
 *
 * Dispatch:
 *   - args present  → ONE-SHOT mode. Uses the raw renderStream() — line-buffered
 *     output, no Ink. Pipe-friendly, predictable for tests and CI.
 *   - no args, non-TTY → also one-shot of the lines piped in (READMe-friendly,
 *     keeps the original test contract working).
 *   - no args, TTY  → INTERACTIVE Ink REPL.
 *
 * Why bypass Ink for one-shot? Ink's cursor management and frame batching are
 * built for an interactive TTY; piped output produces ANSI control sequences
 * that complicate assertions and pollute pipes. The `gh` CLI and many other
 * Ink-using tools take this same fork.
 */

import React from 'react';
import { render } from 'ink';
import { App } from './App.js';
import { streamAgent } from './agent.js';
import { renderStream } from './cli/render.js';

async function runOneShot(prompt: string): Promise<number> {
  const ac = new AbortController();
  const onSig = (): void => ac.abort();
  process.once('SIGINT', onSig);
  try {
    const { aborted } = await renderStream(streamAgent(prompt), ac.signal);
    return aborted ? 130 : 0;
  } finally {
    process.off('SIGINT', onSig);
  }
}

async function runStdinShim(): Promise<number> {
  // Non-TTY, no args: read lines from stdin and treat each as a one-shot prompt.
  // This preserves the original spawn-based test contract ("repl mode reads from
  // stdin and shuts down on EOF").
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return 0;
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  let code = 0;
  for (const line of lines) {
    code = await runOneShot(line);
    if (code !== 0) break;
  }
  return code;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // One-shot via arg.
  if (args.length > 0) {
    const prompt = args.join(' ');
    const code = await runOneShot(prompt);
    process.exit(code);
  }

  // No TTY → stdin pipe mode (preserves old REPL test contract).
  if (process.stdin.isTTY !== true) {
    const code = await runStdinShim();
    process.exit(code);
  }

  // Interactive: mount the Ink app. Disable Ink's default Ctrl-C handler so
  // the App can interpret Ctrl-C as "abort current turn" rather than "exit".
  const { waitUntilExit } = render(<App />, { exitOnCtrlC: false });
  await waitUntilExit();
}

main().catch((err) => {
  process.stderr.write(
    `Fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
