// Chrome Web Store screenshots · 1280x800. One component keyed by `index`
// (1..5) so all five share a layout system but vary copy + which side the
// UI sits on. Registered five times in Root.tsx.
//
// FORGE: rewrite SHOTS with your extension's five strongest moments, and
// replace <PlaceholderPopup> with the real `@ext` component fed mock props.

import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrandLockup } from "../components/BrandLockup";
import { PopupFrame } from "../components/PopupFrame";
import { DEFAULT_BRAND, FONT } from "../theme";
import { MOCK_ITEMS, MOCK_STATS } from "../mockData";
import { PlaceholderPopup } from "../ext/PlaceholderPopup";

interface ScreenshotsProps {
  index?: number;
  brand?: string;
}

// FORGE: five store shots. `layout` flips which side the product shot sits.
const SHOTS = [
  {
    title: "Everything important, at a glance.",
    subtitle: "The popup shows what matters the moment you open it.",
    layout: "ui-right" as const,
  },
  {
    title: "One click does the work.",
    subtitle: "No setup. No menus. Just the result you wanted.",
    layout: "ui-left" as const,
  },
  {
    title: "Works on any page.",
    subtitle: "Right where you are, one click away in the toolbar.",
    layout: "ui-right" as const,
  },
  {
    title: "Tune it to your taste.",
    subtitle: "Sensible defaults, with controls when you want them.",
    layout: "ui-left" as const,
  },
  {
    title: "Private by design.",
    subtitle: "Your data stays on your device. Nothing leaves the browser.",
    layout: "ui-right" as const,
  },
];

export const Screenshots = ({ index = 1, brand = DEFAULT_BRAND }: ScreenshotsProps) => {
  const shot = SHOTS[(index - 1) % SHOTS.length];
  const total = SHOTS.length;

  const productShot = (
    <PopupFrame scale={0.98}>
      <PlaceholderPopup
        brand={brand}
        items={MOCK_ITEMS}
        primaryCount={MOCK_STATS.primaryCount}
        primaryLabel={MOCK_STATS.primaryLabel}
        secondaryLabel={MOCK_STATS.secondaryLabel}
        lastRunAgo={MOCK_STATS.lastRunAgo}
        active={index === 2}
      />
    </PopupFrame>
  );

  return (
    <Backdrop brand={brand}>
      {/* Top bar: wordmark + step counter */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 60,
          right: 60,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <BrandLockup brand={brand} size={30} />
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 12,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(246,246,243,0.55)",
          }}
        >
          {String(index).padStart(2, "0")} · {String(total).padStart(2, "0")}
        </div>
      </div>

      <AbsoluteFill
        style={{
          padding: "120px 70px 60px",
          display: "flex",
          flexDirection: shot.layout === "ui-left" ? "row-reverse" : "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 64,
        }}
      >
        <div style={{ flex: 1, maxWidth: 520 }}>
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 13,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: brand === "#5258d8" ? "#9aa0ff" : "rgba(255,255,255,0.7)",
              marginBottom: 18,
            }}
          >
            {String(index).padStart(2, "0")}
          </div>
          <div
            style={{
              fontFamily: FONT.sans,
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 1.04,
              color: "#f6f6f3",
            }}
          >
            {shot.title}
          </div>
          <div
            style={{
              fontFamily: FONT.sans,
              fontSize: 20,
              color: "rgba(246,246,243,0.66)",
              marginTop: 18,
              lineHeight: 1.45,
            }}
          >
            {shot.subtitle}
          </div>
        </div>

        <div style={{ flex: "0 1 auto", display: "flex", justifyContent: "center" }}>
          {productShot}
        </div>
      </AbsoluteFill>
    </Backdrop>
  );
};
