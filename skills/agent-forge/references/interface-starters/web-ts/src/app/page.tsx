import { Chat } from '@/components/chat';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Agent Chat';
const tagline = process.env.NEXT_PUBLIC_APP_TAGLINE ?? 'Talk to your agent';

export default function Home() {
  return (
    <main className="mx-auto flex h-svh max-w-3xl flex-col px-4 sm:px-6">
      <header className="flex shrink-0 items-baseline justify-between gap-4 border-b py-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight">{appName}</h1>
          <p className="text-xs text-muted-foreground">{tagline}</p>
        </div>
        <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          placeholder agent
        </span>
      </header>
      <Chat />
    </main>
  );
}
