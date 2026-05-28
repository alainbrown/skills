import { useCallback, useState, type KeyboardEvent } from 'react';

interface Props {
  onSend: (prompt: string) => void;
  disabled?: boolean;
}

export function InputBar({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');

  const submit = useCallback(() => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue('');
  }, [value, disabled, onSend]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="border-t border-slate-800 bg-slate-950/80 px-4 py-3"
    >
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          data-testid="chat-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          placeholder="Send a message…  (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="min-h-[42px] max-h-40 flex-1 resize-none rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          data-testid="chat-send"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-50 transition disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 hover:bg-brand-300"
        >
          Send
        </button>
      </div>
    </form>
  );
}
