'use client';

import * as React from 'react';

/**
 * Sticky-scroll: keep the viewport pinned to the bottom while new content
 * arrives, UNLESS the user has manually scrolled up. Once they scroll back
 * to within `threshold` pixels of the bottom we resume auto-pinning.
 *
 * Returns refs you wire to the scroll container and the sentinel that sits
 * at the bottom of the message list.
 */
export function useStickyScroll<T extends HTMLElement>(threshold = 64): {
  containerRef: React.RefObject<T | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: (smooth?: boolean) => void;
  isAtBottom: boolean;
} {
  const containerRef = React.useRef<T | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const isPinnedRef = React.useRef(true);
  const [isAtBottom, setIsAtBottom] = React.useState(true);

  const scrollToBottom = React.useCallback((smooth = false) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // Track whether the user is near the bottom; flip pinned state.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const nearBottom = distance <= threshold;
      isPinnedRef.current = nearBottom;
      setIsAtBottom(nearBottom);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [threshold]);

  // When the content grows, auto-scroll IF pinned.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      if (isPinnedRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return { containerRef, bottomRef, scrollToBottom, isAtBottom };
}
