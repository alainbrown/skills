import { useState } from 'react';
import type { AppSettings } from '../../shared/types';
import { setSettings as persistSettings } from '../lib/agent-client';

interface Props {
  initial: AppSettings;
  onSaved: (next: AppSettings) => void;
}

export function Settings({ initial, onSaved }: Props) {
  const [form, setForm] = useState<AppSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const next = await persistSettings({ ...form, onboardingComplete: true });
      setForm(next);
      setSaved(true);
      onSaved(next);
    } finally {
      setSaving(false);
    }
  };

  const hasAnyKey = Boolean(form.anthropicApiKey || form.openaiApiKey);

  return (
    <div className="h-full overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-lg font-semibold text-slate-100">Settings</h1>
          <p className="mt-1 text-sm text-slate-400">
            API keys are stored locally via electron-store. They never leave this machine
            and are not transmitted to the renderer process.
          </p>
        </header>

        {!hasAnyKey && (
          <div className="rounded-md border border-amber-700/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
            Add at least one API key to enable the agent.
          </div>
        )}

        <Field
          label="Anthropic API key"
          hint="Used by harnesses that talk to Claude (Anthropic SDK, Claude Agent SDK)."
        >
          <input
            type="password"
            value={form.anthropicApiKey}
            onChange={(e) => update('anthropicApiKey', e.target.value)}
            placeholder="sk-ant-..."
            className="input"
          />
        </Field>

        <Field
          label="OpenAI API key"
          hint="Used by harnesses that talk to OpenAI / Azure (OpenAI Agents SDK, Vercel AI SDK)."
        >
          <input
            type="password"
            value={form.openaiApiKey}
            onChange={(e) => update('openaiApiKey', e.target.value)}
            placeholder="sk-..."
            className="input"
          />
        </Field>

        <Field label="Model" hint="Identifier passed to whichever SDK your agent.ts uses.">
          <input
            type="text"
            value={form.model}
            onChange={(e) => update('model', e.target.value)}
            className="input font-mono"
          />
        </Field>

        <Field label="System prompt" hint="Shapes the agent's persona / instructions.">
          <textarea
            value={form.systemPrompt}
            onChange={(e) => update('systemPrompt', e.target.value)}
            rows={4}
            className="input min-h-[120px]"
          />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-50 disabled:bg-slate-700"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saved && <span className="text-sm text-emerald-400">Saved.</span>}
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgb(30, 41, 59);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          color: #f1f5f9;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: oklch(0.62 0.18 260);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium text-slate-200">{label}</div>
      {children}
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </label>
  );
}
