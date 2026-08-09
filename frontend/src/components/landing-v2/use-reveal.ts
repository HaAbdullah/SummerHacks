"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Flips to `true` the first time the element scrolls into view, then stops
 * observing. Used to trigger the CSS reveal transitions in
 * `landing-v2.module.css` — one-way, so sections never re-animate on scroll-up.
 */
export function useReveal<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (or a zero-height element) should never leave the
    // section permanently invisible — show it instead.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, shown };
}
