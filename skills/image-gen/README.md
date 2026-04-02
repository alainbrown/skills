# image-gen

Generate images using Nano Banana 2 via the Gemini API — text-to-image, image editing with a reference photo or URL, auto/interactive modes.

## Usage

Say something like:

- `"Generate a cute cat meme"`
- `"Create an image of me on a horse. Use /path/to/portrait.jpg as a reference."`
- `"Make a 16:9 background image of a misty mountain at sunrise"`
- `"Create an image of me as a superhero. Here's my photo: https://example.com/me.jpg"`

**Does not trigger for** SVG diagrams, Mermaid charts, UI wireframes, or code-based visuals.

## What it does

1. **Setup** — checks Node.js 18+, `@google/genai` package, and `GEMINI_API_KEY`; prompts for the key if missing
2. **Gather** — extracts prompt, optional reference image (file path or URL), aspect ratio, and output path
3. **Generate** — writes and runs a Node.js script using the `@google/genai` SDK; passes API key as env var only
4. **Present** — displays the image inline in the conversation via the Read tool; offers regenerate / refine / done

## Features

- **Auto mode** — brief, unambiguous requests proceed with defaults (1:1 aspect ratio, `./generated-images/<timestamp>.png`) without questions
- **Interactive mode** — asks for aspect ratio and output path; triggered for reference-image requests or when user intent is ambiguous
- **Text-to-image** — describe any scene, style, or subject
- **Reference file** — provide a file path; existence and extension are validated before the API is called
- **Reference URL** — URL is downloaded to a temp file, displayed inline for confirmation, and only used after the user approves
- **Safe execution** — scripts use `execFile` with argument arrays, never `exec`/`execSync` with string interpolation
- **Inline display** — generated PNG is read with the Read tool so it renders directly in the conversation

## Safety

- API key is never written to disk — passed only as an environment variable at script invocation
- URL scheme is validated before fetch (http/https only); `Content-Type` is checked before saving
- File references are validated for existence and image extension before any API call
- Requests for harmful content are declined

## Edge cases handled

- Missing file → reports exact absolute path checked, stops before API call
- Bad URL (non-image Content-Type, non-2xx) → reports clearly, asks for an alternative
- 401 (bad API key) → targeted message, prompts user to check key
- 404 (bad model ID) → directs to `references/api-notes.md` for alternatives
- No image in API response → shows raw response for debugging

## Test scenarios

| Prompt | Description |
|--------|-------------|
| "Generate a cute cat meme" | Happy path, auto mode, text-to-image |
| "Generate an image of me on a horse. Use /tmp/portrait.jpg." | Reference file path, interactive mode |
| "Create an image of me as a superhero. Here's my photo: https://example.com/me.jpg" | URL reference with download + confirmation flow |
| "Generate an image using /tmp/nonexistent-photo.png as a reference." | Edge case: missing file, should stop before API |

## Eval results (iteration 1)

| Eval | Skill Wins | Baseline Wins | Ties/N-A |
|------|-----------|--------------|----------|
| simple-text-to-image | 4/7 | 0/7 | 3/7 |
| reference-file-path | 6/7 | 2/7 | 0/7 |
| reference-url | 6/7 | 0/7 | 1/7 |
| bad-file-path | 5/7 | 0/7 | 2/7 |
| **Total** | **21/28 (75%)** | **2/28 (7%)** | **5/28** |

### Where the skill adds value

- **Inline image display** — baseline never uses the Read tool; the image never appears in the conversation
- **Security patterns** — baseline uses raw `https` with API key in the URL query string; skill uses `execFile` with env var
- **Fragility honesty** — baseline guesses model IDs without verification; skill marks them `// TODO: verify`
- **URL confirmation flow** — baseline fetches and uses reference URLs blindly; skill downloads, displays, and confirms
- **Pre-flight validation** — baseline writes a full script and lets it crash; skill checks file existence before writing anything

### Where the baseline holds up

- Basic file existence checking — a capable baseline agent does check `fs.existsSync` before proceeding
- Base64 encoding of reference images — standard operation the baseline handles correctly
