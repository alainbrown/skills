// Chrome Web Store marquee promo tile · 1400x560. Hero: brand + copy on
// the left, product shot on the right.
//
// FORGE: tune copy via mockData.COPY; swap PlaceholderPopup for the real
// `@ext` popup.

import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrandLockup } from "../components/BrandLockup";
import { PopupFrame } from "../components/PopupFrame";
import { DEFAULT_BRAND, FONT } from "../theme";
import { COPY, MOCK_ITEMS, MOCK_STATS } from "../mockData";
import { PlaceholderPopup } from "../ext/PlaceholderPopup";

interface StoreProps {
  brand?: string;
}

export const Marquee = ({ brand = DEFAULT_BRAND }: StoreProps) => (
  <Backdrop brand={brand}>
    <AbsoluteFill
      style={{
        padding: "56px 80px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 72,
      }}
    >
      <div style={{ flex: 1, maxWidth: 620 }}>
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 13,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.7)",
            marginBottom: 26,
          }}
        >
          {COPY.eyebrow}
        </div>
        <BrandLockup brand={brand} size={84} />
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            color: "#f6f6f3",
            marginTop: 30,
            lineHeight: 1.18,
          }}
        >
          {COPY.tagline}
        </div>
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 18,
            color: "rgba(246,246,243,0.66)",
            marginTop: 18,
            lineHeight: 1.5,
            maxWidth: 480,
          }}
        >
          {COPY.blurb}
        </div>
      </div>

      <PopupFrame scale={1.02}>
        <PlaceholderPopup
          brand={brand}
          items={MOCK_ITEMS}
          primaryCount={MOCK_STATS.primaryCount}
          primaryLabel={MOCK_STATS.primaryLabel}
          secondaryLabel={MOCK_STATS.secondaryLabel}
          lastRunAgo={MOCK_STATS.lastRunAgo}
        />
      </PopupFrame>
    </AbsoluteFill>
  </Backdrop>
);
