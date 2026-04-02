---
name: image-gen
description: >
  Generate images using Nano Banana 2 via the Gemini API. Use when the user asks to generate,
  create, or produce an image — including photo-realistic scenes, creative illustrations, memes,
  avatars, backgrounds, or image edits using a reference photo or URL.
  Trigger phrases: "generate an image", "create an image", "make a picture of", "draw me",
  "produce a photo of", "create a meme", "make a background", "put me on a horse",
  "use this photo", "edit this image", "generate something that looks like", "make an image of".
  Do NOT trigger for SVG diagrams, Mermaid charts, UI wireframes, or any request for structured
  vector graphics or code-based visuals.
---

# Image Gen

<purpose>
Generate images using Google's Nano Banana 2 model via the Gemini API. Handles text-to-image
generation and image editing with a reference file or URL. Runs a Node.js script, saves the
result as a PNG, and displays it inline in the conversation.
</purpose>

<process>

<step name="setup">
**Verify the runtime environment is ready before asking the user anything.**

### Node.js

Run `node --version`. If missing or below v18, stop and tell the user:
> "This skill requires Node.js 18+. Please install it and try again."

### @google/genai

Run `node -e "require('@google/genai')"` in the target directory.
If it fails, offer to install it:
> "The @google/genai package isn't installed. Install it now?"
Run `npm install @google/genai` if the user agrees. If they decline, stop.

### API key

Check `process.env.GEMINI_API_KEY` by running:
```bash
node -e "console.log(process.env.GEMINI_API_KEY ? 'found' : 'missing')"
```

If missing, ask the user for their Gemini API key as plain text. Store it for the duration
of the script call as an environment variable (`GEMINI_API_KEY=<key> node ...`).
Do NOT write the key to any file.

▶ Next: `gather`
</step>

<step name="gather">
**Collect everything needed to generate the image before running anything.**

### Mode

Determine mode from context:
- If the user's request was brief and unambiguous (e.g. "generate a cute cat meme"), use **auto mode** — apply defaults, skip optional questions.
- If the user seems to want control, mentioned specific preferences, or the request is ambiguous — use **interactive mode**.

When in doubt, use interactive.

### Prompt

Extract the image description from the user's message. If the description is vague or very short
(under 5 words), ask for more detail before proceeding.

Enrich the prompt slightly for quality — add photorealism or style cues if the user didn't specify
and the request would benefit from them. Keep the enrichment conservative; don't override the
user's intent.

### Reference image (optional)

Check whether the user provided a reference image:

| Input type | How to handle |
|------------|---------------|
| File path (absolute or relative) | Validate, then base64 encode |
| Web URL | Download, verify with user, then base64 encode |
| None | Text-to-image only |

If a reference image is present, use the image-editing model path (see `references/api-notes.md`).

**File path validation** — before proceeding:
1. Resolve to an absolute path
2. Confirm the file exists — if not, stop and tell the user which path was checked
3. Confirm the extension is a recognized image type (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`) — if not, ask the user whether to proceed anyway
4. Only then base64 encode and continue

**Web URL handling** — download before generating:
1. Validate the URL is http/https — reject other schemes
2. Download the image with `fetch()`, check the response is OK (2xx) and the `Content-Type` is an image type
3. Save temporarily to `/tmp/image-gen-ref-<timestamp>.<ext>`
4. Read the temp file and display it inline using the Read tool so the user can see what was fetched
5. Ask via AskUserQuestion:
   - header: "Confirm ref"
   - question: "Is this the correct reference image?"
   - options:
     - "Yes, use it" — proceed to aspect ratio / output path
     - "No, use a different one" — ask for a new path or URL
6. Clean up the temp file after generation completes (or if the user declines)

### Aspect ratio

| Mode | Behavior |
|------|----------|
| Auto | Default to `1:1` |
| Interactive | Ask via AskUserQuestion (see options below) |

In interactive mode, ask via AskUserQuestion:
- header: "Aspect ratio"
- question: "What aspect ratio should the image be?"
- options:
  - "1:1 Square (Recommended)" — social media, memes, avatars
  - "16:9 Landscape" — banners, backgrounds, wallpapers
  - "9:16 Portrait" — mobile wallpapers, stories
  - "3:2 Photo" — standard photography proportions

### Output path

| Mode | Behavior |
|------|----------|
| Auto | Save to `./generated-images/<timestamp>.png` relative to current directory |
| Interactive | Ask via AskUserQuestion (see options below) |

In interactive mode, ask via AskUserQuestion:
- header: "Output path"
- question: "Where should the image be saved?"
- options:
  - "./generated-images/<timestamp>.png (Recommended)" — auto-named in local folder
  - "Current directory" — save as `image-<timestamp>.png` in the working directory
  - "Let me specify" — user provides a path

Create the output directory if it doesn't exist.

▶ Next: `generate`
</step>

<step name="generate">
**Write and run the generation script.**

Read `references/script-template.js` and adapt it to the gathered parameters:
- `prompt` — the enriched image description
- `referenceImage` — base64 data + mimeType, or null
- `referenceSource` — "file" | "url" | null
- `aspectRatio` — chosen ratio string
- `outputPath` — resolved absolute path
- `apiKey` — from environment or user input

Write the adapted script to a temp file (e.g. `/tmp/image-gen-run.js`), then run:

```bash
GEMINI_API_KEY=<key> node /tmp/image-gen-run.js
```

Do not log the API key to console output.

### Error handling

| Error | Response |
|-------|----------|
| 401 / invalid API key | Tell the user the key was rejected, ask them to check it |
| 404 / model not found | The model ID may be outdated — check `references/api-notes.md` for alternatives |
| No image in response | The model may have declined the prompt — show the raw response, suggest rephrasing |
| Network error | Report it as-is, suggest checking connectivity |

▶ Next: `present`
</step>

<step name="present">
**Display the result and offer next actions.**

After successful generation:
1. Read the saved PNG file using the Read tool — this displays the image inline in the conversation.
2. State the output path clearly.

Then offer next actions via AskUserQuestion:
- header: "Next?"
- question: "Image saved. What would you like to do?"
- options:
  - "Done" — all good, no further action
  - "Regenerate" — run again with the same prompt (different seed)
  - "Refine prompt" — tweak the description and regenerate
  - "Change aspect ratio" — re-run with a different ratio

For "Regenerate" and "Refine prompt", loop back to `generate` (or `gather` for prompt changes)
without repeating setup.

Clean up the temp script file after the conversation is done or on "Done".
</step>

</process>

<guardrails>
- NEVER write the API key to any file — pass it only as an env var in the script invocation
- NEVER use exec() or execSync() with shell string interpolation — always use execFile() or spawn() with argument arrays to prevent injection
- NEVER skip the Node.js version check — the @google/genai SDK requires Node 18+
- NEVER generate images for requests that describe harm to real people, illegal content, or CSAM — decline and explain
- If the user's request is ambiguous about whether they want an SVG/diagram vs. a raster image, ask before proceeding
- Do not force-fit requests that are clearly asking for vector graphics — redirect to appropriate tools instead
</guardrails>

<success_criteria>
- [ ] Node.js 18+ and @google/genai are confirmed present before any generation attempt
- [ ] API key is sourced from env or user input — never written to disk
- [ ] Prompt is extracted and optionally enriched without overriding user intent
- [ ] Reference image (if any) is correctly loaded from file path or URL and base64 encoded
- [ ] Aspect ratio and output path are set (auto defaults or interactive choices)
- [ ] Generation script runs without shell injection risk
- [ ] Generated PNG is saved to the specified output path
- [ ] Image is displayed inline via the Read tool
- [ ] User is offered regenerate / refine / done options after success
</success_criteria>
