# GIF Output Reference

GIF mode is for README embeds, PR previews, and social sharing. It is fundamentally
different from MP4 mode — no audio, lower frame rate, every visual must carry meaning
on its own.

## When the user picks GIF

The skill skips these steps from MP4+audio mode:
- ElevenLabs API key check (no narration)
- TTS generation (no audio)
- Captions / subtitle component (no voiceover to caption)
- Music recommendations in creative direction (GIFs are silent)
- Voice recommendation in creative direction (no voice)
- Audio character budget validation (no characters spent)

The skill **keeps** these:
- Codebase analysis
- Design token extraction
- Visual style and color palette recommendation
- Scene structure (without narration field)

## Script differences

A silent script has different requirements:

| MP4+audio | GIF (silent) |
|-----------|--------------|
| Narration carries the explanation | On-screen text carries the explanation |
| Visual supports what's said | Visual IS the message |
| Scenes can be 15-30s — voice fills time | Scenes 2-5s — keep momentum, no dead time |
| Animation can be subtle | Animation must read at low frame rate (10-15fps) |
| Total: 60-180s | Total: 8-25s (README-embed sweet spot) |

Replace the `narration` field in each scene with:
- `onScreenText`: 1-2 short phrases (≤8 words each) that appear timed with the action
- `keyVisual`: the single most important thing the viewer must see this scene

Example silent scene:

```json
{
  "id": 2,
  "title": "Live search",
  "onScreenText": ["Type to filter — instantly"],
  "keyVisual": "Search input with results updating per keystroke",
  "durationFrames": 60,
  "fps": 30
}
```

## Production metrics for GIF

Validate before generation:

```
GIF metrics:
  Total duration:  ~18 seconds (within 8-25s target)
  Frame budget:    540 frames at 30fps source → 180 frames at every-nth=3 (~6fps GIF)
  Scenes:          5
  Avg scene:       ~3.6 seconds
  Estimated size:  ~3-6 MB (rough; depends on color palette and motion)
```

Flag issues:
- Total over 25s — GIFs balloon non-linearly with duration
- Any scene over 6s — viewer attention drops
- Source resolution above 1080×608 — README embeds rarely benefit; smaller renders faster

## Rendering command

Remotion has native GIF rendering since 3.1 — no separate ffmpeg conversion required:

```bash
# Host
npx remotion render <CompositionId> out/demo.gif --codec=gif --every-nth-frame=3

# Docker
docker compose run --rm render \
  npx remotion render <CompositionId> out/demo.gif --codec=gif --every-nth-frame=3
```

Key flags:

| Flag | Purpose | Typical value |
|------|---------|---------------|
| `--codec=gif` | Required for GIF output | always |
| `--every-nth-frame=N` | Reduces frame rate; emit every Nth frame | 2-4 (gives 7-15 fps from 30fps source) |
| `--number-of-gif-loops` | Loop count, 0 = infinite | 0 |
| `--width` / `--height` | Scale down for embed-friendly size | 800×450 or 720×405 |

## Size optimization

If the output GIF is too large for README/PR embed (GitHub's per-file limit is generous
but practical embed limit is ~10MB), reduce in this order:

1. **Shorter duration** — biggest impact. Cut to the core 8-15s.
2. **Higher `--every-nth-frame`** — drop to 4 or 5 (slideshow-y but acceptable for code demos).
3. **Scale down** — `--width=720` cuts ~40% size.
4. **Optimize palette with ffmpeg** (post-process, optional):
   ```bash
   ffmpeg -i out/demo.gif -vf "palettegen=max_colors=128" -y palette.png
   ffmpeg -i out/demo.gif -i palette.png -lavfi "paletteuse=dither=bayer" -y out/demo-optimized.gif
   ```
   This is where system ffmpeg becomes useful — Remotion's bundled ffmpeg is invoked
   internally but not exposed for ad-hoc commands.

## Composition setup for GIF

In `src/Root.tsx`, the composition should target a lower base fps to avoid wasted work:

```tsx
<Composition
  id="Demo"
  component={DemoVideo}
  durationInFrames={540}  // 18s at 30fps source
  fps={30}                // source fps; --every-nth-frame downsamples at render
  width={800}
  height={450}
/>
```

Keep the source fps at 30 for smooth animations during preview in Studio, and let
`--every-nth-frame` produce the lower-fps GIF.

## Captions in GIF mode

The skill does NOT add a `<Subtitles>` component in GIF mode. Instead, on-screen text
is a regular animated component in each scene — designed to be the primary message
carrier, not a transcript.

Example on-screen text component:

```tsx
import {AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';

export const OnScreenText: React.FC<{text: string; delay?: number}> = ({text, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = spring({frame: frame - delay, fps, config: {damping: 200}});
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const y = interpolate(progress, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', padding: 40}}>
      <div style={{opacity, transform: `translateY(${y}px)`, color: '#fff',
                   fontSize: 32, fontWeight: 600, textShadow: '0 2px 8px rgba(0,0,0,0.6)'}}>
        {text}
      </div>
    </AbsoluteFill>
  );
};
```

## What changes in `.demo-state.json` for GIF mode

```json
{
  "outputFormat": "gif",
  "voice": null,
  "script": {
    "scenes": [
      {
        "id": 1,
        "title": "...",
        "onScreenText": ["..."],
        "keyVisual": "...",
        "durationFrames": 60,
        "fps": 30
      }
    ],
    "totalFrames": 540,
    "everyNthFrame": 3,
    "approved": false
  },
  "creativeDirection": {
    "visualStyle": "...",
    "colorPalette": ["..."],
    "music": null,
    "tone": null
  }
}
```

Note `voice: null`, `music: null`, `tone: null` — these are inapplicable in GIF mode,
not skipped accidentally. Setting them explicitly to null prevents downstream code
from treating them as "to be filled later."
