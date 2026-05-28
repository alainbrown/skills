import chalk from 'chalk';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import type { AgentEvent } from '../agent.js';

// marked-terminal types are loose; cast to any to satisfy strict mode.
marked.use(markedTerminal() as any);

export interface RenderOptions {
  /** Render assistant text as markdown after the stream completes. */
  renderMarkdown?: boolean;
  /** Where to write the streaming output. */
  out?: NodeJS.WriteStream;
  /** Where to write tool/error chatter so it doesn't pollute stdout. */
  err?: NodeJS.WriteStream;
}

/**
 * Consumes an AgentEvent stream:
 *  - text deltas are flushed to stdout immediately (tokens visible as they arrive)
 *  - tool_use / tool_result events are dim-printed to stderr
 *  - errors are red-printed to stderr
 *
 * When markdown rendering is enabled and we're attached to a TTY, the buffered
 * text is re-printed through marked-terminal after the stream ends so code
 * blocks get highlighted. The raw stream stays for non-TTY consumers (pipes,
 * tests) so output remains stable.
 *
 * Honours an AbortSignal so Ctrl-C can interrupt the current turn cleanly.
 */
export async function renderStream(
  stream: AsyncIterable<AgentEvent>,
  signal: AbortSignal,
  opts: RenderOptions = {},
): Promise<{ text: string; aborted: boolean }> {
  const out = opts.out ?? process.stdout;
  const err = opts.err ?? process.stderr;
  const renderMarkdown = opts.renderMarkdown ?? out.isTTY === true;

  let buffer = '';
  let aborted = false;

  try {
    for await (const event of stream) {
      if (signal.aborted) {
        aborted = true;
        break;
      }
      switch (event.type) {
        case 'text': {
          buffer += event.delta;
          out.write(event.delta);
          break;
        }
        case 'tool_use': {
          err.write(chalk.dim(`\n  -> ${event.name}(${formatInput(event.input)})\n`));
          break;
        }
        case 'tool_result': {
          const tag = event.isError ? chalk.red('error') : chalk.dim('ok');
          // Tool name may not be on the result event; fall back to the tool id.
          const label = event.name ?? event.id;
          err.write(chalk.dim(`  <- ${label} [${tag}]\n`));
          break;
        }
        case 'error': {
          err.write(chalk.red(`\n[error] ${event.error}\n`));
          break;
        }
      }
    }
  } catch (e) {
    err.write(chalk.red(`\n[stream error] ${e instanceof Error ? e.message : String(e)}\n`));
  }

  // Markdown re-render: clear current line, then print the formatted version.
  if (renderMarkdown && buffer.trim() && !aborted) {
    try {
      const formatted = String(marked.parse(buffer));
      // Newline so the streamed raw text and the formatted version are visually
      // separated; we leave the raw text in place so terminals scrolled past it
      // keep the originally-streamed token feel.
      out.write('\n' + chalk.dim('---\n') + formatted);
    } catch {
      // marked failures are non-fatal — raw text already shown.
    }
  } else if (!aborted) {
    // Ensure trailing newline before prompt returns.
    if (!buffer.endsWith('\n')) out.write('\n');
  }

  if (aborted) {
    err.write(chalk.yellow('\n[interrupted]\n'));
  }

  return { text: buffer, aborted };
}

function formatInput(input: unknown): string {
  try {
    const s = JSON.stringify(input);
    return s.length > 80 ? s.slice(0, 77) + '...' : s;
  } catch {
    return String(input);
  }
}
