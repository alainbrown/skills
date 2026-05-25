---
name: demo-creator
description: >
  Create a demo of a project from its codebase using Remotion. Supports narrated MP4 (ElevenLabs TTS),
  silent MP4, and animated GIF outputs — picked early so the rest of the flow adapts. Optionally renders
  inside a Docker container with all dependencies pre-installed. Use when the user says "create a demo",
  "make a demo video", "make a demo GIF", "generate a project demo", "showcase this project", "make a
  video walkthrough", "demo this codebase", "record a demo", or describes wanting a video, GIF, or
  visual walkthrough of their project.
---

# Demo Creator

<purpose>
Read a project's codebase, understand what it does, write a narrated demo script, generate
text-to-speech audio via ElevenLabs, and produce a Remotion video project that showcases the
project. The user reviews and tweaks the video before optionally rendering to MP4.
</purpose>

<core_principle>
**Durable state via `.demo-state.json`.** This file tracks decisions across the multi-step
workflow — demo style, focus areas, script, voice config, scene breakdown. Write after every
significant change. Read before each step. Delete after the final render or when the user is done.
</core_principle>

## State file schema

```json
{
  "projectName": "<name>",
  "projectDir": "<path>",
  "remotionDir": "<path to generated remotion project>",
  "phase": "prerequisites|analyze|script|generate|review",
  "outputFormat": "mp4-audio | gif | mp4-silent",
  "machineCheck": {
    "node": "present|missing",
    "ffmpeg": "present|missing|not-needed",
    "docker": "present|missing",
    "dockerCompose": "present|missing",
    "chromiumDeps": "present|missing|not-applicable"
  },
  "dockerMode": "render-only | full | skip",
  "demoStyle": "walkthrough|explainer|technical",
  "focusAreas": ["<feature or flow to highlight>"],
  "analysis": {
    "summary": "<what the project does>",
    "techStack": ["<languages, frameworks>"],
    "keyFeatures": ["<features identified>"],
    "entryPoints": ["<main files or flows>"]
  },
  "script": {
    "scenes": [
      {
        "id": 1,
        "title": "<scene title>",
        "narration": "<voiceover text — audio modes only>",
        "onScreenText": ["<text — GIF/silent modes>"],
        "keyVisual": "<the one thing that must be seen — GIF/silent>",
        "visual": "<what appears on screen>",
        "durationEstimate": "<seconds>"
      }
    ],
    "totalDuration": "<estimated seconds>",
    "approved": false
  },
  "creativeDirection": {
    "visualStyle": "<dark-technical | warm-modern | clean-minimal | bold-futuristic | custom>",
    "colorPalette": ["<hex colors derived from project or recommended>"],
    "music": "<genre recommendation, 'none', or null in GIF mode>",
    "tone": "<casual-technical | pitch-confident | academic-clear | friendly | custom | null in GIF mode>"
  },
  "voice": {
    "voiceId": "<elevenlabs voice id>",
    "voiceName": "<human-readable name>",
    "model": "eleven_multilingual_v2",
    "stability": 0.5,
    "similarityBoost": 0.75
  },
  "// voice is null (whole field) when outputFormat != mp4-audio": "",
  "decisions": {}
}
```

<process>

<step name="prerequisites">
**Pick the output format, check the machine, and decide on Docker — in that order.**

The output format gates everything else: GIF mode skips the entire audio branch, Docker mode
swaps the rendering commands. Decide these first so the rest of the flow stays coherent.

### 1. Output format

Ask via AskUserQuestion:
- header: "Output"
- question: "What kind of demo do you want?"
- options:
  - "MP4 with audio" — narrated video with ElevenLabs voiceover, captions, music (60-180s typical)
  - "Animated GIF" — silent, README-embed friendly, on-screen text carries the message (8-25s typical)
  - "MP4 silent" — video with on-screen text only, no voiceover (good when audio plays awkwardly)
  - "Let me explain" — describe what you need

Record `outputFormat` in `.demo-state.json`. This drives branching in every subsequent step:

| Format | Skips | Adds |
|--------|-------|------|
| `mp4-audio` | — | ElevenLabs key check, TTS, captions, voice/music recs |
| `gif` | ElevenLabs check, TTS, captions, music/voice/tone | Silent script pattern, GIF render command |
| `mp4-silent` | ElevenLabs check, TTS, captions, voice | Music optional, on-screen text emphasis |

### 2. Machine check

Run the dependency check appropriate to the chosen format. See `references/docker-render.md`
§ "Machine check commands" for the exact bash. Run all checks in parallel and report results
as a single table:

```
Machine check:
  node           ✓ v22.10.0
  docker         ✓ 27.3.1
  docker compose ✓ v2.29.7
  chromium deps  ✗ missing (Linux)
  ffmpeg         — system binary not present (Remotion bundles its own, OK for basic render)

Without chromium deps, host render will fail. Docker container avoids this.
```

Always run on every output format:
- `node --version` (required for everything)
- `docker --version` and `docker compose version` (informational — unlocks the Docker fallback)

Conditional checks:
- On Linux, check Chromium runtime libs via `ldconfig -p | grep libnss3`. Missing on Linux is
  a render-blocker for both MP4 and GIF unless Docker is used.
- `ffmpeg -version` — **informational only**. Remotion v4+ bundles its own ffmpeg. The system
  binary matters only for advanced post-processing (e.g., GIF palette optimization).

Record findings in `.demo-state.json.machineCheck`.

### 3. Hard-block if unrecoverable

If the user picked a format requiring render AND:
- `node` is missing AND `docker` is missing, OR
- on Linux: Chromium deps missing AND `docker` is missing

…stop. Do not scaffold a project the user cannot render. Present the exact install commands
(`apt install ...` or `brew install ...`) for the missing pieces, or suggest installing Docker
and re-running. Do not proceed past this point until the user resolves it or aborts.

### 4. Docker decision

Offer Docker when the machine check found gaps OR the user prefers isolation. If the host
is fully equipped and the user hasn't asked, skip this question — don't push Docker for its
own sake (it adds ~2 min cold image build).

Ask via AskUserQuestion:
- header: "Docker"
- question: "How should rendering run?"
- options:
  - "Render-only container (recommended)" — copy Dockerfile + compose to project; render via `docker compose run render`. Preview still uses host node.
  - "Full dev+render container" — preview and render both in Docker. Best when no host node.
  - "Skip Docker" — use host `npx remotion` only. Only choose if machine check showed all green.

Record `dockerMode` in state. If `render-only` or `full`, the `generate` step copies templates
from `references/docker/` to the project root. See `references/docker-render.md` for the
copy commands and per-format render command overrides.

### 5. ElevenLabs API key (audio mode only)

Skip this entire section if `outputFormat != "mp4-audio"`.

Check if `$ELEVENLABS_API_KEY` is set. If missing:

Ask via AskUserQuestion:
- header: "ElevenLabs"
- question: "No ElevenLabs API key found. Audio mode requires one. How to proceed?"
- options:
  - "I'll set it now" — pause while user runs `export ELEVENLABS_API_KEY=...`
  - "Switch to GIF" — animated GIF, silent, no key needed
  - "Switch to silent MP4" — MP4 with on-screen text only, no key needed
  - "Let me explain" — alternative setup

If the user switches format, update `outputFormat` in state and revisit the machine check
section if the new format has different requirements.

### 6. Existing Remotion project

Check if the current directory or a subdirectory already contains a Remotion project
(`remotion.config.ts` or `@remotion/cli` in package.json).

Ask via AskUserQuestion:
- header: "Remotion"
- question: "Found an existing Remotion project at `<path>`. Use it or create a new one?"
- options:
  - "Use existing" — add demo compositions to the existing project
  - "Create new" — scaffold a fresh project alongside it

If no Remotion project exists, the generate step will scaffold one.

### 7. Codebase size

Run a quick assessment: count files, estimate total lines, identify languages. If the codebase
is large (>500 files or >50k lines), present a summary and let the user choose focus areas
early rather than trying to read everything.

Write `.demo-state.json` with all decisions and findings.

Next: `analyze`
</step>

<!-- ═══════════════════════════════════════════ -->

<step name="analyze">
**Read the codebase and identify what's worth demoing.**

### Read strategically

Read in this priority order, stopping when you have enough to summarize:

1. **Project metadata** — README, CHANGELOG, package.json / pyproject.toml / Cargo.toml
2. **Architecture docs** — CLAUDE.md, docs/architecture.md, CONTRIBUTING.md, any design docs
3. **Entry points** — main files, index files, app routers, CLI entry points
4. **Directory structure** — `ls` the top-level and key subdirectories
5. **Configuration** — env files, docker-compose, CI config (reveals integrations)
6. **Key modules** — Grep for patterns rather than reading file-by-file:
   - API routes: `export.*route|app\.(get|post|put)|router\.\w+`
   - Components: `export.*function|export default`
   - Tools/plugins: `tool\(|plugin\(|register`
   - Config keys: patterns specific to the project's framework

**Sizing guide:**
- Small projects (<50 files): read everything.
- Medium projects (50-500 files): read 10-20 high-signal files + Grep for breadth.
  Present your reading plan to the user before executing: "I'll read these 15 files to
  understand the project: [list]. Want me to add or skip any?"
- Large projects (>500 files): read 10-15 files max. Tell the user the codebase is large,
  explain your sampling strategy, and let them choose focus areas before reading deeper.

### Synthesize findings

Build a structured summary:
- **What the project does** (one paragraph)
- **Tech stack** (languages, frameworks, key dependencies)
- **Project type** (web app, CLI, library/SDK, API service, mobile app, etc.)
- **Key features** (3-8 things worth highlighting)
- **Entry points** (main flows a user would interact with)
- **Visual approach** — tailor to the project type:
  - Web app: recreate key UI states as Remotion components using the project's own design
    tokens (colors, fonts, spacing). If capture scripts exist, reference real screenshots
    via staticFile(). Show user flows as animated state transitions.
  - CLI tool: build a TerminalWindow component with the project's actual terminal chrome
    (header, footer, status bars). Recreate TUI elements as React components. Use monospace
    fonts and the project's terminal color scheme. Show realistic command sequences with
    typewriter text and animated output.
  - Library/SDK: animate code examples with syntax highlighting and reveal animations.
    Show before/after comparisons. Visualize API patterns as flow diagrams.
  - API service: animate request/response flows with HTTP verb badges and JSON payloads.
    Show architecture as animated box-and-arrow diagrams. Visualize data flows.
  - Mixed: identify the primary interaction surface and lead with that approach.

### Extract design tokens and discover assets

Actively extract the project's visual identity for use in the Remotion project:

**Design tokens (required):** Search for and extract:
- CSS custom properties (`--color-*`, `--font-*`) from globals.css or theme files
- Tailwind config colors and fonts from `tailwind.config.*`
- Terminal color scheme from TUI component source (for CLI tools)
- Brand colors from README badges, logos, or HuggingFace/npm metadata

Record the extracted palette (3-7 hex colors), primary font, and background color in the
state file under `analysis.designTokens`. The generate step will use these to create a
`src/theme.ts` constants file in the Remotion project, ensuring the video visually matches
the project.

**Existing assets (check for):**
- Screenshots or GIFs (README images, docs/, assets/) — copy to `public/` for use via staticFile()
- Screen capture scripts (Playwright, Puppeteer) — reuse for authentic UI recordings
- Dev flags (mock data modes, auth bypass, seed data) — note for realistic demo content
- Existing demo videos or recordings — understand what's already been shown

### Present and refine

Show the summary to the user. Then ask:

Ask via AskUserQuestion:
- header: "Demo style"
- question: "What style of demo should this be?"
- options:
  - "Walkthrough" — narrated tour of features, showing UI or code highlights scene by scene
  - "Explainer" — what this project does and why it matters, pitch-style
  - "Technical" — architecture, key flows, how things connect under the hood
  - "Let me explain" — custom style

Then ask what to focus on. Present the key features as selectable options:

Ask via AskUserQuestion (multiSelect):
- header: "Focus"
- question: "Which features should the demo highlight? (select all that apply)"
- options: (generated from the key features found, up to 4 — user can add more via "Let me explain")

Update `.demo-state.json` with analysis, demo style, and focus areas.

Next: `creative_direction`
</step>

<!-- ═══════════════════════════════════════════ -->

<step name="creative_direction">
**Recommend a cohesive creative direction based on the project analysis.**

After analyzing the codebase, you have enough context to make informed recommendations about
the video's look, feel, and sound. Present a creative direction package — don't just use the
same defaults for every project.

### Branch by output format

| Format | Recommend |
|--------|-----------|
| `mp4-audio` | Visual style, palette, music, voice, tone — full package |
| `mp4-silent` | Visual style, palette, music (optional). Skip voice, tone. |
| `gif` | Visual style, palette only. Skip music, voice, tone. Set them to `null` in state. |

For GIF and silent modes, do not recommend a voice or tone — there's no narration to apply
them to. Setting them to `null` (not "skipped") prevents the script step from leaving
narration placeholders.

### Derive recommendations from the analysis

Consider these signals from the codebase:

| Signal | Informs |
|--------|---------|
| Target audience (developers, end users, investors, judges) | Tone and voice style |
| Project domain (education, infrastructure, ML, developer tools) | Visual style and music |
| Existing design system (colors, fonts, dark/light mode) | Color palette and typography |
| Brand personality (playful, serious, technical, approachable) | Overall style and narration tone |
| Project maturity (hackathon, production, open source) | Polish level and tone |

### Present the recommendation

Show a creative direction summary:

```
Creative Direction:
  Visual style:  [e.g., "Dark technical" / "Warm modern" / "Clean minimal" / "Bold futuristic"]
  Color palette:  [derived from project's design tokens, or recommended based on domain]
  Music:          [e.g., "Lo-fi ambient" / "Upbeat electronic" / "Orchestral minimal" / "None"]
  Voice:          [ElevenLabs voice name + why — e.g., "Rachel (calm, professional) — matches
                   the enterprise audience"]
  Tone:           [e.g., "Casual-technical" / "Pitch-confident" / "Academic-clear" / "Friendly"]
  Why:            [1-2 sentences tying recommendations to the project analysis]
  Coherence:      [How the choices reinforce each other — e.g., "dark style + monospace accents
                   + lo-fi music + casual voice all point to 'developer tool in its natural
                   habitat' — consistent identity, no mixed signals"]
```

**Cross-reference your choices.** Each recommendation should reinforce the others. If you pick
a warm style but a cold authoritative voice, that's a mixed signal — explain why or adjust.
The coherence line forces you to check that the package works as a whole.

**Examples of good recommendations:**

- Education app for kids → Warm modern style, bright colors from the app's palette, upbeat
  background music, friendly voice (Bella), encouraging tone
- DevOps infrastructure tool → Dark technical style, terminal-inspired palette, ambient/minimal
  music, authoritative voice (Antoni), casual-technical tone
- ML research demo → Clean minimal style, neutral colors, no music, clear neutral voice (Rachel),
  academic-clear tone
- Developer CLI tool → Terminal-dark style, monospace accents, lo-fi beats, casual voice (Elli),
  developer-to-developer tone

### Let the user adjust

Ask via AskUserQuestion:
- header: "Style"
- question: "Here's the creative direction I recommend. Adjust anything?"
- options:
  - "Looks good" — proceed with these recommendations
  - "Change style" — I want a different visual feel
  - "Change voice" — I want a different narrator voice or tone
  - "Let me explain" — custom adjustments

If the user wants changes, iterate until they're satisfied.

### Music note

The skill generates a Remotion project — background music can be added as an `<Audio>` component
referencing a file in `public/music/`. The skill should suggest a music style but the user needs
to provide or source the actual audio file. Suggest royalty-free sources (e.g., YouTube Audio
Library, Pixabay Music, Uppbeat) if the user wants music.

Update `.demo-state.json` with the creative direction choices.

Next: `script`
</step>

<!-- ═══════════════════════════════════════════ -->

<step name="script">
**Write the demo script — the blueprint for the video.**

For GIF and silent modes, read `references/gif-output.md` § "Script differences" first —
silent scripts have different structure and pacing than narrated ones.

### Draft the script

Based on the demo style, focus areas, and output format, write a scene-by-scene script.

**Audio mode (`mp4-audio`)** — each scene needs:

| Field | Description |
|-------|-------------|
| `title` | Short scene name (e.g., "Introduction", "API Endpoints", "Live Demo") |
| `narration` | The voiceover text — what the narrator says |
| `visual` | What appears on screen — code snippets, architecture diagrams, UI mockups, text overlays |
| `durationEstimate` | Seconds (narration word count / 150 wpm) |
| `words` | Word count of this scene's narration |
| `chars` | Character count (for TTS budget tracking) |
| `transition` | Transition into this scene (fade, slide-left, etc.) — match the creative direction style |

**Silent modes (`gif`, `mp4-silent`)** — each scene needs:

| Field | Description |
|-------|-------------|
| `title` | Short scene name |
| `onScreenText` | 1-2 short phrases (≤8 words each), timed with the action |
| `keyVisual` | The single most important thing the viewer must see this scene |
| `visual` | Full description of what's on screen |
| `durationFrames` | Frame count at the source fps (typically 30) |
| `transition` | Transition into this scene |

Omit `narration` entirely in silent modes — don't leave it as an empty string.

**Script guidelines by demo style:**

- **Walkthrough:** Project intro → feature tour → how to get started.
- **Explainer:** Problem → solution → supporting features → call to action.
- **Technical:** Architecture → key flows → code patterns → what makes it interesting.

**Duration targets by format:**
- `mp4-audio`: 60-180 seconds. Voice fills time; scenes 15-30s each.
- `mp4-silent`: 30-90 seconds. No voice to fill time; scenes 4-10s each.
- `gif`: 8-25 seconds. Every second matters; scenes 2-5s each.

### Present for review

Show the full script to the user in a readable format:

```
Scene 1: Introduction (15s)
  Narration: "..."
  Visual: ...

Scene 2: Feature X (20s)
  Narration: "..."
  Visual: ...
```

Ask the user to review. They may want to:
- Edit narration text
- Reorder scenes
- Add or remove scenes
- Adjust tone (more technical, more casual, etc.)

### Validate production metrics

After presenting the script, show a metrics summary tuned to the output format.

**Audio mode:**

```
Script metrics (mp4-audio):
  Total duration:  ~105 seconds (within 60-180s target)
  Total words:     280 (at 150 wpm = 112s narration)
  TTS characters:  1,520 (within 10,000 free tier)
  Scenes:          6
  Avg scene:       ~17 seconds
  Transitions:     5 x 15 frames = 2.5s overlap
```

Flag issues: total over 180s, any scene under 8s or over 30s, TTS characters near the
10,000 free tier limit.

**GIF / silent modes:**

```
Script metrics (gif):
  Total duration:  ~18 seconds (within 8-25s target)
  Total frames:    540 at 30fps → 180 frames at every-nth=3 (~6fps GIF)
  Scenes:          5
  Avg scene:       ~3.6 seconds
  Estimated size:  ~3-6 MB (rough — see references/gif-output.md § Size optimization)
```

Flag issues for GIF: total over 25s, any scene over 6s, source resolution above 1080×608.
Flag for silent MP4: total over 90s, any scene over 10s.

Iterate until the user approves. Set `script.approved: true` in the state file.

Next: `generate`
</step>

<!-- ═══════════════════════════════════════════ -->

<step name="generate">
**Build the Remotion project, copy Docker templates if chosen, generate audio if applicable.**

Read `references/remotion-patterns.md` for Remotion API patterns and project structure.
Read `references/elevenlabs-tts.md` for TTS generation (audio mode only).
Read `references/gif-output.md` for silent script → component patterns and the GIF render command (gif mode).
Read `references/docker-render.md` § "Copying templates" if `dockerMode != "skip"`.

### Scaffold Remotion project (if needed)

If no existing project is being used:

```bash
npx create-video@latest <project-name>-demo --template blank
```

Install transition dependencies:
```bash
cd <project-name>-demo && npx remotion add @remotion/transitions && npx remotion add @remotion/google-fonts && npx remotion add @remotion/media
```

### Create theme constants

Generate `src/theme.ts` from the design tokens extracted during analysis:

Use the design tokens from `analysis.designTokens` in the state file. Export colors, fonts,
and spacing as constants. All scene components import from `theme.ts` rather than hardcoding
colors — this ensures the demo visually matches the project.

### Copy Docker templates (if chosen)

If `dockerMode != "skip"`, copy the templates from `references/docker/` to the project root.
The exact commands are in `references/docker-render.md` § "Copying templates into the
generated project". After copying, create the `out/` directory and add the per-format render
command notes to the project's own README.

### Generate audio (audio mode only)

Skip this entire section if `outputFormat != "mp4-audio"`.

Generate MP3 files for each scene's narration. See `references/elevenlabs-tts.md` for the
generation script pattern.

- One MP3 per scene, saved to `public/audio/scene-<N>.mp3`
- After generation, measure each audio file's duration to calculate exact frame counts

For non-audio formats (`gif`, `mp4-silent`), use the `durationFrames` value from the script
directly — no audio measurement needed.

### Build scene components

For each scene in the script, create a React component in `src/scenes/`:

- Use the visual description to build the scene content
- Code snippets: syntax-highlighted text with reveal animations
- Text overlays: animated title and description text
- Architecture: box-and-arrow layouts with animated connections
- Apply entrance animations (fade, slide, spring) per `references/remotion-patterns.md`
- In GIF / silent modes, build an `OnScreenText` component (sample in
  `references/gif-output.md` § "Captions in GIF mode") and use it as the primary message
  carrier in each scene — the on-screen text is the explanation, not a transcript

### Wire up the composition

Create the main composition in `src/Root.tsx`:
- Use `<TransitionSeries>` to sequence scenes with transitions between them
- Audio mode: add `<Audio>` components for each scene's voiceover. Calculate total duration
  from audio durations + transition overlaps. Use `calculateMetadata` if data-driven.
- Silent/GIF modes: no `<Audio>` components. Total duration is the sum of `durationFrames`
  from the script.
- For GIF, target a sensible composition size — 800×450 or 720×405 keeps file size in check.
  See `references/gif-output.md` § "Composition setup for GIF" for the full pattern.

### Captions (audio mode only)

Skip if `outputFormat != "mp4-audio"`. In silent and GIF modes, on-screen text is part of
each scene component, not a separate captions track.

Generate a captions JSON from the narration text and audio timing. Display subtitles synced
to the voiceover using Remotion's caption patterns.

Update `.demo-state.json` with `remotionDir` and phase.

Next: `review`
</step>

<!-- ═══════════════════════════════════════════ -->

<step name="review">
**Let the user preview, then render in the right format and runtime.**

### Preview

Pick the preview command based on `dockerMode`:

| dockerMode | Preview command |
|-----------|-----------------|
| `skip` or `render-only` | `cd <remotion-dir> && npx remotion studio` |
| `full` | `cd <remotion-dir> && docker compose up studio` |

In all cases, point the user to http://localhost:3000.

Ask: "How does it look? Anything you'd like to change?"

If the user wants changes, make them and re-preview. Common adjustments:
- Timing (scenes too fast/slow)
- Text content or narration / on-screen text wording
- Animation style
- Color scheme or layout
- Scene order

### Render

When the user is satisfied:

Ask via AskUserQuestion:
- header: "Render"
- question: "Ready to render?"
- options:
  - "Render now" — render to the chosen format
  - "Not yet" — keep tweaking, I'll render later

Pick the render command based on `outputFormat` × `dockerMode`:

| Format | Host | Docker (render-only or full) |
|--------|------|------------------------------|
| `mp4-audio` | `npx remotion render Demo out/demo.mp4` | `docker compose run --rm render` |
| `mp4-silent` | `npx remotion render Demo out/demo.mp4` | `docker compose run --rm render` |
| `gif` | `npx remotion render Demo out/demo.gif --codec=gif --every-nth-frame=3` | `docker compose run --rm render npx remotion render Demo out/demo.gif --codec=gif --every-nth-frame=3` |

`mp4-silent` and `mp4-audio` use the same render command — what makes a render silent is the
absence of voice `<Audio>` components in the composition, not a CLI flag. Remotion 3.2+
omits the audio track entirely when no `<Audio>` is present. If the user added background
music via `<Audio>` in silent mode, it plays as expected.

Only use `--muted` if you specifically need to strip an existing audio track (rare — covered
in `references/remotion-patterns.md`).

For GIF, after rendering, check the file size and report it. If over 10MB, suggest the
optimizations in `references/gif-output.md` § "Size optimization" (shorter duration first,
then `--every-nth-frame`, then scale, then palette).

Report the output path and file size when done.

### Clean up state

Delete `.demo-state.json` — the Remotion project (plus Dockerfile and compose if applicable)
is the durable artifact now.
</step>

</process>

<guardrails>
- NEVER read the entire codebase of large projects — use strategic sampling and Grep
- NEVER commit API keys or secrets — the ElevenLabs key stays in the environment only
- NEVER render without user approval — always preview first
- NEVER generate TTS without an approved script — the user must review narration text
- NEVER overwrite an existing Remotion project without asking
- NEVER scaffold a project that cannot be rendered — hard-block in `prerequisites` when
  required tools are missing and Docker isn't available
- NEVER ask for an ElevenLabs key in GIF or silent MP4 mode — they don't use it
- NEVER push Docker when the host machine check is all green and the user didn't ask for it
- If the codebase is too small or trivial for a meaningful demo, say so honestly
- If ElevenLabs API calls fail, report the error and offer to switch to GIF or silent MP4
- Keep demos short — under 3 minutes for MP4, under 25 seconds for GIF
- The Remotion project must be self-contained and runnable after the skill finishes,
  including the Dockerfile and docker-compose.yml if Docker mode was chosen
</guardrails>

<success_criteria>
- [ ] Output format chosen (mp4-audio | gif | mp4-silent) before any other prereq work
- [ ] Machine check run with results table presented; hard-block triggered if unrecoverable
- [ ] Docker decision made when relevant (render-only | full | skip)
- [ ] ElevenLabs key checked (audio mode only)
- [ ] Existing Remotion project handled
- [ ] Codebase analyzed with structured summary presented to user
- [ ] Demo style and focus areas chosen by user
- [ ] Creative direction recommended and confirmed (scope adapted to output format)
- [ ] Script written with scene breakdown and format-appropriate metrics, approved by user
- [ ] Remotion project scaffolded with scene components matching the chosen format
- [ ] Docker templates copied to project root if Docker mode was chosen
- [ ] TTS audio generated (audio mode) or skipped cleanly (silent/GIF modes)
- [ ] Captions added if voiceover exists; skipped in silent/GIF modes
- [ ] User previewed via the right command for their Docker mode
- [ ] Final output rendered with the right command for format × Docker mode (if user chose to render)
- [ ] State file cleaned up
</success_criteria>
