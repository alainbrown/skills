import { Composition, Still, staticFile } from "remotion";
import { Demo } from "./Demo";
import { sceneTimings, totalFrames, type NarrationManifest } from "./narration";
import { Screenshots } from "./store/Screenshots";
import { Marquee } from "./store/Marquee";
import { PromoTile } from "./store/PromoTile";
import { Thumbnail } from "./store/Thumbnail";

// FORGE: the brand color threads through every asset. Change it once here
// (or override per-composition via defaultProps) and the demo + store
// assets all re-skin. Mirror it into ../docs assets and the landing page
// so everything stays on-brand.
const BRAND = "#5258d8";

export const RemotionRoot = () => (
  <>
    {/* Demo · 1280x800 @ 30fps. Renders to MP4 (YouTube / landing page) and
        a scaled-down GIF (README hero). 1280x800 is the Chrome Web Store's
        preferred screenshot aspect, so the same canvas frames the popup nicely.

        Length is computed in calculateMetadata: 600 frames (20s) when silent,
        or sized to the voice-over when public/narration/manifest.json exists
        (written by `npm run render:voice`). See narration.ts. */}
    <Composition
      id="Demo"
      component={Demo}
      fps={30}
      width={1280}
      height={800}
      defaultProps={{ brand: BRAND, narration: null as NarrationManifest | null }}
      calculateMetadata={async ({ props }) => {
        let narration = props.narration ?? null;
        if (!narration) {
          // Missing manifest => silent render. Never throw on a failed fetch.
          try {
            const res = await fetch(staticFile("narration/manifest.json"));
            if (res.ok) narration = (await res.json()) as NarrationManifest;
          } catch {
            narration = null;
          }
        }
        return {
          durationInFrames: totalFrames(sceneTimings(narration)),
          props: { ...props, narration },
        };
      }}
    />

    {/* Chrome Web Store · 5 screenshots @ 1280x800. One Still component
        keyed by `index` so all five share layout but vary their content. */}
    <Still
      id="Screenshot1"
      component={Screenshots}
      width={1280}
      height={800}
      defaultProps={{ index: 1, brand: BRAND }}
    />
    <Still
      id="Screenshot2"
      component={Screenshots}
      width={1280}
      height={800}
      defaultProps={{ index: 2, brand: BRAND }}
    />
    <Still
      id="Screenshot3"
      component={Screenshots}
      width={1280}
      height={800}
      defaultProps={{ index: 3, brand: BRAND }}
    />
    <Still
      id="Screenshot4"
      component={Screenshots}
      width={1280}
      height={800}
      defaultProps={{ index: 4, brand: BRAND }}
    />
    <Still
      id="Screenshot5"
      component={Screenshots}
      width={1280}
      height={800}
      defaultProps={{ index: 5, brand: BRAND }}
    />

    {/* Chrome Web Store · marquee promo tile · 1400x560 */}
    <Still
      id="Marquee"
      component={Marquee}
      width={1400}
      height={560}
      defaultProps={{ brand: BRAND }}
    />

    {/* Chrome Web Store · small promo tile · 440x280 */}
    <Still
      id="PromoTile"
      component={PromoTile}
      width={440}
      height={280}
      defaultProps={{ brand: BRAND }}
    />

    {/* YouTube thumbnail · 1280x720 */}
    <Still
      id="Thumbnail"
      component={Thumbnail}
      width={1280}
      height={720}
      defaultProps={{ brand: BRAND }}
    />
  </>
);
