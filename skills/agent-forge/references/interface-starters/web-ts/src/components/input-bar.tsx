'use client';

import * as React from 'react';
import { Send, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface InputBarProps {
  onSubmit: (text: string) => void | Promise<void>;
  onStop?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InputBar({
  onSubmit,
  onStop,
  disabled = false,
  placeholder = 'Send a message...',
}: InputBarProps) {
  const [value, setValue] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Grow the textarea to fit its contents up to a reasonable cap.
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const submit = React.useCallback(() => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue('');
    void onSubmit(text);
  }, [value, disabled, onSubmit]);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter sends; Shift+Enter inserts a newline. Modifier+Enter also sends
      // (matches ChatGPT/Claude behavior on macOS and Windows).
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        submit();
      }
    },
    [submit],
  );

  const canSend = value.trim().length > 0 && !disabled;
  const showStop = disabled && Boolean(onStop);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="shrink-0 border-t bg-background/80 px-1 py-3 backdrop-blur"
      aria-label="Message composer"
    >
      <div
        className={cn(
          'flex items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-sm transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          aria-label="Message input"
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-50"
          disabled={disabled && !showStop}
        />
        {showStop ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={onStop}
            aria-label="Stop generating"
            className="size-9 shrink-0"
          >
            <Square className="!size-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!canSend}
            aria-label="Send message"
            className="size-9 shrink-0"
          >
            <Send className="!size-4" />
          </Button>
        )}
      </div>
      <p className="mt-1.5 px-2 text-[10px] text-muted-foreground">
        Press <kbd className="rounded border bg-muted px-1">Enter</kbd> to send,{' '}
        <kbd className="rounded border bg-muted px-1">Shift</kbd>+
        <kbd className="rounded border bg-muted px-1">Enter</kbd> for newline.
      </p>
    </form>
  );
}
