// FORGE: replace scenes with the extension's demo beats. The Demo is a
// TransitionSeries of independent scenes, each ~a "beat" of the story.
// Add/remove/reorder <Sequence> blocks freely — just keep the total
// (sum of scene durations minus transition overlaps) at 600 frames so it
// matches the composition registered in Root.tsx (20s @ 30fps).
//
// Frame budget:  sum(durations) - (numTransitions * TRANSITION) = 600
//   150 + 210 + 195 + 90 = 645 ;  645 - 3*15 = 600  ✓

import { AbsoluteFill } from "remotion";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { DEFAULT_BRAND, shade } from "./theme";
import { SceneIntro } from "./scenes/SceneIntro";
import { ScenePopup } from "./scenes/ScenePopup";
import { SceneInPage } from "./scenes/SceneInPage";
import { SceneOutro } from "./scenes/SceneOutro";

interface DemoProps {
  brand?: string;
}

const TRANSITION = 15;
const fadeT = () => ({
  presentation: fade(),
  timing: linearTiming({ durationInFrames: TRANSITION }),
});

export const Demo = ({ brand = DEFAULT_BRAND }: DemoProps) => (
  <AbsoluteFill style={{ background: shade(brand, -120) }}>
    <TransitionSeries>
      {/* FORGE: beat 1 — hook / brand */}
      <TransitionSeries.Sequence durationInFrames={150}>
        <SceneIntro brand={brand} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...fadeT()} />

      {/* FORGE: beat 2 — the popup / core interaction */}
      <TransitionSeries.Sequence durationInFrames={210}>
        <ScenePopup brand={brand} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...fadeT()} />

      {/* FORGE: beat 3 — in-context on a real page */}
      <TransitionSeries.Sequence durationInFrames={195}>
        <SceneInPage brand={brand} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition {...fadeT()} />

      {/* FORGE: beat 4 — call to action */}
      <TransitionSeries.Sequence durationInFrames={90}>
        <SceneOutro brand={brand} />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
