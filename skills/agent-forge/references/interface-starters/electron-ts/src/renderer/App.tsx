import { useEffect, useState } from 'react';
import { Chat } from './components/Chat';
import { Settings } from './components/Settings';
import { getSettings } from './lib/agent-client';
import type { AppSettings } from '../shared/types';

type View = 'loading' | 'chat' | 'settings';

export function App() {
  const [view, setView] = useState<View>('loading');
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    void (async () => {
      const s = await getSettings();
      setSettings(s);
      // First-launch UX: if no API keys AND onboarding never finished, force the settings page.
      const hasAnyKey = Boolean(s.anthropicApiKey || s.openaiApiKey);
      setView(s.onboardingComplete || hasAnyKey ? 'chat' : 'settings');
    })();
  }, []);

  if (view === 'loading' || !settings) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-brand-500" />
          <span className="text-sm font-semibold tracking-wide">Agent</span>
          <span className="text-xs text-slate-500">{settings.model}</span>
        </div>
        <nav className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setView('chat')}
            className={`rounded px-2 py-1 ${view === 'chat' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Chat
          </button>
          <button
            onClick={() => setView('settings')}
            className={`rounded px-2 py-1 ${view === 'settings' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Settings
          </button>
        </nav>
      </header>

      <main className="flex-1 overflow-hidden">
        {view === 'chat' ? (
          <Chat />
        ) : (
          <Settings
            initial={settings}
            onSaved={(next) => {
              setSettings(next);
              setView('chat');
            }}
          />
        )}
      </main>
    </div>
  );
}
