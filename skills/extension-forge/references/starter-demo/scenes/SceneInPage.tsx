// FORGE: beat showing the extension working IN-CONTEXT on a real page,
// with the popup hanging off the toolbar icon. Demonstrates the
// BrowserFrame wrapper. Replace the mock page content with whatever page
// your extension acts on, and the popup with the real `@ext` component.

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrowserFrame } from "../components/BrowserFrame";
import { Caption } from "../components/Caption";
import { PopupFrame } from "../components/PopupFrame";
import { FONT, INK } from "../theme";
import { MOCK_ITEMS, MOCK_STATS } from "../mockData";
import { PlaceholderPopup } from "../ext/PlaceholderPopup";

interface SceneProps {
  brand: string;
}

export const SceneInPage = ({ brand }: SceneProps) => {
  const frame = useCurrentFrame();
  // Popup pops in slightly after the page settles.
  const popIn = interpolate(frame, [18, 30], [0.6, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const popOpacity = interpolate(frame, [18, 26], [0, 1], { extrapolateRight: "clamp" });

  return (
    <Backdrop brand={brand}>
      <AbsoluteFill style={{ padding: "70px 90px 150px" }}>
        <BrowserFrame
          brand={brand}
          url="https://example.com/article" // FORGE
          popup={
            <div style={{ opacity: popOpacity, transform: `scale(${popIn})`, transformOrigin: "top right" }}>
              <PopupFrame>
                <PlaceholderPopup
                  brand={brand}
                  items={MOCK_ITEMS.slice(0, 3)}
                  primaryCount={MOCK_STATS.primaryCount}
                  primaryLabel={MOCK_STATS.primaryLabel}
                  secondaryLabel={MOCK_STATS.secondaryLabel}
                  lastRunAgo={MOCK_STATS.lastRunAgo}
                />
              </PopupFrame>
            </div>
          }
        >
          {/* FORGE: a representative page the extension runs on. */}
          <div
            style={{
              maxWidth: 720,
              margin: "56px auto",
              padding: "0 32px",
              fontFamily: FONT.sans,
              color: INK[1],
            }}
          >
            <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: INK[3], fontWeight: 600 }}>
              Example · Long read
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 800, color: INK[0], letterSpacing: "-0.025em", margin: "14px 0 20px" }}>
              A page your extension makes better
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.7, color: INK[1] }}>
              Right here on any page, the extension adds the one thing this page
              was missing. The popup above shows it working in context — no tab
              switching, no copy-paste, no friction.
            </p>
          </div>
        </BrowserFrame>
      </AbsoluteFill>

      <div style={{ position: "absolute", left: "50%", bottom: 50, transform: "translateX(-50%)" }}>
        <Caption
          frame={frame}
          enterAt={8}
          exitAt={9999}
          eyebrow="03"
          title="Works right where you are."
          subtitle="On any page, one click away in the toolbar."
          align="center"
          brand={brand}
          pill
        />
      </div>
    </Backdrop>
  );
};
