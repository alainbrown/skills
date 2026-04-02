/**
 * Gemini Image Generation Script
 *
 * Adapt this template to the gathered parameters before running.
 * Do NOT use exec() / execSync() with string interpolation — this template uses
 * execFile-style patterns to avoid injection risks.
 *
 * FRAGILE: API shapes, model IDs, and field names may have changed.
 * See api-notes.md for known fragile patterns and verification links.
 */

import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";
import { createWriteStream } from "node:fs";

// ── Parameters (replace before running) ──────────────────────────────────────

const PROMPT = "REPLACE_WITH_PROMPT";
const OUTPUT_PATH = "REPLACE_WITH_OUTPUT_PATH"; // absolute path, e.g. /home/user/generated-images/1234.png
const ASPECT_RATIO = "1:1"; // "1:1" | "16:9" | "9:16" | "3:2"
const MODEL_ID = "gemini-2.0-flash-exp"; // TODO: verify current model ID (see api-notes.md)

// Reference image — set one of these, or leave both null for text-to-image
const REFERENCE_FILE_PATH = null; // e.g. "/home/user/photo.jpg"
const REFERENCE_URL = null;       // e.g. "https://example.com/photo.jpg"

// ── Setup ─────────────────────────────────────────────────────────────────────

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY environment variable is not set.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// ── Reference image loading ───────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const ALLOWED_MIME_PREFIXES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function extToMime(ext) {
  const map = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };
  return map[ext] || "image/jpeg";
}

async function loadReferenceImage() {
  if (REFERENCE_FILE_PATH) {
    const absPath = path.resolve(REFERENCE_FILE_PATH);

    // Existence check
    if (!fs.existsSync(absPath)) {
      console.error(`Error: Reference file not found: ${absPath}`);
      process.exit(1);
    }

    // Extension check
    const ext = path.extname(absPath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      console.error(`Error: Unrecognized image extension "${ext}". Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`);
      process.exit(1);
    }

    const data = fs.readFileSync(absPath);
    return { data: data.toString("base64"), mimeType: extToMime(ext) };
  }

  // URL path: by the time this script runs, the URL has already been downloaded,
  // verified by the user, and saved to REFERENCE_FILE_PATH by the skill's gather step.
  // This branch is a fallback only — prefer passing the downloaded temp file path above.
  if (REFERENCE_URL) {
    let url;
    try {
      url = new URL(REFERENCE_URL);
    } catch {
      console.error("Error: Invalid reference URL.");
      process.exit(1);
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      console.error("Error: Reference URL must use http or https.");
      process.exit(1);
    }

    const res = await fetch(REFERENCE_URL);
    if (!res.ok) {
      console.error(`Error: Failed to fetch reference image (${res.status})`);
      process.exit(1);
    }
    const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (!ALLOWED_MIME_PREFIXES.some((p) => contentType.startsWith(p))) {
      console.error(`Error: Response content-type "${contentType}" does not appear to be an image.`);
      process.exit(1);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    return { data: buffer.toString("base64"), mimeType: contentType || "image/jpeg" };
  }

  return null;
}

// ── Generation ────────────────────────────────────────────────────────────────

async function main() {
  // Ensure output directory exists
  const outputDir = path.dirname(path.resolve(OUTPUT_PATH));
  fs.mkdirSync(outputDir, { recursive: true });

  const refImage = await loadReferenceImage();

  // Build contents array
  // TODO: verify — field names and nesting may differ across SDK versions (see api-notes.md)
  const parts = [{ text: PROMPT }];
  if (refImage) {
    parts.push({ inlineData: { mimeType: refImage.mimeType, data: refImage.data } });
  }

  const contents = [{ role: "user", parts }];

  console.log(`Generating image with model: ${MODEL_ID}`);
  console.log(`Prompt: ${PROMPT}`);
  if (refImage) console.log("Reference image: loaded");

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL_ID,
      contents,
      generationConfig: {
        // TODO: verify field names — may differ across SDK versions
        responseModalities: ["IMAGE", "TEXT"],
        aspectRatio: ASPECT_RATIO,
      },
    });
  } catch (err) {
    console.error("Generation error:", err.message || err);
    if (err.status === 401) {
      console.error("→ API key was rejected. Check GEMINI_API_KEY.");
    } else if (err.status === 404) {
      console.error("→ Model not found. Check model ID in api-notes.md.");
    }
    process.exit(1);
  }

  // Extract image from response
  // TODO: verify response shape (see api-notes.md)
  let imageFound = false;
  for (const candidate of response.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.data) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        fs.writeFileSync(path.resolve(OUTPUT_PATH), buffer);
        console.log(`Image saved: ${OUTPUT_PATH}`);
        imageFound = true;
        break;
      }
    }
    if (imageFound) break;
  }

  if (!imageFound) {
    console.error("No image found in response. Raw response:");
    console.error(JSON.stringify(response, null, 2));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
