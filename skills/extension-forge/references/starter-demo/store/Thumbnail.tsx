// YouTube thumbnail · 1280x720. Same hero language as the Marquee but
// retuned for legibility when shrunk to a grid cell: bigger headline,
// product shot pushed up in scale.
//
// FORGE: tune the big hook below; swap PlaceholderPopup for `@ext` popup.

import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrandLockup } from "../components/BrandLockup";
import { PopupFrame } from "../components/PopupFrame";
import { DEFAULT_BRAND, FONT, shade } from "../theme";
import { COPY, MOCK_ITEMS, MOCK_STATS } from "../mockData";
import { PlaceholderPopup } from "../ext/PlaceholderPopup";

interface StoreProps {
  brand?: string;
}

export const Thumbnail = ({ brand = DEFAULT_BRAND }: StoreProps) => (
  <Backdrop brand={brand}>
    <AbsoluteFill
      style={{
        padding: "0 80px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 56,
      }}
    >
      <div style={{ flex: 1, maxWidth: 640 }}>
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 16,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.7)",
            marginBottom: 26,
          }}
        >
          {COPY.eyebrow}
        </div>
        <BrandLockup brand={brand} size={68} />
        <h1
          style={{
            fontFamily: FONT.sans,
            fontSize: 60,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            color: "#f6f6f3",
            margin: "30px 0 0",
            lineHeight: 1.04,
          }}
        >
          {/* FORGE: punchy hook with one highlighted phrase */}
          The one thing{" "}
          <em style={{ fontStyle: "normal", color: shade(brand, 60) }}>your browser</em>{" "}
          was missing.
        </h1>
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 22,
            color: "rgba(246,246,243,0.62)",
            marginTop: 22,
            lineHeight: 1.45,
            maxWidth: 520,
          }}
        >
          {COPY.tagline}
        </div>
      </div>

      <PopupFrame scale={1.12}>
        <PlaceholderPopup
          brand={brand}
          items={MOCK_ITEMS.slice(0, 4)}
          primaryCount={MOCK_STATS.primaryCount}
          primaryLabel={MOCK_STATS.primaryLabel}
          secondaryLabel={MOCK_STATS.secondaryLabel}
          lastRunAgo={MOCK_STATS.lastRunAgo}
        />
      </PopupFrame>
    </AbsoluteFill>
  </Backdrop>
);
