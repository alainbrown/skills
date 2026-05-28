import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, '../src/index.tsx');

interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], stdin?: string, timeoutMs = 10_000): Promise<RunResult> {
  return new Promise((resolveP, reject) => {
    const child = spawn('npx', ['tsx', entry, ...args], {
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`CLI timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveP({ code, stdout, stderr });
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    if (stdin !== undefined) child.stdin.end(stdin);
    else child.stdin.end();
  });
}

// One-shot mode bypasses Ink and uses the raw renderStream — pipe-friendly,
// stable assertions. Interactive (TTY) mode is covered by App.test.tsx.
describe('cli smoke', () => {
  it('one-shot mode prints the placeholder response and exits 0', async () => {
    const r = await runCli(['hello world']);
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('Agent placeholder');
    expect(r.stdout).toContain('hello world');
  }, 15_000);

  it('stdin-pipe mode reads a line from stdin and shuts down on EOF', async () => {
    const r = await runCli([], 'ping\n');
    expect(r.code).toBe(0);
    expect(r.stdout).toContain('Agent placeholder');
    expect(r.stdout).toContain('ping');
  }, 15_000);
});
