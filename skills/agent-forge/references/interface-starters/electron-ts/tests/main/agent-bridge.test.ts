import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

// Mock electron BEFORE importing agent-bridge — the bridge calls ipcMain.handle at import time
// (via the registration function), and the SUT also needs `shell.openPath` to exist.
const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (event: unknown, ...args: unknown[]) => unknown) => {
      handlers.set(channel, fn);
    },
  },
  shell: {
    openPath: vi.fn(async () => ''),
  },
}));

// Stub electron-store BEFORE importing settings (which agent-bridge transitively imports).
vi.mock('electron-store', () => {
  const data: Record<string, unknown> = {};
  return {
    default: class {
      constructor(opts: { defaults?: Record<string, unknown> }) {
        Object.assign(data, opts.defaults ?? {});
      }
      get(key: string) {
        return data[key];
      }
      set(key: string, value: unknown) {
        data[key] = value;
      }
    },
  };
});

import { registerAgentBridge } from '../../src/main/agent-bridge';
import { IPC } from '../../src/shared/types';

class FakeSender extends EventEmitter {
  sent: { channel: string; payload: unknown }[] = [];
  destroyed = false;
  send(channel: string, payload?: unknown) {
    this.sent.push({ channel, payload });
  }
  isDestroyed() {
    return this.destroyed;
  }
}

beforeEach(() => {
  handlers.clear();
  registerAgentBridge();
});

describe('agent-bridge', () => {
  it('registers every documented IPC channel', () => {
    expect(handlers.has(IPC.AgentStream)).toBe(true);
    expect(handlers.has(IPC.SettingsGet)).toBe(true);
    expect(handlers.has(IPC.SettingsSet)).toBe(true);
    expect(handlers.has(IPC.ShellOpenPath)).toBe(true);
  });

  it('streams placeholder agent output through per-stream channels', async () => {
    const sender = new FakeSender();
    const handler = handlers.get(IPC.AgentStream)!;

    const handle = (await handler({ sender }, 'hello world')) as { streamId: string };
    expect(handle.streamId).toMatch(/^[0-9a-f-]{36}$/);

    // The stream runs asynchronously; give it a couple of ticks to drain.
    await waitFor(() =>
      sender.sent.some((m) => m.channel === `${IPC.AgentStreamDone}:${handle.streamId}`),
    );

    const events = sender.sent.filter((m) =>
      m.channel === `${IPC.AgentStreamEvent}:${handle.streamId}`,
    );
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0]?.payload).toMatchObject({ type: 'text' });
    const combined = events.map((e) => (e.payload as { delta: string }).delta).join('');
    expect(combined).toContain('Placeholder agent');
    expect(combined).toContain('hello world');
  });

  it('round-trips settings via get/set handlers', async () => {
    const setHandler = handlers.get(IPC.SettingsSet)!;
    const getHandler = handlers.get(IPC.SettingsGet)!;

    await setHandler({}, { anthropicApiKey: 'sk-ant-test', onboardingComplete: true });
    const result = (await getHandler({})) as { anthropicApiKey: string; onboardingComplete: boolean };

    expect(result.anthropicApiKey).toBe('sk-ant-test');
    expect(result.onboardingComplete).toBe(true);
  });
});

async function waitFor(predicate: () => boolean, timeoutMs = 500): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor: timeout');
    await new Promise((r) => setTimeout(r, 10));
  }
}
