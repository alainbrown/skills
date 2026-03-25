#!/usr/bin/env node
//
// Interactive server runtime for skills that need browser-based UI.
// Zero dependencies — uses Node's built-in http module.
//
// Usage: node interactive-server.mjs [working-directory]
//
// The server serves an HTML shell with React + Babel (CDN), relays browser
// interactions to the agent via stdout, and pushes content updates to the
// browser via Server-Sent Events.
//
// Routes:
//   GET  /         — serves index.html (the UI shell + agent-generated components)
//   GET  /events   — SSE stream, pushes content.json changes to the browser
//   GET  /content  — returns current content.json
//   POST /results  — receives interaction data, prints to stdout as JSON line
//   GET  /*        — serves static files from the working directory
//

import { createServer } from 'node:http';
import { readFileSync, existsSync, watchFile, unwatchFile } from 'node:fs';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';

const dir = process.argv[2] || process.cwd();
const startPort = parseInt(process.env.PORT || '3456', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.jsx': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
};

// --- SSE management ---

let sseClients = [];
const contentFile = join(dir, 'content.json');
let contentWatcher = null;

function broadcastContent() {
  if (!existsSync(contentFile)) return;
  try {
    const data = readFileSync(contentFile, 'utf-8');
    for (const client of sseClients) {
      client.write(`data: ${data.replace(/\n/g, '')}\n\n`);
    }
  } catch { /* file may be mid-write */ }
}

function startWatching() {
  if (contentWatcher) return;
  if (existsSync(contentFile)) {
    watchFile(contentFile, { interval: 200 }, broadcastContent);
    contentWatcher = true;
  }
}

// --- Request handling ---

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost`);
  const pathname = url.pathname;

  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // SSE endpoint — push content changes to browser
  if (pathname === '/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    // Send current content immediately
    if (existsSync(contentFile)) {
      try {
        const data = readFileSync(contentFile, 'utf-8');
        res.write(`data: ${data.replace(/\n/g, '')}\n\n`);
      } catch { /* ignore */ }
    }
    sseClients.push(res);
    startWatching();
    req.on('close', () => {
      sseClients = sseClients.filter((c) => c !== res);
    });
    return;
  }

  // Results endpoint — browser sends interaction data, server prints to stdout
  if (pathname === '/results' && req.method === 'POST') {
    const body = await readBody(req);
    // This is the agent's input channel — one JSON line per interaction
    process.stdout.write(body + '\n');
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
    return;
  }

  // Content endpoint — serve current content.json
  if (pathname === '/content' && req.method === 'GET') {
    if (existsSync(contentFile)) {
      const data = readFileSync(contentFile, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('null');
    }
    return;
  }

  // Static file serving
  const filePath = pathname === '/' ? '/index.html' : pathname;
  const fullPath = join(dir, filePath);

  if (existsSync(fullPath)) {
    try {
      const ext = extname(fullPath);
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      const content = readFileSync(fullPath);
      res.writeHead(200, { 'Content-Type': mime });
      res.end(content);
    } catch {
      res.writeHead(500);
      res.end('Internal server error');
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// --- Port selection & startup ---

function tryListen(port) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      tryListen(port + 1);
    } else {
      console.error(JSON.stringify({ type: 'server_error', error: err.message }));
      process.exit(1);
    }
  });

  server.listen(port, () => {
    // This JSON line is how the agent knows the server is ready
    process.stdout.write(
      JSON.stringify({ type: 'server_ready', port, dir }) + '\n'
    );

    // Auto-open browser
    try {
      const url = `http://localhost:${port}`;
      if (process.platform === 'darwin') execSync(`open "${url}"`);
      else if (process.platform === 'win32') execSync(`start "" "${url}"`);
      else execSync(`xdg-open "${url}" 2>/dev/null || true`);
    } catch { /* browser open is best-effort */ }
  });
}

tryListen(startPort);

// --- Graceful shutdown ---

function shutdown() {
  if (contentWatcher) {
    unwatchFile(contentFile);
  }
  server.close(() => process.exit(0));
  // Force exit after 2s if connections don't close
  setTimeout(() => process.exit(0), 2000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
