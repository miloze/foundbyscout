"use client";

import { useEffect, useRef } from "react";
import { useNavOverlay } from "./NavOverlay";

// Turns the nav transparent while a full-bleed hero is behind it, so the image
// runs to the top of the viewport and the logo floats on the photograph rather
// than sitting on a solid band.
//
// Drop inside a `position: relative` hero. It renders an invisible layer the
// size of that hero and watches it: while any of the hero is still below the
// nav, the nav stays transparent; once it has scrolled away the nav goes solid
// again so body content never slides under a see-through bar.
export default function HeroNavOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  const { setOverlay } = useNavOverlay();

  useEffect(() => {
    // Set immediately as well as via the observer: at scroll-0 the hero is
    // always behind the nav, and waiting for the first IO callback would show
    // a solid bar for a frame before it turns transparent.
    setOverlay(true);

    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setOverlay(entry.isIntersecting),
      { rootMargin: "-60px 0px 0px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      setOverlay(false); // leaving the page must not strand a transparent nav
    };
  }, [setOverlay]);

  return <div ref={ref} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}
