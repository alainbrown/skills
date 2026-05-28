import { ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
import { randomUUID } from 'node:crypto';
import { streamAgent } from './agent';
import { getSettings, setSettings, applySettingsToEnv } from './settings';
import { IPC, type AgentEvent, type AppSettings, type StreamHandle } from '../shared/types';

/**
 * Register all main-process IPC handlers. Call once from main/index.ts after `app.whenReady`.
 *
 * The streaming contract:
 *   1. Renderer invokes `agent:stream` with a prompt; we return a StreamHandle synchronously.
 *   2. Each AgentEvent fires as `agent:stream-event:<streamId>` on the originating WebContents.
 *   3. We finish with `agent:stream-done:<streamId>` or `agent:stream-error:<streamId>`.
 *
 * Using a per-stream channel suffix means multiple concurrent turns don't cross-talk.
 */
export function registerAgentBridge(): void {
  ipcMain.handle(IPC.AgentStream, async (event: IpcMainInvokeEvent, prompt: string): Promise<StreamHandle> => {
    const streamId = randomUUID();
    const sender = event.sender;

    // Fire-and-forget — we return the handle immediately so the renderer can subscribe.
    void runStream(sender, streamId, prompt);

    return { streamId };
  });

  ipcMain.handle(IPC.SettingsGet, (): AppSettings => getSettings());

  ipcMain.handle(IPC.SettingsSet, (_event, patch: Partial<AppSettings>): AppSettings => {
    const next = setSettings(patch);
    applySettingsToEnv();
    return next;
  });

  ipcMain.handle(IPC.ShellOpenPath, async (_event, fullPath: string): Promise<string> => {
    // shell.openPath returns "" on success, otherwise an error message.
    return shell.openPath(fullPath);
  });
}

async function runStream(
  sender: Electron.WebContents,
  streamId: string,
  prompt: string,
): Promise<void> {
  const eventChannel = `${IPC.AgentStreamEvent}:${streamId}`;
  const doneChannel = `${IPC.AgentStreamDone}:${streamId}`;
  const errorChannel = `${IPC.AgentStreamError}:${streamId}`;

  try {
    for await (const agentEvent of streamAgent(prompt)) {
      if (sender.isDestroyed()) return;
      const payload: AgentEvent = agentEvent;
      sender.send(eventChannel, payload);
    }
    if (!sender.isDestroyed()) sender.send(doneChannel);
  } catch (err) {
    if (!sender.isDestroyed()) {
      sender.send(errorChannel, err instanceof Error ? err.message : String(err));
    }
  }
}
