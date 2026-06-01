// Demo-local STAND-IN for the extension's real popup component.
//
// This exists so the starter RENDERS STANDALONE before you wire in the
// extension's UI. It is a generic, branded popup mock: a header, a headline
// stat, a scrollable list, and a primary action button.
//
// FORGE: delete this file once you import the real component. Replace
//   import { PlaceholderPopup } from "./ext/PlaceholderPopup";
// with
//   import "../chrome-shim";              // if needed (see chrome-shim.ts)
//   import { Popup } from "@ext/popup/Popup";
// and feed it props from mockData.ts. Keep the <PopupFrame> wrapper.

import type { MockItem } from "../mockData";
import { FONT, INK, shade } from "../theme";

interface PlaceholderPopupProps {
  brand: string;
  items: MockItem[];
  primaryCount: number;
  primaryLabel: string;
  secondaryLabel: string;
  lastRunAgo: string;
  /** Highlight the action button (mid-click in the demo timeline). */
  active?: boolean;
}

export const PlaceholderPopup = ({
  brand,
  items,
  primaryCount,
  primaryLabel,
  secondaryLabel,
  lastRunAgo,
  active = false,
}: PlaceholderPopupProps) => {
  return (
    <div
      style={{
        width: 380,
        background: "#ffffff",
        color: INK[1],
        fontFamily: FONT.sans,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 18px",
          borderBottom: "1px solid #eceef2",
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: `linear-gradient(135deg, ${brand}, ${shade(brand, 40)})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          {/* FORGE: extension initial / logo */}
          E
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, color: INK[0] }}>
          {/* FORGE: product name */}
          My Extension
        </div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: INK[3] }}>
          {lastRunAgo}
        </div>
      </div>

      {/* Headline stat */}
      <div style={{ padding: "20px 18px 14px" }}>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: INK[0],
            lineHeight: 1,
          }}
        >
          {primaryCount.toLocaleString()}
        </div>
        <div style={{ fontSize: 13, color: INK[2], marginTop: 6 }}>
          {primaryLabel} · {secondaryLabel}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: "0 10px", maxHeight: 220, overflow: "hidden" }}>
        {items.map((it) => (
          <div
            key={it.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 8px",
              borderRadius: 8,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: INK[0],
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {it.title}
              </div>
              <div style={{ fontSize: 11, color: INK[3], marginTop: 2 }}>
                {it.subtitle}
              </div>
            </div>
            <div
              style={{
                width: 64,
                height: 6,
                borderRadius: 6,
                background: "#eceef2",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round(it.value * 100)}%`,
                  height: "100%",
                  background: brand,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Primary action */}
      <div style={{ padding: "14px 18px 18px" }}>
        <button
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            fontFamily: FONT.sans,
            fontSize: 15,
            fontWeight: 700,
            color: "white",
            background: active
              ? `linear-gradient(135deg, ${shade(brand, -20)}, ${brand})`
              : `linear-gradient(135deg, ${brand}, ${shade(brand, 40)})`,
            boxShadow: active
              ? `0 0 0 4px ${brand}33`
              : `0 6px 20px ${brand}40`,
            cursor: "pointer",
            transform: active ? "translateY(1px)" : "none",
          }}
        >
          {/* FORGE: primary CTA verb */}
          {active ? "Working…" : "Run now"}
        </button>
      </div>
    </div>
  );
};
