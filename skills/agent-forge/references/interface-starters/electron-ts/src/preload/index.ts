import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC,
  type AgentEvent,
  type AppSettings,
  type StreamHandle,
} from '../shared/types';

// `window.api` is the ONLY surface the renderer touches. Adding a method here is the only
// way to expose more main-process behavior — keep this list minimal and audited.
const api = {
  /** Start an agent turn. Returns a handle whose `streamId` is used to subscribe. */
  agentStream(prompt: string): Promise<StreamHandle> {
    return ipcRenderer.invoke(IPC.AgentStream, prompt);
  },

  /** Subscribe to streaming events for one turn. Returns an unsubscribe fn. */
  onAgentEvent(streamId: string, callback: (event: AgentEvent) => void): () => void {
    const channel = `${IPC.AgentStreamEvent}:${streamId}`;
    const handler = (_: Electron.IpcRendererEvent, event: AgentEvent) => callback(event);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  onAgentDone(streamId: string, callback: () => void): () => void {
    const channel = `${IPC.AgentStreamDone}:${streamId}`;
    const handler = () => callback();
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  onAgentError(streamId: string, callback: (err: string) => void): () => void {
    const channel = `${IPC.AgentStreamError}:${streamId}`;
    const handler = (_: Electron.IpcRendererEvent, err: string) => callback(err);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },

  // --- Settings ---
  getSettings(): Promise<AppSettings> {
    return ipcRenderer.invoke(IPC.SettingsGet);
  },
  setSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    return ipcRenderer.invoke(IPC.SettingsSet, patch);
  },

  // --- OS integration ---
  /** Reveals/opens `fullPath` in the OS file manager. Returns "" on success. */
  openPath(fullPath: string): Promise<string> {
    return ipcRenderer.invoke(IPC.ShellOpenPath, fullPath);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
