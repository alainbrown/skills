import express from 'express';
import { readFileSync, watchFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3456', 10);

app.use(express.json());
app.use(express.static(__dirname));

// --- SSE: push state changes to browser ---
let clients = [];

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  // Send current state immediately on connect
  try {
    const state = readFileSync(join(__dirname, 'state.json'), 'utf-8');
    res.write(`data: ${state}\n\n`);
  } catch {}
  clients.push(res);
  req.on('close', () => {
    clients = clients.filter((c) => c !== res);
  });
});

// --- Input endpoint: prints to stdout for agent ---
app.post('/input', (req, res) => {
  const event = JSON.stringify({
    type: 'user_input',
    ts: Date.now(),
    data: req.body,
  });
  console.log(event);
  res.status(202).json({ status: 'received' });
});

// --- Watch state.json and push to all SSE clients ---
const stateFile = join(__dirname, 'state.json');

watchFile(stateFile, { interval: 200 }, () => {
  try {
    const state = readFileSync(stateFile, 'utf-8');
    JSON.parse(state); // validate before sending
    clients.forEach((c) => c.write(`data: ${state}\n\n`));
  } catch {
    // File mid-write or invalid — skip this tick
  }
});

// --- Start ---
const server = app.listen(PORT, () => {
  console.log(
    JSON.stringify({ type: 'server_ready', port: PORT, dir: __dirname })
  );
});

process.on('SIGTERM', () => {
  server.close();
  process.exit(0);
});
