import type { Metadata, Viewport } from 'next';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'Agent Chat';
const tagline =
  process.env.NEXT_PUBLIC_APP_TAGLINE ?? 'Talk to your agent';

export const metadata: Metadata = {
  title: appName,
  description: tagline,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
