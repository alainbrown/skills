import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Rasterize design/logo.svg → public/icons/{16,32,48,128}.png using a headless
// Chromium (already installed for Playwright). FORGE: edit design/logo.svg, not
// the generated PNGs; re-run with `npm run icons`.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SVG_PATH = path.join(ROOT, 'design/logo.svg');
const OUT_DIR = path.join(ROOT, 'public/icons');
const SIZES = [16, 32, 48, 128];

// Strip any leading HTML comments so the SVG element is the root node.
const svg = readFileSync(SVG_PATH, 'utf8').replace(/<!--[\s\S]*?-->/g, '').trim();

const html = `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  #icon, #icon svg { display: block; }
</style>
</head>
<body>
<div id="icon">${svg}</div>
</body></html>`;

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  deviceScaleFactor: 1,
  viewport: { width: 256, height: 256 },
});

for (const size of SIZES) {
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((s) => {
    const el = document.querySelector('svg');
    el.setAttribute('width', String(s));
    el.setAttribute('height', String(s));
  }, size);
  const buf = await page.locator('svg').screenshot({ omitBackground: true });
  writeFileSync(path.join(OUT_DIR, `${size}.png`), buf);
  await page.close();
  console.log(`  rendered ${size}×${size} → public/icons/${size}.png`);
}

await context.close();
await browser.close();
