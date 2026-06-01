// Chrome Web Store small promo tile · 440x280. Compact branding only.
//
// FORGE: tune copy via mockData.COPY.

import { AbsoluteFill } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrandLockup } from "../components/BrandLockup";
import { DEFAULT_BRAND, FONT } from "../theme";
import { COPY } from "../mockData";

interface StoreProps {
  brand?: string;
}

export const PromoTile = ({ brand = DEFAULT_BRAND }: StoreProps) => (
  <Backdrop brand={brand}>
    <AbsoluteFill
      style={{
        padding: "32px 36px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        {COPY.eyebrow}
      </div>
      <BrandLockup brand={brand} size={48} />
      <div
        style={{
          fontFamily: FONT.sans,
          fontSize: 15,
          color: "rgba(246,246,243,0.78)",
          lineHeight: 1.4,
          maxWidth: 340,
        }}
      >
        {COPY.tagline}
      </div>
    </AbsoluteFill>
  </Backdrop>
);
