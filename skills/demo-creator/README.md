# demo-creator

Create narrated demo videos of any project from its codebase using Remotion and ElevenLabs TTS.

## Usage

```
create a demo video for this project
make a demo showcasing this CLI tool
demo this codebase
generate a project demo
```

Or invoke directly: `/demo-creator`

## What it does

Reads your project's codebase, understands what it does, and produces a complete Remotion video project with narrated scenes — ready to preview and render to MP4.

The workflow:

1. **Prerequisites** — checks Node.js, ElevenLabs API key (optional), existing Remotion projects, codebase size
2. **Analyze** — reads strategically, extracts design tokens, discovers existing assets, identifies key features
3. **Creative direction** — recommends visual style, color palette, music, voice, and tone based on the project analysis
4. **Script** — writes a scene-by-scene narrated script with production metrics, reviewed by the user
5. **Generate** — scaffolds a Remotion project with scene components, TTS audio, captions, and a theme file matching the project's visual identity
6. **Review** — preview in Remotion Studio, tweak, then optionally render to MP4

## Features

- **Adaptive visual approach** — web apps get UI mockups, CLI tools get terminal scenes, APIs get architecture diagrams
- **Design token extraction** — pulls actual colors, fonts, and spacing from your codebase into a `theme.ts` file
- **Creative direction** — recommends style, music, voice, and tone tailored to your project's domain and audience
- **ElevenLabs TTS** — generates voiceover narration (or gracefully skips with text-overlay fallback)
- **Production metrics** — validates script duration, word count, and TTS character budget before generating
- **Large codebase handling** — strategic sampling with a reading plan for projects with 500+ files
- **Self-contained output** — the generated Remotion project runs independently with `npx remotion studio`

## Safety

- ElevenLabs API key stays in environment variables only — never committed
- No rendering without user approval — always preview first
- No TTS generation without an approved script

## Edge cases handled

- Missing ElevenLabs API key — offers skip-narration mode with text overlays
- Large codebases (42k+ files) — strategic sampling, presents reading plan, asks user to focus
- Existing Remotion project in the repo — asks whether to reuse or scaffold fresh
- CLI tools / libraries / APIs — adapts visual approach to the project type
- Small/trivial projects — honest about whether a demo is worthwhile

## Test scenarios

| Scenario | Project | What it tests |
|----------|---------|---------------|
| Full-stack web app | Helivar (Next.js, 180 files) | UI-focused visuals, design token extraction, creative direction |
| CLI tool | stack-agent (Ink TUI, 248 files) | Terminal-style adaptation, TUI component recreation |
| Large monorepo | Plodder (42k files) | Strategic sampling, reading plan, focus area selection |
| No API key | MusicPrint (Gradio, 49 files) | Missing key detection, text-overlay fallback |

## Eval results

**91% skill wins across 32 criteria comparisons (iteration 3)**

| Eval | Skill Wins | Baseline Wins | Ties |
|------|-----------|--------------|------|
| Full-stack web app | 7/8 | 0 | 1 |
| CLI tool | 7/8 | 0 | 1 |
| Large monorepo | 8/8 | 0 | 0 |
| No API key | 7/8 | 0 | 1 |

### Where the skill adds value

- **Consistent Remotion project structure** — every run produces the same layout (src/scenes/, src/components/, public/audio/, theme.ts)
- **Design token extraction** — actual hex values from CSS/source, not guessed colors
- **Missing API key handling** — structured detection with graceful fallback
- **Creative direction** — systematic recommendations tied to codebase signals, not editorial opinion
- **Production metrics** — word count, TTS character budget, duration validation before any code generation
- **Connected output** — `npx remotion studio` works out of the box

### Where the baseline holds up

- **Large codebase handling on small/medium projects** — models already read strategically when the codebase isn't overwhelming
