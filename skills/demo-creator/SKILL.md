---
name: demo-creator
description: >
  Create a narrated demo video of a project from its codebase using Remotion and ElevenLabs TTS.
  Use when the user says "create a demo", "make a demo video", "generate a project demo",
  "showcase this project", "make a video walkthrough", "demo this codebase", "record a demo",
  or describes wanting a video that explains or showcases their project.
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
        "narration": "<voiceover text>",
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
    "music": "<genre recommendation or 'none'>",
    "tone": "<casual-technical | pitch-confident | academic-clear | friendly | custom>"
  },
  "voice": {
    "voiceId": "<elevenlabs voice id>",
    "voiceName": "<human-readable name>",
    "model": "eleven_multilingual_v2",
    "stability": 0.5,
    "similarityBoost": 0.75
  },
  "decisions": {}
}
```

<process>

<step name="prerequisites">
**Check that all dependencies are available before starting.**

### Node.js

Check `node --version`. If missing, stop and tell the user to install Node.js 18+.

### ElevenLabs API key

Check if `$ELEVENLABS_API_KEY` is set. If missing:

Ask via AskUserQuestion:
- header: "ElevenLabs"
- question: "No ElevenLabs API key found. TTS narration requires one. How to proceed?"
- options:
  - "I'll set it now" — pause while user runs `export ELEVENLABS_API_KEY=...`
  - "Skip narration" — generate video without voiceover (silent with text overlays only)
  - "Let me explain" — alternative setup

If they skip narration, record `voice: null` in the state file and skip TTS in later steps.

### Existing Remotion project

Check if the current directory or a subdirectory already contains a Remotion project
(`remotion.config.ts` or `@remotion/cli` in package.json).

Ask via AskUserQuestion:
- header: "Remotion"
- question: "Found an existing Remotion project at `<path>`. Use it or create a new one?"
- options:
  - "Use existing" — add demo compositions to the existing project
  - "Create new" — scaffold a fresh project alongside it

If no Remotion project exists, the generate step will scaffold one.

### Codebase size

Run a quick assessment: count files, estimate total lines, identify languages. If the codebase
is large (>500 files or >50k lines), present a summary and let the user choose focus areas
early rather than trying to read everything.

Write `.demo-state.json` with initial values.

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
**Write the narrated demo script — the blueprint for the video.**

### Draft the script

Based on the demo style and focus areas, write a scene-by-scene script. Each scene needs:

| Field | Description |
|-------|-------------|
| `title` | Short scene name (e.g., "Introduction", "API Endpoints", "Live Demo") |
| `narration` | The voiceover text — what the narrator says |
| `visual` | What appears on screen — code snippets, architecture diagrams, UI mockups, text overlays |
| `durationEstimate` | Seconds (narration word count / 150 wpm) |
| `words` | Word count of this scene's narration |
| `chars` | Character count (for TTS budget tracking) |
| `transition` | Transition into this scene (fade, slide-left, etc.) — match the creative direction style |

**Script guidelines by demo style:**

- **Walkthrough:** Project intro → feature tour → how to get started.
- **Explainer:** Problem → solution → supporting features → call to action.
- **Technical:** Architecture → key flows → code patterns → what makes it interesting.

Keep total duration between 60-180 seconds. Shorter is better.

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

After presenting the script, show a metrics summary:

```
Script metrics:
  Total duration:  ~105 seconds (within 60-180s target)
  Total words:     280 (at 150 wpm = 112s narration)
  TTS characters:  1,520 (within 10,000 free tier)
  Scenes:          6
  Avg scene:       ~17 seconds
  Transitions:     5 x 15 frames = 2.5s overlap
```

Flag issues: total over 180s, any scene under 8s or over 30s, TTS characters near the
10,000 free tier limit.

Iterate until the user approves. Set `script.approved: true` in the state file.

Next: `generate`
</step>

<!-- ═══════════════════════════════════════════ -->

<step name="generate">
**Build the Remotion project and generate TTS audio.**

Read `references/remotion-patterns.md` for Remotion API patterns and project structure.
Read `references/elevenlabs-tts.md` for TTS generation.

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

### Generate TTS audio

If voice is configured (not skipped), generate MP3 files for each scene's narration.
See `references/elevenlabs-tts.md` for the generation script pattern.

- One MP3 per scene, saved to `public/audio/scene-<N>.mp3`
- After generation, measure each audio file's duration to calculate exact frame counts

If voice was skipped, estimate durations from narration word count (~150 words/minute).

### Build scene components

For each scene in the script, create a React component in `src/scenes/`:

- Use the visual description to build the scene content
- Code snippets: syntax-highlighted text with reveal animations
- Text overlays: animated title and description text
- Architecture: box-and-arrow layouts with animated connections
- Apply entrance animations (fade, slide, spring) per `references/remotion-patterns.md`

### Wire up the composition

Create the main composition in `src/Root.tsx`:
- Use `<TransitionSeries>` to sequence scenes with transitions between them
- Add `<Audio>` components for each scene's voiceover (if generated)
- Calculate total duration from audio durations + transition overlaps
- Use `calculateMetadata` if durations are data-driven

### Add captions (if voiceover exists)

Generate a captions JSON from the script narration text and audio timing.
Display subtitles synced to the voiceover using Remotion's caption patterns.

Update `.demo-state.json` with `remotionDir` and phase.

Next: `review`
</step>

<!-- ═══════════════════════════════════════════ -->

<step name="review">
**Let the user preview the video and optionally render.**

### Preview

Start the Remotion dev server:

```bash
cd <remotion-dir> && npx remotion studio
```

Tell the user the URL (typically http://localhost:3000) and ask them to preview.

Ask: "How does it look? Anything you'd like to change?"

If the user wants changes, make them and re-preview. Common adjustments:
- Timing (scenes too fast/slow)
- Text content or narration wording
- Animation style
- Color scheme or layout
- Scene order

### Render

When the user is satisfied:

Ask via AskUserQuestion:
- header: "Render"
- question: "Ready to render the final MP4?"
- options:
  - "Render now" — render to MP4
  - "Not yet" — keep tweaking, I'll render later

If rendering:

```bash
cd <remotion-dir> && npx remotion render <composition-id> out/demo.mp4
```

Report the output path and file size when done.

### Clean up state

Delete `.demo-state.json` — the Remotion project is the durable artifact now.
</step>

</process>

<guardrails>
- NEVER read the entire codebase of large projects — use strategic sampling and Grep
- NEVER commit API keys or secrets — the ElevenLabs key stays in the environment only
- NEVER render without user approval — always preview first
- NEVER generate TTS without an approved script — the user must review narration text
- NEVER overwrite an existing Remotion project without asking
- If the codebase is too small or trivial for a meaningful demo, say so honestly
- If ElevenLabs API calls fail, report the error and offer to continue without voiceover
- Keep demo videos under 3 minutes — shorter is almost always better
- The Remotion project must be self-contained and runnable after the skill finishes
</guardrails>

<success_criteria>
- [ ] Prerequisites checked (Node.js, ElevenLabs key, existing projects)
- [ ] Codebase analyzed with structured summary presented to user
- [ ] Demo style and focus areas chosen by user
- [ ] Creative direction recommended and confirmed (style, music, voice, tone)
- [ ] Script written with scene breakdown, reviewed and approved by user
- [ ] Remotion project scaffolded with scene components
- [ ] TTS audio generated (or intentionally skipped) for each scene
- [ ] Captions added if voiceover exists
- [ ] User previewed the video in Remotion Studio
- [ ] MP4 rendered (if user chose to render)
- [ ] State file cleaned up
</success_criteria>
