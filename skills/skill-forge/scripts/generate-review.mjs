#!/usr/bin/env node

/**
 * Eval review viewer for skill development.
 *
 * Default: starts a local server that serves the review page and saves feedback.
 * Static:  writes a self-contained HTML file (for headless/CI environments).
 *
 * Usage:
 *   # Server mode (default) — starts server, prints URL
 *   node generate-review.mjs <iteration-dir> --skill-name <name>
 *   node generate-review.mjs <iteration-dir> --skill-name <name> --port 3117
 *   node generate-review.mjs <iteration-dir> --skill-name <name> --benchmark benchmark.json
 *   node generate-review.mjs <iteration-dir> --skill-name <name> --previous-workspace ../iteration-1
 *
 *   # Static mode — writes HTML file, no server
 *   node generate-review.mjs <iteration-dir> --skill-name <name> --output review.html
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, resolve, dirname, extname } from 'path';
import { createServer } from 'http';
import { exec } from 'child_process';
import { platform } from 'os';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_PORT = 3117;
const MAX_PORT_ATTEMPTS = 10;

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.json', '.csv', '.py', '.js', '.ts', '.tsx', '.jsx',
  '.yaml', '.yml', '.xml', '.html', '.css', '.sh', '.rb', '.go', '.rs',
  '.java', '.c', '.cpp', '.h', '.sql', '.toml', '.mjs', '.cjs',
]);

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);
const SKIP_FILES = new Set(['transcript.md', 'user_notes.md', 'metrics.json']);

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    iterDir: args[0],
    skillName: '',
    output: '',
    benchmark: '',
    previousWorkspace: '',
    port: DEFAULT_PORT,
  };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--skill-name' && args[i + 1]) { opts.skillName = args[i + 1]; i++; }
    else if (args[i] === '--output' && args[i + 1]) { opts.output = args[i + 1]; i++; }
    else if (args[i] === '--benchmark' && args[i + 1]) { opts.benchmark = args[i + 1]; i++; }
    else if (args[i] === '--previous-workspace' && args[i + 1]) { opts.previousWorkspace = args[i + 1]; i++; }
    else if ((args[i] === '--port' || args[i] === '-p') && args[i + 1]) { opts.port = parseInt(args[i + 1], 10); i++; }
  }

  if (!opts.iterDir) {
    console.error('Usage: node generate-review.mjs <iteration-dir> --skill-name <name> [--output <path>]');
    console.error('  Server mode (default): starts local server');
    console.error('  Static mode: --output <path> writes HTML file');
    process.exit(1);
  }

  opts.iterDir = resolve(opts.iterDir);
  if (opts.output) opts.output = resolve(opts.output);
  if (!opts.skillName) opts.skillName = opts.iterDir.split('/').pop().replace('-workspace', '');

  return opts;
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

function embedFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  const name = filePath.split('/').pop();

  if (TEXT_EXTENSIONS.has(ext)) {
    try {
      return { name, type: 'text', content: readFileSync(filePath, 'utf-8') };
    } catch {
      return { name, type: 'text', content: '(Error reading file)' };
    }
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    try {
      const b64 = readFileSync(filePath).toString('base64');
      const mime = ext === '.svg' ? 'image/svg+xml' : `image/${ext.slice(1)}`;
      return { name, type: 'image', dataUri: `data:${mime};base64,${b64}` };
    } catch {
      return { name, type: 'text', content: '(Error reading image)' };
    }
  }

  return { name, type: 'text', content: `(Binary file: ${name})` };
}

// ---------------------------------------------------------------------------
// Workspace scanning
// ---------------------------------------------------------------------------

function findRuns(iterDir) {
  const runs = [];

  for (const evalName of readdirSync(iterDir).sort()) {
    const evalDir = join(iterDir, evalName);
    if (!existsSync(evalDir) || !statSync(evalDir).isDirectory()) continue;
    if (evalName.startsWith('.') || evalName === 'node_modules') continue;

    const metadata = readJson(join(evalDir, 'eval_metadata.json'));

    for (const variant of ['with_skill', 'without_skill', 'old_skill']) {
      const variantDir = join(evalDir, variant);
      const outputsDir = join(variantDir, 'outputs');
      if (!existsSync(outputsDir) || !statSync(outputsDir).isDirectory()) continue;

      const outputs = [];
      for (const f of readdirSync(outputsDir).sort()) {
        const fp = join(outputsDir, f);
        if (statSync(fp).isFile() && !SKIP_FILES.has(f)) {
          outputs.push(embedFile(fp));
        }
      }

      const grading = readJson(join(variantDir, 'grading.json'));

      runs.push({
        id: `${evalName}-${variant}`,
        evalName: metadata?.eval_name || evalName,
        prompt: metadata?.prompt || '(No prompt found)',
        evalId: metadata?.eval_id,
        configuration: variant,
        outputs,
        grading,
      });
    }
  }

  return runs;
}

function loadPreviousData(workspace) {
  if (!workspace || !existsSync(workspace)) return {};
  const feedback = readJson(join(workspace, 'feedback.json'));
  const feedbackMap = {};
  if (feedback?.reviews) {
    for (const r of feedback.reviews) {
      if (r.feedback?.trim()) feedbackMap[r.run_id] = r.feedback;
    }
  }
  return feedbackMap;
}

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateHtml(runs, skillName, benchmark, previousFeedback, serverMode) {
  const evalGroups = {};
  for (const run of runs) {
    const key = run.evalName;
    if (!evalGroups[key]) evalGroups[key] = { prompt: run.prompt, runs: [] };
    evalGroups[key].runs.push(run);
  }

  const evalNames = Object.keys(evalGroups);

  // In server mode, Submit posts to /api/feedback
  // In static mode, Submit downloads a file
  const submitFn = serverMode
    ? `function submitFeedback() {
  saveFeedback();
  const reviews = [];
  for (const [evalName, fb] of Object.entries(feedback)) {
    reviews.push({ run_id: evalName, feedback: fb, timestamp: new Date().toISOString() });
  }
  const data = { reviews, status: 'complete' };
  fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json()).then(res => {
    if (res.ok) {
      document.querySelector('.submit-btn').textContent = 'Saved!';
      document.querySelector('.submit-btn').style.background = 'var(--green)';
      setTimeout(() => {
        document.querySelector('.submit-btn').textContent = 'Submit All Reviews';
        document.querySelector('.submit-btn').style.background = '';
      }, 2000);
    }
  }).catch(err => alert('Failed to save: ' + err.message));
}`
    : `function submitFeedback() {
  saveFeedback();
  const reviews = [];
  for (const [evalName, fb] of Object.entries(feedback)) {
    reviews.push({ run_id: evalName, feedback: fb, timestamp: new Date().toISOString() });
  }
  const data = { reviews, status: 'complete' };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'feedback.json'; a.click();
  URL.revokeObjectURL(url);
}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Eval Review — ${escapeHtml(skillName)}</title>
<style>
:root {
  --bg: #0d1117; --surface: #161b22; --border: #30363d;
  --text: #e6edf3; --muted: #7d8590; --accent: #58a6ff;
  --green: #3fb950; --green-bg: #0d2117; --red: #f85149; --red-bg: #2d1115;
  --radius: 8px; --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  --mono: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font); background: var(--bg); color: var(--text); min-height: 100vh; }
.header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
.header h1 { font-size: 1.25rem; font-weight: 600; }
.header .meta { font-size: 0.8rem; color: var(--muted); }
.tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); background: var(--surface); padding: 0 2rem; }
.tab { padding: 0.75rem 1.25rem; font-size: 0.875rem; font-weight: 500; color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent; }
.tab:hover { color: var(--text); }
.tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-content { display: none; }
.tab-content.active { display: block; }
.nav { display: flex; align-items: center; gap: 1rem; padding: 1rem 2rem; border-bottom: 1px solid var(--border); background: var(--surface); }
.nav button { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 0.4rem 1rem; border-radius: var(--radius); cursor: pointer; font-size: 0.8rem; }
.nav button:hover { border-color: var(--accent); }
.nav button:disabled { opacity: 0.3; cursor: default; }
.nav .counter { font-size: 0.875rem; color: var(--muted); }
.main { padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: 1.25rem; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.card-header { padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
.card-body { padding: 1rem; }
.badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; }
.badge-skill { background: rgba(88, 166, 255, 0.15); color: var(--accent); }
.badge-baseline { background: rgba(255, 193, 7, 0.15); color: #f0c000; }
.prompt-text { white-space: pre-wrap; font-size: 0.9rem; line-height: 1.6; color: var(--text); }
.output-file { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; margin-top: 0.75rem; }
.output-file-header { padding: 0.5rem 0.75rem; font-size: 0.8rem; color: var(--muted); background: var(--bg); border-bottom: 1px solid var(--border); font-family: var(--mono); }
.output-file pre { padding: 0.75rem; font-size: 0.8rem; line-height: 1.5; white-space: pre-wrap; word-break: break-word; font-family: var(--mono); overflow-x: auto; }
.output-file img { max-width: 100%; height: auto; padding: 0.75rem; }
.grade-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; font-size: 0.85rem; }
.grade-icon { width: 18px; text-align: center; }
.grade-pass { color: var(--green); }
.grade-fail { color: var(--red); }
.grade-evidence { font-size: 0.75rem; color: var(--muted); margin-left: 1.5rem; }
.feedback-textarea { width: 100%; min-height: 80px; padding: 0.75rem; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: var(--font); font-size: 0.875rem; resize: vertical; }
.feedback-textarea:focus { outline: none; border-color: var(--accent); }
.prev-feedback { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 0.5rem 0.75rem; margin-top: 0.5rem; font-size: 0.8rem; color: var(--muted); }
.bench-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.bench-table th, .bench-table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border); }
.bench-table th { color: var(--muted); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
.submit-bar { padding: 1rem 2rem; border-top: 1px solid var(--border); background: var(--surface); text-align: right; }
.submit-btn { background: var(--accent); color: #fff; border: none; padding: 0.6rem 1.5rem; border-radius: var(--radius); font-size: 0.875rem; font-weight: 600; cursor: pointer; }
.submit-btn:hover { opacity: 0.9; }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>Eval Review — ${escapeHtml(skillName)}</h1>
    <div class="meta">${runs.length} runs across ${evalNames.length} eval(s)</div>
  </div>
</div>
<div class="tabs">
  <div class="tab active" onclick="switchTab('outputs')">Outputs</div>
  <div class="tab" onclick="switchTab('benchmark')">Benchmark</div>
</div>
<div id="tab-outputs" class="tab-content active">
  <div class="nav">
    <button id="prev-btn" onclick="navigate(-1)" disabled>&larr; Prev</button>
    <span class="counter" id="nav-counter">1 / ${evalNames.length}</span>
    <button id="next-btn" onclick="navigate(1)" ${evalNames.length <= 1 ? 'disabled' : ''}>&rarr; Next</button>
  </div>
  <div class="main" id="outputs-main"></div>
  <div class="submit-bar">
    <button class="submit-btn" onclick="submitFeedback()">Submit All Reviews</button>
  </div>
</div>
<div id="tab-benchmark" class="tab-content">
  <div class="main" id="benchmark-main"></div>
</div>
<script>
const DATA = ${JSON.stringify({ evalGroups, benchmark, previousFeedback, evalNames })};
let currentIdx = 0;
const feedback = {};

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector('.tab-content#tab-' + name).classList.add('active');
  event.target.classList.add('active');
}

function navigate(delta) {
  saveFeedback();
  currentIdx = Math.max(0, Math.min(DATA.evalNames.length - 1, currentIdx + delta));
  renderEval();
}

function saveFeedback() {
  const ta = document.getElementById('feedback-input');
  if (ta) {
    const evalName = DATA.evalNames[currentIdx];
    feedback[evalName] = ta.value;
  }
}

function renderEval() {
  const evalName = DATA.evalNames[currentIdx];
  const group = DATA.evalGroups[evalName];
  const main = document.getElementById('outputs-main');

  document.getElementById('nav-counter').textContent = (currentIdx + 1) + ' / ' + DATA.evalNames.length;
  document.getElementById('prev-btn').disabled = currentIdx === 0;
  document.getElementById('next-btn').disabled = currentIdx === DATA.evalNames.length - 1;

  let html = '';
  html += '<div class="card"><div class="card-header">Prompt</div>';
  html += '<div class="card-body"><div class="prompt-text">' + escapeHtml(group.prompt) + '</div></div></div>';

  for (const run of group.runs) {
    const isSkill = run.configuration === 'with_skill';
    const badgeClass = isSkill ? 'badge-skill' : 'badge-baseline';
    const badgeLabel = isSkill ? 'WITH SKILL' : 'BASELINE';

    html += '<div class="card"><div class="card-header">';
    html += 'Output <span class="badge ' + badgeClass + '">' + badgeLabel + '</span>';
    html += '</div><div class="card-body">';

    if (run.outputs.length === 0) {
      html += '<div style="color:var(--muted);font-style:italic">No output files found</div>';
    }
    for (const file of run.outputs) {
      html += '<div class="output-file"><div class="output-file-header">' + escapeHtml(file.name) + '</div>';
      if (file.type === 'text') {
        html += '<pre>' + escapeHtml(file.content) + '</pre>';
      } else if (file.type === 'image') {
        html += '<img src="' + file.dataUri + '" alt="' + escapeHtml(file.name) + '">';
      } else {
        html += '<pre>' + escapeHtml(file.content || '(Unknown file type)') + '</pre>';
      }
      html += '</div>';
    }

    if (run.grading && run.grading.expectations) {
      html += '<div style="margin-top:1rem"><div style="font-size:0.8rem;font-weight:600;color:var(--muted);margin-bottom:0.5rem">ASSERTIONS</div>';
      for (const exp of run.grading.expectations) {
        const icon = exp.passed ? '<span class="grade-pass">&#10003;</span>' : '<span class="grade-fail">&#10007;</span>';
        html += '<div class="grade-row"><span class="grade-icon">' + icon + '</span> ' + escapeHtml(exp.text) + '</div>';
        if (exp.evidence) html += '<div class="grade-evidence">' + escapeHtml(exp.evidence) + '</div>';
      }
      html += '</div>';
    }
    html += '</div></div>';
  }

  const prevFb = DATA.previousFeedback[evalName];
  if (prevFb) {
    html += '<div class="card"><div class="card-header">Previous Feedback</div>';
    html += '<div class="card-body"><div class="prev-feedback">' + escapeHtml(prevFb) + '</div></div></div>';
  }

  html += '<div class="card"><div class="card-header">Your Feedback</div>';
  html += '<div class="card-body"><textarea class="feedback-textarea" id="feedback-input" placeholder="Leave feedback for this eval (optional)...">';
  html += escapeHtml(feedback[evalName] || '');
  html += '</textarea></div></div>';

  main.innerHTML = html;
}

function renderBenchmark() {
  const main = document.getElementById('benchmark-main');
  const bm = DATA.benchmark;
  if (!bm) {
    main.innerHTML = '<div class="card"><div class="card-body" style="color:var(--muted);text-align:center;padding:3rem">No benchmark data provided.</div></div>';
    return;
  }
  let html = '';
  if (bm.run_summary || bm.configurations) {
    html += '<div class="card"><div class="card-header">Summary</div><div class="card-body">';
    html += '<table class="bench-table"><thead><tr><th>Configuration</th><th>Pass Rate</th><th>Avg Tokens</th><th>Avg Duration</th></tr></thead><tbody>';
    const summary = bm.run_summary || {};
    for (const [config, stats] of Object.entries(summary)) {
      const pr = stats.pass_rate ? (stats.pass_rate.mean * 100).toFixed(1) + '%' : 'N/A';
      const tok = stats.tokens ? stats.tokens.mean.toLocaleString() : 'N/A';
      const dur = stats.time_seconds ? stats.time_seconds.mean.toFixed(1) + 's' : 'N/A';
      html += '<tr><td>' + escapeHtml(config) + '</td><td>' + pr + '</td><td>' + tok + '</td><td>' + dur + '</td></tr>';
    }
    if (bm.configurations) {
      for (const config of bm.configurations) {
        const agg = config.aggregate || {};
        const pr = agg.mean_pass_rate != null ? (agg.mean_pass_rate * 100).toFixed(1) + '%' : 'N/A';
        const tok = agg.mean_tokens != null ? agg.mean_tokens.toLocaleString() : 'N/A';
        const dur = agg.mean_duration_seconds != null ? agg.mean_duration_seconds.toFixed(1) + 's' : 'N/A';
        html += '<tr><td>' + escapeHtml(config.name) + '</td><td>' + pr + '</td><td>' + tok + '</td><td>' + dur + '</td></tr>';
      }
    }
    html += '</tbody></table></div></div>';
  }
  if (bm.delta) {
    html += '<div class="card"><div class="card-header">Delta</div><div class="card-body">';
    html += '<table class="bench-table"><tbody>';
    for (const [key, value] of Object.entries(bm.delta)) {
      html += '<tr><td style="font-weight:600">' + escapeHtml(key) + '</td><td>' + escapeHtml(String(value)) + '</td></tr>';
    }
    html += '</tbody></table></div></div>';
  }
  const runs = bm.runs || [];
  if (runs.length > 0) {
    html += '<div class="card"><div class="card-header">Per-Eval Breakdown</div><div class="card-body">';
    html += '<table class="bench-table"><thead><tr><th>Eval</th><th>Config</th><th>Pass Rate</th><th>Passed</th><th>Total</th></tr></thead><tbody>';
    for (const run of runs) {
      const r = run.result || run;
      const pr = r.pass_rate != null ? (r.pass_rate * 100).toFixed(0) + '%' : 'N/A';
      html += '<tr><td>' + escapeHtml(run.eval_name || '') + '</td><td>' + escapeHtml(run.configuration || '') + '</td>';
      html += '<td>' + pr + '</td><td>' + (r.passed || 0) + '</td><td>' + (r.total || 0) + '</td></tr>';
    }
    html += '</tbody></table></div></div>';
  }
  if (bm.notes && Array.isArray(bm.notes) && bm.notes.length > 0) {
    html += '<div class="card"><div class="card-header">Analyst Notes</div><div class="card-body"><ul style="padding-left:1.25rem">';
    for (const note of bm.notes) html += '<li style="margin-bottom:0.5rem;font-size:0.85rem">' + escapeHtml(note) + '</li>';
    html += '</ul></div></div>';
  }
  main.innerHTML = html;
}

function escapeHtml(str) {
  const el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
}

${submitFn}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowLeft') navigate(-1);
  if (e.key === 'ArrowRight') navigate(1);
});

renderEval();
renderBenchmark();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = createServer();
    tester.once('error', () => resolve(false));
    tester.listen(port, '127.0.0.1', () => {
      tester.close(() => resolve(true));
    });
  });
}

async function findFreePort(startPort, maxAttempts) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortFree(port)) return port;
  }
  throw new Error(`All ports ${startPort}-${startPort + maxAttempts - 1} are in use`);
}

function openBrowser(url) {
  const cmd = platform() === 'darwin' ? 'open'
    : platform() === 'win32' ? 'start'
    : 'xdg-open';
  exec(`${cmd} ${url}`, () => {});
}

async function startServer(opts) {
  const iterDir = opts.iterDir;
  const skillName = opts.skillName;
  const benchmarkPath = opts.benchmark ? resolve(opts.benchmark) : null;
  const previousFeedback = opts.previousWorkspace
    ? loadPreviousData(resolve(opts.previousWorkspace))
    : {};
  const feedbackPath = join(iterDir, 'feedback.json');

  const server = createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      // Re-scan workspace on each load (picks up new results)
      const runs = findRuns(iterDir);
      const benchmark = benchmarkPath ? readJson(benchmarkPath) : null;
      const html = generateHtml(runs, skillName, benchmark, previousFeedback, true);
      const buf = Buffer.from(html, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': buf.length });
      res.end(buf);
    } else if (req.method === 'POST' && req.url === '/api/feedback') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (!data.reviews) throw new Error('Missing reviews');
          writeFileSync(feedbackPath, JSON.stringify(data, null, 2) + '\n');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{"ok":true}');
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    } else if (req.method === 'GET' && req.url === '/api/feedback') {
      if (existsSync(feedbackPath)) {
        const data = readFileSync(feedbackPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(data);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{}');
      }
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  try {
    const port = await findFreePort(opts.port, MAX_PORT_ATTEMPTS);
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolve);
    });
    const url = `http://localhost:${port}`;

    console.log('');
    console.log('  Eval Viewer');
    console.log('  ─────────────────────────────────');
    console.log(`  URL:       ${url}`);
    console.log(`  Workspace: ${iterDir}`);
    console.log(`  Feedback:  ${feedbackPath}`);
    console.log('');
    console.log('  Press Ctrl+C to stop.');
    console.log('');

    openBrowser(url);
  } catch (err) {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }

  process.on('SIGINT', () => {
    console.log('\nStopped.');
    server.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.close();
    process.exit(0);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const opts = parseArgs();
  const runs = findRuns(opts.iterDir);

  if (runs.length === 0) {
    console.error(`No runs found in ${opts.iterDir}`);
    process.exit(1);
  }

  // Static mode
  if (opts.output) {
    const benchmark = opts.benchmark ? readJson(resolve(opts.benchmark)) : null;
    const previousFeedback = opts.previousWorkspace
      ? loadPreviousData(resolve(opts.previousWorkspace))
      : {};
    const html = generateHtml(runs, opts.skillName, benchmark, previousFeedback, false);
    mkdirSync(dirname(opts.output), { recursive: true });
    writeFileSync(opts.output, html);
    console.log(`Review viewer written to: ${opts.output}`);
    return;
  }

  // Server mode (default)
  startServer(opts);
}

main();
