#!/usr/bin/env node
// POST each narration.json line to the Kokoro TTS server's OpenAI-compatible
// /v1/audio/speech endpoint (the `tts` service in docker-compose.yml), write
// one wav per scene into public/narration/, and emit manifest.json for the
// compositions (see narration.ts).
//
// render-all.sh runs this when KOKORO_URL is set (the `voice` profile sets it
// to http://tts:8880/v1) and treats a failure as a silent render. Standalone:
//   KOKORO_URL=http://localhost:8880/v1 node scripts/narrate.mjs

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileP = promisify(execFile);

const DEMO_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT_DIR = path.join(DEMO_DIR, "public", "narration");
const SCRIPT = path.join(DEMO_DIR, "narration.json");

const BASE = (process.env.KOKORO_URL || "http://localhost:8880/v1").replace(/\/$/, "");
// FORGE: "kokoro" is the model id Kokoro-FastAPI exposes for the OpenAI route.
// If you point KOKORO_URL at a different OpenAI-compatible TTS, change this.
const MODEL = process.env.KOKORO_MODEL || "kokoro";

// Duration of a clip in seconds. Prefer ffprobe (present in the render
// container); fall back to parsing the WAV header so `npm run narrate` also
// works on a host without ffmpeg. Kokoro returns canonical PCM WAV.
async function clipSeconds(file) {
  try {
    const { stdout } = await execFileP("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=nw=1:nk=1",
      file,
    ]);
    const secs = parseFloat(stdout.trim());
    if (Number.isFinite(secs)) return secs;
  } catch {
    // ffprobe missing/failed — fall through to the header parser.
  }
  return wavHeaderSeconds(await readFile(file));
}

// Minimal RIFF/WAVE reader: duration = data-chunk bytes / byteRate.
function wavHeaderSeconds(buf) {
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error("not a WAV file");
  }
  let byteRate = 0;
  let off = 12; // skip RIFF header + "WAVE"
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") byteRate = buf.readUInt32LE(off + 8 + 8);
    if (id === "data") {
      if (!byteRate) throw new Error("WAV data chunk before fmt");
      // Streamed WAVs (Kokoro) write a placeholder size like 0xFFFFFFFF, so
      // trust the bytes actually on disk rather than the declared chunk size.
      const onDisk = buf.length - (off + 8);
      const dataBytes = size === 0 || size > onDisk ? onDisk : size;
      return dataBytes / byteRate;
    }
    off += 8 + size + (size % 2); // chunks are word-aligned
  }
  throw new Error("WAV data chunk not found");
}

async function synth(text, voice, outFile) {
  const res = await fetch(`${BASE}/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, input: text, voice, response_format: "wav" }),
  });
  if (!res.ok) {
    throw new Error(`TTS ${res.status} ${res.statusText} — ${(await res.text()).slice(0, 200)}`);
  }
  await writeFile(outFile, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const { voice = "af_heart", lines = [] } = JSON.parse(await readFile(SCRIPT, "utf8"));
  if (!lines.length) throw new Error("narration.json has no lines");

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const scenes = {};
  for (const line of lines) {
    if (!line.text || !line.scene) continue;
    const file = `narration/${line.id}.wav`;
    const abs = path.join(OUT_DIR, `${line.id}.wav`);
    process.stdout.write(`  · ${line.scene} (${line.id}) … `);
    await synth(line.text, line.voice || voice, abs);
    const seconds = await clipSeconds(abs);
    scenes[line.scene] = { seconds, file };
    process.stdout.write(`${seconds.toFixed(2)}s\n`);
  }

  await writeFile(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify({ voice, scenes }, null, 2),
  );
  console.log(`  → ${path.relative(DEMO_DIR, OUT_DIR)}/manifest.json (${Object.keys(scenes).length} scenes)`);
}

main().catch((err) => {
  console.error(`narrate: ${err.message}`);
  process.exit(1);
});
