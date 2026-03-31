# Remotion Patterns for Demo Videos

Patterns and API references for building demo videos with Remotion. This covers only what's
needed for demo creation — not the full Remotion API.

## Project Scaffolding

Create a new blank project:

```bash
npx create-video@latest my-demo --template blank
```

Install required packages:

```bash
cd my-demo
npx remotion add @remotion/transitions
npx remotion add @remotion/google-fonts
npx remotion add @remotion/media
```

### Project structure

```
my-demo/
├── public/              # Static assets (audio, images, fonts)
│   └── audio/           # TTS audio files go here
├── src/
│   ├── Root.tsx          # Composition definitions
│   ├── scenes/           # One component per scene
│   │   ├── Scene1.tsx
│   │   ├── Scene2.tsx
│   │   └── ...
│   └── components/       # Shared components (captions, code blocks, etc.)
├── remotion.config.ts
└── package.json
```

## Compositions

Define the video in `src/Root.tsx`:

```tsx
import { Composition } from "remotion";

export const RemotionRoot = () => {
  return (
    <Composition
      id="Demo"
      component={DemoVideo}
      durationInFrames={900}  // 30 seconds at 30fps
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
```

### Dynamic duration with calculateMetadata

When duration depends on audio file lengths:

```tsx
const calculateMetadata: CalculateMetadataFunction<DemoProps> = async ({ props }) => {
  const durations = await Promise.all(
    props.scenes.map((s) => getAudioDurationInSeconds(staticFile(s.audioPath)))
  );
  const totalFrames = durations.reduce((sum, d) => sum + Math.ceil(d * 30), 0);
  return {
    durationInFrames: totalFrames,
    props: { ...props, sceneDurations: durations },
  };
};
```

## Animations

**Critical rule:** Never use CSS transitions or animations. All animation must use
`useCurrentFrame()` and `interpolate` or `spring`.

### Fade in

```tsx
const frame = useCurrentFrame();
const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
return <div style={{ opacity }}>Content</div>;
```

### Spring entrance

```tsx
const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const scale = spring({ frame, fps, config: { damping: 200 } });
return <div style={{ transform: `scale(${scale})` }}>Content</div>;
```

### Slide in from left

```tsx
const frame = useCurrentFrame();
const translateX = interpolate(frame, [0, 20], [-100, 0], {
  extrapolateRight: "clamp",
  easing: Easing.out(Easing.cubic),
});
return <div style={{ transform: `translateX(${translateX}%)` }}>Content</div>;
```

### Staggered entrance (multiple elements)

```tsx
const items = ["Feature A", "Feature B", "Feature C"];
return items.map((item, i) => {
  const delay = i * 10; // 10 frames between each
  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <div key={i} style={{ opacity }}>{item}</div>;
});
```

## Spring presets

| Preset | Config | Use for |
|--------|--------|---------|
| Smooth | `{ damping: 200 }` | Subtle reveals, text |
| Snappy | `{ damping: 20, stiffness: 200 }` | UI elements, buttons |
| Bouncy | `{ damping: 8 }` | Playful entrances |
| Heavy | `{ damping: 15, stiffness: 80, mass: 2 }` | Slow dramatic entrance |

## Easing

Use `Easing.out` for entrances, `Easing.in` for exits:

```tsx
import { Easing } from "remotion";

// Entrance
interpolate(frame, [0, 30], [0, 1], { easing: Easing.out(Easing.cubic) });

// Exit
interpolate(frame, [0, 30], [1, 0], { easing: Easing.in(Easing.cubic) });
```

## Sequencing and Transitions

### TransitionSeries (recommended for demos)

Sequences scenes with transition effects between them:

```tsx
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

export const DemoVideo = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={150}>
        <Scene1 />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />

      <TransitionSeries.Sequence durationInFrames={200}>
        <Scene2 />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-left" })}
        timing={linearTiming({ durationInFrames: 15 })}
      />

      <TransitionSeries.Sequence durationInFrames={180}>
        <Scene3 />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
```

### Duration math with transitions

Transitions overlap adjacent scenes, reducing total length:

```
Total = (all sequence frames) - (all transition frames)
Example: 150 + 200 + 180 - 15 - 15 = 500 frames
```

### Available transitions

```tsx
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";       // direction: "from-left" | "from-right" | "from-top" | "from-bottom"
import { wipe } from "@remotion/transitions/wipe";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
```

### Simple Series (no transitions)

```tsx
import { Series } from "remotion";

<Series>
  <Series.Sequence durationInFrames={100}><Scene1 /></Series.Sequence>
  <Series.Sequence durationInFrames={150}><Scene2 /></Series.Sequence>
</Series>
```

## Audio

```tsx
import { Audio } from "@remotion/media";
import { staticFile } from "remotion";

// Play voiceover audio
<Audio src={staticFile("audio/scene-1.mp3")} />

// With volume control
<Audio src={staticFile("audio/scene-1.mp3")} volume={0.8} />

// Delayed start (wrap in Sequence)
<Sequence from={30}>
  <Audio src={staticFile("audio/scene-1.mp3")} />
</Sequence>
```

Multiple `<Audio>` components layer on top of each other (background music + voiceover).

## Assets

All static files go in `public/`. Reference with `staticFile()`:

```tsx
import { Img, staticFile } from "remotion";

<Img src={staticFile("screenshot.png")} />
```

Remote URLs work directly without `staticFile()`.

## Fonts

### Google Fonts (recommended)

```tsx
import { loadFont } from "@remotion/google-fonts/Inter";
const { fontFamily } = loadFont();

// Use in styles
<div style={{ fontFamily }}>Text</div>
```

### Local fonts

```tsx
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

await loadFont({ family: "MyFont", url: staticFile("MyFont.woff2") });
```

## Text animations

### Typewriter effect

Use string slicing, NOT per-character opacity:

```tsx
const frame = useCurrentFrame();
const text = "Hello, this is a demo";
const charsShown = Math.floor(interpolate(frame, [0, 60], [0, text.length], {
  extrapolateRight: "clamp",
}));
return <div>{text.slice(0, charsShown)}</div>;
```

## Captions / Subtitles

Caption data format:

```ts
type Caption = {
  text: string;
  startMs: number;
  endMs: number;
  timestampMs: number | null;
  confidence: number | null;
};
```

Generate caption JSON from the script narration and audio timing. Display by filtering
captions visible at the current frame time.

## Rendering

Preview:
```bash
npx remotion studio
```

Render to MP4:
```bash
npx remotion render Demo out/demo.mp4
```

Render with specific settings:
```bash
npx remotion render Demo out/demo.mp4 --codec h264 --crf 18
```
