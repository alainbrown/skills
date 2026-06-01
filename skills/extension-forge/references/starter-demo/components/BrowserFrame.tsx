import type { ReactNode } from "react";
import { FONT, SHADOW } from "../theme";

interface BrowserFrameProps {
  children: ReactNode;
  /** URL shown in the address bar. */
  url?: string;
  /**
   * Optional popup to anchor under the extension's toolbar icon (top-right),
   * the way a real Chrome action popup hangs off the toolbar. When set, the
   * toolbar shows an extension icon and the popup floats below it.
   */
  popup?: ReactNode;
  width?: number | string;
  height?: number | string;
  brand?: string;
}

/**
 * Chrome-like browser chrome: traffic lights, an address bar, an extensions
 * toolbar region, and a content viewport. Drop a MockWebpage (or anything)
 * as children and optionally hang the extension popup off the toolbar.
 *
 * FORGE: set `url` to a page your extension would run on; put your content
 * page or the popup product shot inside.
 */
export const BrowserFrame = ({
  children,
  url = "https://example.com",
  popup,
  width = "100%",
  height = "100%",
  brand = "#5258d8",
}: BrowserFrameProps) => (
  <div
    style={{
      width,
      height,
      background: "#ffffff",
      borderRadius: 12,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: SHADOW.panel,
      fontFamily: FONT.sans,
      position: "relative",
    }}
  >
    {/* Toolbar */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        background: "#eef0f3",
        borderBottom: "1px solid #e2e4ea",
      }}
    >
      <span style={{ display: "flex", gap: 7 }}>
        <Dot color="#ed6a5e" />
        <Dot color="#f5bf4f" />
        <Dot color="#62c554" />
      </span>
      <div
        style={{
          flex: 1,
          background: "#fff",
          border: "1px solid #e2e4ea",
          borderRadius: 8,
          padding: "7px 14px",
          color: "#8c92a3",
          fontSize: 13,
        }}
      >
        {url}
      </div>
      {/* Extensions toolbar icon — the popup anchors here. */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: brand,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 14,
        }}
      >
        {/* FORGE: extension initial / icon */}
        E
      </div>
    </div>

    {/* Viewport */}
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      {children}
    </div>

    {/* Popup anchored under the toolbar icon */}
    {popup && (
      <div
        style={{
          position: "absolute",
          top: 56,
          right: 12,
          zIndex: 5,
        }}
      >
        {popup}
      </div>
    )}
  </div>
);

const Dot = ({ color }: { color: string }) => (
  <span style={{ width: 12, height: 12, borderRadius: 12, background: color }} />
);
