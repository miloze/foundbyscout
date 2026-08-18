"use client";

import { useEffect } from "react";
import { VISITED_COOKIE, VISITED_MAX_AGE } from "@/lib/first-visit";

/**
 * The homepage hero's first-visit entrance — a single left-to-right sweep that
 * opens the image and carries the copy in behind it.
 *
 * Rendered only when app/page.tsx has already decided this is a first visit, so
 * everything here is scoped under [data-hero-entrance] and simply doesn't exist
 * for a returning visitor: no rules to override, no final-state resets, nothing
 * that can flash.
 *
 * Two mechanics, no third:
 *   · wipe — clip-path inset() from the right, hard edge, no fade underneath it
 *   · snap — opacity 0→1 in one frame, for the badges and the CTA, which are
 *     too small for a wipe to read as anything but a flicker
 *
 * The staggered starts are the whole point. Image at 0, badges at 300 while the
 * image is still moving, title at 350, chip at 450, CTA at 650 — each beat
 * begins before the last one settles, so the hero reads as one gesture crossing
 * it rather than five elements taking turns. Flattening these into a single
 * parallel reveal loses the effect entirely.
 *
 * fill-mode is `backwards`, not `both`, on purpose: it holds the pre-animation
 * state through the delay and then hands back to the element's natural state
 * once the animation ends, leaving no clip-path parked on the italic title
 * where a stray glyph overhang could sit against it. The wipes also finish just
 * past the right edge (-10%) so that handoff has nothing left to reveal.
 */
export default function HeroEntrance() {
  useEffect(() => {
    // Set after mount rather than on the server: a Server Component can't write
    // cookies, and doing it in middleware would mark the visit before the page
    // that shows the entrance has actually rendered.
    document.cookie = `${VISITED_COOKIE}=1; path=/; max-age=${VISITED_MAX_AGE}; samesite=lax`;
  }, []);

  return (
    <style>{`
      [data-hero-entrance] {
        /* Hard ease-out. No spring, no overshoot anywhere in this sequence —
           the wipe is a graphic edge travelling across the hero, and a bounce
           would turn it into an object that arrives and settles. */
        --he-ease: cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes fbs-he-wipe {
        from { clip-path: inset(0 100% 0 0); }
        to   { clip-path: inset(0 -10% 0 0); }
      }

      /* One frame, not a fade: steps(1, end) holds 0 for the whole duration and
         flips to 1 at the end, so the 1ms is a cut rather than a very fast
         crossfade. */
      @keyframes fbs-he-snap {
        from { opacity: 0; }
        to   { opacity: 1; }
      }

      [data-hero-entrance] .fbs-he-img {
        animation: fbs-he-wipe 450ms var(--he-ease) 0ms backwards;
      }
      [data-hero-entrance] .fbs-he-badge {
        animation: fbs-he-snap 1ms steps(1, end) 300ms backwards;
      }
      [data-hero-entrance] .fbs-he-title {
        animation: fbs-he-wipe 300ms var(--he-ease) 350ms backwards;
      }
      [data-hero-entrance] .fbs-he-chip {
        animation: fbs-he-wipe 250ms var(--he-ease) 450ms backwards;
      }
      /* .fbs-cta rather than a hook of its own — CTAButton deliberately takes
         no className, and the [data-hero-entrance] scope already excludes the
         page's other CTA, which sits outside the hero section. */
      [data-hero-entrance] .fbs-cta {
        animation: fbs-he-snap 1ms steps(1, end) 650ms backwards;
      }

      /* Decoration over a hero that already works, so reduced motion drops it
         outright rather than shortening it — the same call the view transitions
         in globals.css make. Removing the animation restores each element's
         natural state, which is the final state, so there is nothing to
         re-specify here. */
      @media (prefers-reduced-motion: reduce) {
        [data-hero-entrance] .fbs-he-img,
        [data-hero-entrance] .fbs-he-badge,
        [data-hero-entrance] .fbs-he-title,
        [data-hero-entrance] .fbs-he-chip,
        [data-hero-entrance] .fbs-cta {
          animation: none;
        }
      }
    `}</style>
  );
}
