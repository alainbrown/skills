'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, TriangleAlert, User, Bot } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ToolInvocationCard } from '@/components/tool-invocation';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/chat-types';

export function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <li
      data-role={message.role}
      className={cn(
        'flex w-full gap-3 px-1',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <Avatar role={message.role} />
      <div
        className={cn(
          'flex max-w-[85%] flex-col gap-2',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        {message.tools.length > 0 && (
          <div className="flex w-full flex-col gap-2">
            {message.tools.map((tool) => (
              <ToolInvocationCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}

        <Bubble role={message.role} streaming={message.streaming}>
          {message.content ? (
            <MarkdownContent content={message.content} />
          ) : message.streaming ? (
            <span className="text-muted-foreground">...</span>
          ) : (
            <span className="text-muted-foreground italic">(empty)</span>
          )}
        </Bubble>

        {message.error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
          >
            <TriangleAlert className="size-3.5" />
            <span>{message.error}</span>
          </div>
        )}

        {!isUser && message.content && !message.streaming && (
          <CopyButton text={message.content} />
        )}
      </div>
    </li>
  );
}

function Avatar({ role }: { role: ChatMessage['role'] }) {
  const isUser = role === 'user';
  return (
    <div
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs',
        isUser
          ? 'border-primary/20 bg-primary text-primary-foreground'
          : 'border-border bg-muted text-foreground',
      )}
      aria-hidden="true"
    >
      {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
    </div>
  );
}

function Bubble({
  role,
  streaming,
  children,
}: {
  role: ChatMessage['role'];
  streaming?: boolean;
  children: React.ReactNode;
}) {
  const isUser = role === 'user';
  return (
    <div
      className={cn(
        'prose-chat rounded-2xl px-4 py-2.5 text-sm shadow-sm',
        isUser
          ? 'rounded-tr-sm bg-primary text-primary-foreground'
          : 'rounded-tl-sm border border-border bg-card text-card-foreground',
        streaming && 'ring-1 ring-foreground/10',
      )}
    >
      {children}
      {streaming && !isUser && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-foreground/70"
        />
      )}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: (props) => (
          <a {...props} target="_blank" rel="noreferrer noopener" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = React.useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      const t = setTimeout(() => setCopied(false), 1500);
      return () => clearTimeout(t);
    } catch {
      // Clipboard API can fail in insecure contexts; fail silently.
    }
  }, [text]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCopy}
          aria-label={copied ? 'Copied' : 'Copy message'}
          className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <Check className="!size-3" />
          ) : (
            <Copy className="!size-3" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Copy message text</TooltipContent>
    </Tooltip>
  );
}
