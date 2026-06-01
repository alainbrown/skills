import type { ReactNode } from "react";
import { SHADOW } from "../theme";

interface PopupFrameProps {
  children: ReactNode;
  /** Scale for bigger demo/hero presence (e.g. 1.1). */
  scale?: number;
}

/**
 * Wraps a popup (placeholder or the real `@ext` Popup) in a rounded mask +
 * soft drop shadow so it reads as a floating browser popup. Use this around
 * the extension's actual popup component to give it product-shot polish.
 */
export const PopupFrame = ({ children, scale = 1 }: PopupFrameProps) => (
  <div
    style={{
      transform: `scale(${scale})`,
      transformOrigin: "center center",
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: SHADOW.panel,
    }}
  >
    {children}
  </div>
);
