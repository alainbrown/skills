import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Chat } from '../../src/renderer/components/Chat';
import type { AgentEvent } from '../../src/shared/types';

// Build a fake `window.api` that satisfies the preload contract. We drive the agent stream
// through registered callbacks to mirror exactly how IPC events fan out at runtime.
type EventCb = (event: AgentEvent) => void;
type DoneCb = () => void;
type ErrorCb = (err: string) => void;

interface FakeApi {
  agentStream: ReturnType<typeof vi.fn>;
  onAgentEvent: ReturnType<typeof vi.fn>;
  onAgentDone: ReturnType<typeof vi.fn>;
  onAgentError: ReturnType<typeof vi.fn>;
  getSettings: ReturnType<typeof vi.fn>;
  setSettings: ReturnType<typeof vi.fn>;
  openPath: ReturnType<typeof vi.fn>;
}

let eventCbs: EventCb[] = [];
let doneCbs: DoneCb[] = [];
let errorCbs: ErrorCb[] = [];

function installFakeApi(): FakeApi {
  eventCbs = [];
  doneCbs = [];
  errorCbs = [];
  const api: FakeApi = {
    agentStream: vi.fn(async () => ({ streamId: 'test-stream' })),
    onAgentEvent: vi.fn((_id: string, cb: EventCb) => {
      eventCbs.push(cb);
      return () => {
        eventCbs = eventCbs.filter((c) => c !== cb);
      };
    }),
    onAgentDone: vi.fn((_id: string, cb: DoneCb) => {
      doneCbs.push(cb);
      return () => {
        doneCbs = doneCbs.filter((c) => c !== cb);
      };
    }),
    onAgentError: vi.fn((_id: string, cb: ErrorCb) => {
      errorCbs.push(cb);
      return () => {
        errorCbs = errorCbs.filter((c) => c !== cb);
      };
    }),
    getSettings: vi.fn(async () => ({})),
    setSettings: vi.fn(async () => ({})),
    openPath: vi.fn(async () => ''),
  };
  (window as unknown as { api: FakeApi }).api = api;
  return api;
}

function emitEvent(event: AgentEvent) {
  for (const cb of [...eventCbs]) cb(event);
}
function emitDone() {
  for (const cb of [...doneCbs]) cb();
}

beforeEach(() => {
  installFakeApi();
});

describe('<Chat />', () => {
  it('renders the empty state before any message is sent', () => {
    render(<Chat />);
    expect(screen.getByText(/Start a conversation/i)).toBeInTheDocument();
  });

  it('sends a message and renders streamed agent output', async () => {
    render(<Chat />);

    const input = screen.getByTestId('chat-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.click(screen.getByTestId('chat-send'));

    // User message renders immediately.
    expect(await screen.findByText('hello')).toBeInTheDocument();

    // Spinner shows while streaming.
    expect(await screen.findByTestId('chat-spinner')).toBeInTheDocument();

    // Stream a couple of text deltas through the fake bridge.
    emitEvent({ type: 'text', delta: 'Hi there. ' });
    emitEvent({ type: 'text', delta: 'How can I help?' });
    emitDone();

    await waitFor(() => {
      const messages = screen.getAllByTestId('message-assistant');
      const text = messages.map((m) => m.textContent ?? '').join(' ');
      expect(text).toMatch(/Hi there\.\s*How can I help\?/);
    });

    // Spinner disappears when done.
    await waitFor(() => {
      expect(screen.queryByTestId('chat-spinner')).not.toBeInTheDocument();
    });
  });

  it('renders tool invocations as collapsible cards', async () => {
    render(<Chat />);

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'run a tool' } });
    fireEvent.click(screen.getByTestId('chat-send'));

    // Wait for the renderer to subscribe (window.api.agentStream is async).
    await screen.findByTestId('chat-spinner');

    emitEvent({ type: 'tool_use', id: 't1', name: 'fs.read', input: { path: '/tmp/x' } });
    emitEvent({ type: 'tool_result', id: 't1', name: 'fs.read', result: 'file contents' });
    emitDone();

    const card = await screen.findByTestId('tool-invocation');
    expect(card).toHaveTextContent('fs.read');
    expect(card).toHaveTextContent('complete');
  });
});
