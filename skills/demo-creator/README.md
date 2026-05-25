# demo-creator

Create demos of any project from its codebase using Remotion — narrated MP4, silent MP4, or animated GIF, with optional Docker render so you don't need Chromium deps on your host.

## Usage

```
create a demo video for this project
make a demo GIF for the README
demo this codebase in Docker, I don't want to install Chromium deps
generate a project demo with voiceover
```

Or invoke directly: `/demo-creator`

## What it does

Reads your project's codebase, understands what it does, picks an output format up front, and produces a Remotion video project (with Dockerfile + docker-compose.yml if you opted in) — ready to preview and render.

The workflow:

1. **Prerequisites** — picks output format (MP4+audio | GIF | silent MP4), runs a machine check (node, ffmpeg, docker, compose, Chromium libs), offers Docker render container if helpful, checks ElevenLabs key only in audio mode, finds existing Remotion projects, sizes the codebase
2. **Analyze** — reads strategically, extracts design tokens, discovers existing assets, identifies key features
3. **Creative direction** — recommends visual style, palette, music, voice, and tone — scoped to the chosen output format (GIF skips music/voice/tone entirely)
4. **Script** — writes a scene-by-scene script (audio scripts have narration; silent/GIF scripts have onScreenText + keyVisual), validates production metrics tuned to the format
5. **Generate** — scaffolds a Remotion project with scene components, theme.ts from real design tokens, copies Docker templates if chosen, generates TTS (audio mode only), wires captions (audio mode only)
6. **Review** — preview via the right command for your Docker mode, render with the right command for format × Docker mode

## Features

- **Three output formats** — MP4 with audio (ElevenLabs narration, captions, music), animated GIF (silent, README-embed friendly), silent MP4 (no voice, optional music). Picked early so the rest of the flow adapts; GIF skips the entire audio branch
- **Machine check** — probes node, ffmpeg, docker, docker compose, Chromium runtime libs; reports present/missing/not-needed with what each unlocks
- **Docker render path** — when Chromium libs are missing on Linux or you prefer isolation, copies a Dockerfile + docker-compose.yml into the project. Render-only mode (host preview + container render) or full dev+render mode (everything in Docker, no host node required)
- **GIF pipeline** — silent script format with `onScreenText` and `keyVisual`, GIF-tuned production metrics (8-25s, frame budget, size estimate), native Remotion `--codec=gif --every-nth-frame` render. No separate ffmpeg conversion required
- **Hard-block on unrecoverable setups** — refuses to scaffold a project the user can't render; surfaces exact install commands or Docker fallback
- **Adaptive visual approach** — web apps get UI mockups, CLI tools get terminal scenes, APIs get architecture diagrams
- **Design token extraction** — pulls actual colors, fonts, and spacing from your codebase into a `theme.ts` file
- **Creative direction package** — recommends style, music, voice, and tone tailored to your project's domain and audience, with cross-reference coherence check
- **ElevenLabs TTS** — generates voiceover narration in audio mode (or offers structured fallback — set key, switch to GIF, switch to silent MP4 — if key is missing)
- **Production metrics** — validates script duration, word count, TTS character budget, frame budget (GIF), and scene length per output format
- **Large codebase handling** — strategic sampling with a reading plan for projects with 500+ files
- **Self-contained output** — the generated project runs out of the box (`npx remotion studio` or `docker compose up studio`)

## Safety

- ElevenLabs API key stays in environment variables only — never committed
- No rendering without user approval — always preview first
- No TTS generation without an approved script
- Hard-block when required render tools are missing and Docker isn't available — refuses to scaffold projects that can't run

## Edge cases handled

- Missing ElevenLabs API key in audio mode — offers structured escape (set key / switch to GIF / switch to silent MP4)
- Missing Chromium libs on Linux — surfaces in machine check, offers Docker render container
- Missing ffmpeg system binary — informational only (Remotion v4+ bundles its own); only matters for post-render optimization
- Large codebases (42k+ files) — strategic sampling, presents reading plan, asks user to focus
- Existing Remotion project in the repo — asks whether to reuse or scaffold fresh
- CLI tools / libraries / APIs — adapts visual approach to the project type
- Small/trivial projects — honest about whether a demo is worthwhile
- User wants zero host installs — full dev+render Docker mode with both services in compose

## Test scenarios

| Scenario | Project | What it tests |
|----------|---------|---------------|
| GIF for README | stack-agent (Ink TUI, 248 files) | GIF pipeline, silent script, machine check, Docker render-only |
| Docker render isolation | Helivar (Next.js, 335 files) | Machine check finds gap, key-missing → silent MP4 switch, Docker render-only |
| Audio MP4 (regression) | Helivar (Next.js, 335 files) | iter-3 quality preserved: design tokens, creative direction, production metrics, captions |
| Missing ElevenLabs key | MusicPrint (ML pipeline, 7647 files) | Structured key-missing detection, new "switch to GIF" escape, GIF pipeline kicks in |
| Full Docker dev+render | Helivar (Next.js, 335 files) | Full-container mode, both studio and render services, no host node defaults |

## Eval results

**Iteration 4 — 92% skill wins across 49 criterion comparisons (45 wins, 4 ties, 0 losses)**

| Eval | Skill Wins | Ties | Baseline Wins | N/A |
|------|-----------|------|--------------|-----|
| GIF for README | 10 | 0 | 0 | 1 |
| Docker render isolation | 10 | 0 | 0 | 1 |
| Audio MP4 (regression) | 8 | 1 | 0 | 2 |
| Missing ElevenLabs key | 10 | 1 | 0 | 0 |
| Full Docker dev+render | 7 | 2 | 0 | 2 |

Prior iter-3: 91% wins across 32 comparisons. Iter-4 expanded the rubric by 4 criteria (output-format-choice, machine-check, docker-render-option, gif-pipeline) and matched the prior win rate on a tougher bar with zero regressions.

### Where the skill adds value

- **Output format choice** — explicit early branching surfaces a decision baselines don't ask about; gates the rest of the flow correctly (5/5 wins)
- **Machine check** — structured probe with present/missing table and "what this unlocks" semantics; baseline jumps to assumptions (5/5 wins)
- **Creative direction package** — coherent style + palette + music + voice + tone tied to codebase signals, with a cross-reference coherence check (5/5 wins)
- **Production metrics per format** — explicit validation (60-180s for audio, 8-25s for GIF, frame budget, TTS char budget); baseline guesses (5/5 wins)
- **Consistent Remotion project structure** — every run produces the same layout (5/5 wins)
- **Adaptive visual approach** — recreates project-specific UI (e.g., stack-agent's actual TUI header/footer) vs generic templates (5/5 wins)
- **GIF pipeline** — silent script format, GIF-specific metrics, native `--codec=gif` render command (2/2 wins where applicable)
- **Structured missing-key handling** — detects key absence, offers new "switch to GIF" escape that flows through full GIF pipeline (2/2 wins where applicable)

### Where the baseline holds up

- **Docker render artifacts** — when the user explicitly asks for Docker, capable baselines produce working Dockerfile + compose with correct Chromium deps (1 tie in eval 5 where both nailed the full-dev container path)
- **Design token extraction** — when the project has clear CSS/Tailwind files, baseline extracts real hex values too (1 tie in eval 2)
- **Connected runnable output** — both variants produce runnable artifacts when the structure is clear (2 ties)

### Methodology caveat

Eval prompts encoded user decisions as "When asked X, choose Y" guidance so subagent runs were deterministic. This boosted baselines on criteria like output-format-choice and missing-api-key-handling — in real conversations without that guidance, baseline performance on those would likely be lower. 92% is a conservative estimate of skill value.
