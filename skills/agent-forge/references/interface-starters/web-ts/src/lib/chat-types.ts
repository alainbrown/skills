/**
 * Client-side message model. Independent from the AgentEvent protocol on
 * the wire so we can render partial state (in-flight tool calls etc.).
 */
export type ChatRole = 'user' | 'assistant';

export type ToolInvocation = {
  id: string;
  name: string;
  input: unknown;
  result?: unknown;
  isError?: boolean;
  /** 'pending' = sent, awaiting result; 'complete' = result arrived. */
  status: 'pending' | 'complete';
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  tools: ToolInvocation[];
  /** Set on assistant messages while streaming, cleared on completion. */
  streaming?: boolean;
  /** Populated when the agent emits a top-level error event. */
  error?: string;
  createdAt: number;
};

export function makeId(): string {
  // crypto.randomUUID is available in modern browsers and Node 19+.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
