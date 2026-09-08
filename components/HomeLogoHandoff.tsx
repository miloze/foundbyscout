"use client";

import { useEffect } from "react";

/**
 * Scout owns the introduction; the parks own the content.
 *
 * The mark is `position: fixed` in Nav, so without this it sits over the
 * catalogue for the rest of the page. This releases it once the PARKS heading
 * reaches the mark's own lower edge — and then brings it back on the way up, so
 * scrolling back to the hero returns the page to how it opened.
 *
 * The trigger is the real spatial relationship, not a scroll distance: Nav
 * already measures and publishes `--logo-bottom` (the mark's actual bottom in
 * viewport coordinates), so this compares the heading's top against that. It
 * therefore stays correct across every breakpoint, and if the mark is ever
 * resized the handoff follows it without being re-tuned.
 *
 * Homepage only — mounted by app/page.tsx and removed with it. Nothing about
 * the mark's own geometry changes; only its opacity.
 */

/**
 * How far ahead of the collision to release.
 *
 * 8px was wrong: the mark and the heading share the left gutter, so by the time
 * the heading's top has passed the mark's bottom edge they are already sitting
 * on each other — measured at 390, PARKS was overlapping Scout while this still
 * read "not released". The handoff has to be finished before they meet, not
 * begun when they do, so the trigger leads the collision by roughly the mark's
 * own height.
 */
const LEAD_PX = 72;

export default function HomeLogoHandoff({ targetId }: { targetId: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const target = document.getElementById(targetId);
    if (!target) return;

    let frame = 0;

    const apply = () => {
      frame = 0;
      // Read fresh each time: Nav republishes this from a ResizeObserver, so it
      // is already correct after a resize or an orientation change.
      const logoBottom =
        parseFloat(getComputedStyle(root).getPropertyValue("--logo-bottom")) || 106;
      const headingTop = target.getBoundingClientRect().top;
      root.toggleAttribute("data-logo-released", headingTop < logoBottom + LEAD_PX);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
      root.removeAttribute("data-logo-released");
    };
  }, [targetId]);

  return null;
}
