import type { CSSProperties } from "react";
import { FONT, shade } from "../theme";

interface BrandLockupProps {
  brand: string;
  size?: number;
  subtitle?: string;
  variant?: "light-on-dark" | "dark-on-light";
  style?: CSSProperties;
}

/**
 * Wordmark + optional tagline. A small brand "chip" (the colored square)
 * plus the product name. FORGE: swap the chip glyph and product name for
 * the real extension's mark, or drop in an <Img> of a real logo.
 */
export const BrandLockup = ({
  brand,
  size = 40,
  subtitle,
  variant = "light-on-dark",
  style,
}: BrandLockupProps) => {
  const ink = variant === "light-on-dark" ? "#f6f6f3" : "#14141a";
  const sub =
    variant === "light-on-dark" ? "rgba(246,246,243,0.55)" : "rgba(20,20,26,0.55)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: size * 0.22, ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: size * 0.34 }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: size * 0.24,
            background: `linear-gradient(135deg, ${brand}, ${shade(brand, 40)})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 800,
            fontSize: size * 0.58,
            fontFamily: FONT.sans,
          }}
        >
          {/* FORGE: brand glyph */}
          E
        </div>
        <div
          style={{
            fontFamily: FONT.sans,
            fontWeight: 800,
            fontSize: size * 0.92,
            letterSpacing: "-0.03em",
            color: ink,
          }}
        >
          {/* FORGE: product name */}
          My Extension
        </div>
      </div>
      {subtitle && (
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: Math.max(10, size * 0.3),
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: sub,
            marginLeft: size * 1.34,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
