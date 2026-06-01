// FORGE: core beat — the extension popup in action. This scene shows the
// pattern for REUSING THE LIVE component: today it renders the demo-local
// PlaceholderPopup; swap it for the real `@ext` popup (see the commented
// imports below) and feed mockData props.

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Caption } from "../components/Caption";
import { Cursor } from "../components/Cursor";
import { PopupFrame } from "../components/PopupFrame";
import { MOCK_ITEMS, MOCK_STATS } from "../mockData";

// FORGE: reuse the extension's real popup instead of the placeholder:
//   import "../chrome-shim";            // only if a transitive import needs chrome.*
//   import { Popup } from "@ext/popup/Popup";
import { PlaceholderPopup } from "../ext/PlaceholderPopup";

interface SceneProps {
  brand: string;
}

const POPUP_X = 360;
const POPUP_Y = 130;
const CLICK_AT = 70; // local frame within the scene
const BTN = { x: POPUP_X + 190, y: POPUP_Y + 430 }; // approx CTA position

const easeInOut = (t: number) => t * t * (3 - 2 * t);

export const ScenePopup = ({ brand }: SceneProps) => {
  const frame = useCurrentFrame();

  // Cursor flies in from bottom-right and lands on the CTA, then clicks.
  const enterAt = 24;
  const landAt = 64;
  const pos = (() => {
    if (frame < enterAt) return { x: 1400, y: 900 };
    if (frame >= landAt) return BTN;
    const t = easeInOut(
      interpolate(frame, [enterAt, landAt], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );
    return { x: 1400 + (BTN.x - 1400) * t, y: 900 + (BTN.y - 900) * t };
  })();

  const active = frame >= CLICK_AT;

  return (
    <Backdrop brand={brand}>
      {/* Popup on the left */}
      <div style={{ position: "absolute", left: POPUP_X, top: POPUP_Y }}>
        <PopupFrame>
          {/* FORGE: replace <PlaceholderPopup .../> with:
              <Popup pendingCount={MOCK_STATS.primaryCount} items={MOCK_ITEMS} ... /> */}
          <PlaceholderPopup
            brand={brand}
            items={MOCK_ITEMS}
            primaryCount={MOCK_STATS.primaryCount}
            primaryLabel={MOCK_STATS.primaryLabel}
            secondaryLabel={MOCK_STATS.secondaryLabel}
            lastRunAgo={MOCK_STATS.lastRunAgo}
            active={active}
          />
        </PopupFrame>
      </div>

      {/* Caption on the right */}
      <div style={{ position: "absolute", left: 820, top: 300, width: 420 }}>
        <Caption
          frame={frame}
          enterAt={10}
          exitAt={CLICK_AT}
          eyebrow="01"
          title="See it at a glance."
          subtitle="The popup surfaces exactly what matters, right where you need it."
          align="left"
          brand={brand}
        />
        <Caption
          frame={frame}
          enterAt={CLICK_AT + 4}
          exitAt={9999}
          eyebrow="02"
          title="One click does the work."
          subtitle="No setup, no menus to dig through."
          align="left"
          brand={brand}
          style={{ position: "absolute", top: 0 }}
        />
      </div>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <Cursor x={pos.x} y={pos.y} clickAt={CLICK_AT} frame={frame} brand={brand} />
      </AbsoluteFill>
    </Backdrop>
  );
};
