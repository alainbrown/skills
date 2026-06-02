// FORGE: the demo beats. A TransitionSeries of scenes, one per beat. Scene
// order/names + durations live in narration.ts; edit SCENE_ORDER and the
// COMPONENTS map below together. Silent budget: 150+210+195+90 - 3*15 = 600
// frames (20s @ 30fps). With a narration manifest, scenes resize to the voice
// and total length is set in Root.tsx (calculateMetadata).

import type { ReactNode } from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { DEFAULT_BRAND, shade } from "./theme";
import { sceneTimings, type NarrationManifest, type SceneName } from "./narration";
import { SceneIntro } from "./scenes/SceneIntro";
import { ScenePopup } from "./scenes/ScenePopup";
import { SceneInPage } from "./scenes/SceneInPage";
import { SceneOutro } from "./scenes/SceneOutro";

interface DemoProps {
  brand?: string;
  /** Injected by calculateMetadata when a voice-over manifest is present. */
  narration?: NarrationManifest | null;
}

// FORGE: keep these keys identical to SCENE_ORDER in narration.ts.
const COMPONENTS: Record<SceneName, (p: { brand: string }) => ReactNode> = {
  SceneIntro,
  ScenePopup,
  SceneInPage,
  SceneOutro,
};

const TRANSITION = 15;
const fadeT = () => ({
  presentation: fade(),
  timing: linearTiming({ durationInFrames: TRANSITION }),
});

export const Demo = ({ brand = DEFAULT_BRAND, narration = null }: DemoProps) => {
  const timings = sceneTimings(narration);

  // TransitionSeries reads its children directly — keep them flat, no Fragment.
  const children: ReactNode[] = [];
  timings.forEach((t, i) => {
    if (i > 0) children.push(<TransitionSeries.Transition key={`t-${i}`} {...fadeT()} />);
    const Scene = COMPONENTS[t.name];
    children.push(
      <TransitionSeries.Sequence key={t.name} durationInFrames={t.durationInFrames}>
        {t.audio ? <Audio src={staticFile(t.audio)} /> : null}
        <Scene brand={brand} />
      </TransitionSeries.Sequence>,
    );
  });

  return (
    <AbsoluteFill style={{ background: shade(brand, -120) }}>
      <TransitionSeries>{children}</TransitionSeries>
    </AbsoluteFill>
  );
};
