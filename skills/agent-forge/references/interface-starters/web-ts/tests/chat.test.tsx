import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Chat } from '@/components/chat';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { AgentEvent } from '@/agent';

/** Render <Chat /> with the same providers the app root supplies. */
function renderChat() {
  return render(
    <TooltipProvider delayDuration={0}>
      <Chat />
    </TooltipProvider>,
  );
}

/** Build a Response whose body streams the supplied events as SSE. */
function sseResponse(events: AgentEvent[], opts?: { delayMs?: number }): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const evt of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
        if (opts?.delayMs) {
          await new Promise((r) => setTimeout(r, opts.delayMs));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}

describe('<Chat />', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalClipboard: typeof navigator.clipboard | undefined;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    }
  });

  it('renders the empty state on first load', () => {
    renderChat();
    expect(screen.getByText(/start a conversation/i)).toBeInTheDocument();
  });

  it('sends a user message and renders the streamed assistant reply', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        { type: 'text', delta: 'Hello' },
        { type: 'text', delta: ', world!' },
      ]),
    );

    const user = userEvent.setup();
    renderChat();

    const input = screen.getByRole('textbox', { name: /message input/i });
    await user.type(input, 'hi agent');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    // User message appears immediately.
    expect(await screen.findByText('hi agent')).toBeInTheDocument();

    // Assistant message appears once streaming completes.
    await waitFor(() =>
      expect(screen.getByText('Hello, world!')).toBeInTheDocument(),
    );

    // Fetch called with the chat endpoint and a serialized message list.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/chat');
    const body = JSON.parse(init.body as string);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]).toMatchObject({ role: 'user', content: 'hi agent' });
  });

  it('renders a tool invocation card that expands on click', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        { type: 'tool_use', id: 't1', name: 'lookup', input: { q: 'foo' } },
        { type: 'tool_result', id: 't1', result: { answer: 42 } },
        { type: 'text', delta: 'done' },
      ]),
    );

    const user = userEvent.setup();
    renderChat();

    await user.type(
      screen.getByRole('textbox', { name: /message input/i }),
      'tool test',
    );
    await user.click(screen.getByRole('button', { name: /send message/i }));

    const tool = await screen.findByTestId('tool-invocation');
    expect(tool).toHaveTextContent('lookup');
    // Body is collapsed by default.
    expect(screen.queryByText(/"answer": 42/)).not.toBeInTheDocument();

    await user.click(tool.querySelector('button')!);
    expect(await screen.findByText(/"answer": 42/)).toBeInTheDocument();
  });

  it('surfaces an error event from the stream', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([{ type: 'error', error: 'boom' }]),
    );

    const user = userEvent.setup();
    renderChat();

    await user.type(
      screen.getByRole('textbox', { name: /message input/i }),
      'fail',
    );
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('boom');
  });
});
