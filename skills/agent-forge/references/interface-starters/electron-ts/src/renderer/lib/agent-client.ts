import type { AgentEvent, AppSettings } from '../../shared/types';
import type { Api } from '../../preload';

declare global {
  interface Window {
    api: Api;
  }
}

/**
 * Thin wrapper around `window.api` that turns the per-channel event subscription
 * pattern into a single AsyncIterable. The renderer doesn't have to know about
 * channel suffixes or unsubscribe handles — it just `for await`s.
 */
export async function* streamAgent(prompt: string): AsyncGenerator<AgentEvent> {
  const { streamId } = await window.api.agentStream(prompt);

  const queue: AgentEvent[] = [];
  let waiter: ((v: IteratorResult<AgentEvent>) => void) | null = null;
  let done = false;
  let error: string | null = null;

  const push = (event: AgentEvent) => {
    if (waiter) {
      const w = waiter;
      waiter = null;
      w({ value: event, done: false });
    } else {
      queue.push(event);
    }
  };

  const finish = (err?: string) => {
    done = true;
    if (err) error = err;
    if (waiter) {
      const w = waiter;
      waiter = null;
      w({ value: undefined as never, done: true });
    }
  };

  const offEvent = window.api.onAgentEvent(streamId, push);
  const offDone = window.api.onAgentDone(streamId, () => finish());
  const offError = window.api.onAgentError(streamId, (err) => finish(err));

  try {
    while (true) {
      if (queue.length > 0) {
        yield queue.shift()!;
        continue;
      }
      if (done) break;
      const next = await new Promise<IteratorResult<AgentEvent>>((resolve) => {
        waiter = resolve;
      });
      if (next.done) break;
      yield next.value;
    }
    if (error) throw new Error(error);
  } finally {
    offEvent();
    offDone();
    offError();
  }
}

export function getSettings(): Promise<AppSettings> {
  return window.api.getSettings();
}

export function setSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  return window.api.setSettings(patch);
}

export function openPath(path: string): Promise<string> {
  return window.api.openPath(path);
}
