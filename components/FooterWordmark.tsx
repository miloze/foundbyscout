"use client";

// Full-bleed Scout wordmark that rises out from under the foot of the page.
//
// Reveal model: progress is driven by how close you are to the *bottom of the
// document*, not by the element merely entering the viewport — "the more you
// are at the bottom, the more visible it is". The mark starts fully below its
// clip box and slides up, so the first thing you see is a cropped top edge. It
// travels slower than the page scrolls, which is what gives it the parallax
// feel against everything above it.
//
// Previously this rendered the word as text and measured a `#footer-spacer`
// element by id that exists nowhere in the app — so `update()` bailed on every
// scroll and the mark sat permanently hidden. It now measures itself and draws
// the real asset from public/scout.svg.
//
// Sized to the main content column rather than the viewport, so it lines up
// with the editorial above it. The clip box takes the asset's own 500:130
// aspect ratio, so its height always follows that width and the mark lands
// exactly flush at rest.
//
// Decorative: the nav already announces the site name, so this is aria-hidden
// rather than repeating it at the foot of every page.

import { useEffect, useRef } from "react";

type Props = {
  src?: string;
  /** intrinsic aspect of the asset — public/scout.svg is 500 × 130 */
  ratio?: string;
  /**
   * Any CSS colour. Defaults to --border, which is one step off the background
   * in both themes — #dddad4 (light grey) on the light background, #333333
   * (dark grey) on the dark one. --card is quieter, --muted louder.
   */
  colour?: string;
  /**
   * Cap the visible band, e.g. 120 or "8vw". The mark keeps its full width and
   * is cropped from the bottom rather than scaled down, so the letterforms stay
   * the same size. Use where the page cannot spare the mark's full height —
   * omit it and the block takes the asset's natural height.
   */
  maxHeight?: number | string;
  /**
   * How much scrolling the reveal spans, as a multiple of the mark's height.
   * Higher = the mark moves less per pixel of scroll, so the parallax reads
   * slower and the crop lingers.
   */
  window?: number;
  /**
   * Mark width as a multiple of the container's. >1 lets the letterforms grow
   * past the column and get cropped left and right by the clip box, so the
   * mark scales with the viewport instead of shrinking to fit inside it.
   * Centred, so the overhang is even on both sides.
   */
  scale?: number;
  /**
   * Fraction of the mark's height the clip box shows, 0–1. Below 1 the mark is
   * sliced off at the bottom edge — the letterforms keep their full size and
   * the block just shows less of them, which is the opposite of what capping
   * the font size would do. Combines with `scale`: the clip's aspect ratio is
   * derived from both, so the crop is the same proportion at every width.
   */
  slice?: number;
};

export default function FooterWordmark({
  src = "/scout.svg",
  ratio = "500 / 130",
  colour = "var(--border)",
  maxHeight,
  window: windowFactor = 3.2,
  scale = 1,
  slice = 1,
}: Props) {
  // Mark height is (containerWidth × scale) / markRatio, and the clip shows
  // `slice` of that — so the clip's own ratio is markRatio / (scale × slice).
  // Done numerically rather than as a calc() string so an malformed `ratio`
  // prop fails here rather than silently producing an invalid aspect-ratio.
  const [rw, rh] = ratio.split("/").map((n) => parseFloat(n.trim()));
  const markRatio = rw / rh;
  const clipRatio = markRatio / (scale * slice);
  const clipRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clip = clipRef.current;
    const mark = markRef.current;
    if (!clip || !mark) return;

    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      mark.style.transform = "translateY(0%)";
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - globalThis.innerHeight;
      const remaining = Math.max(0, maxScroll - globalThis.scrollY);
      // The reveal spans the last (height × windowFactor) pixels of the page.
      const span = Math.max(1, clip.getBoundingClientRect().height * windowFactor);
      const progress = Math.min(1, Math.max(0, 1 - remaining / span));
      mark.style.transform = `translateY(${((1 - progress) * 100).toFixed(2)}%)`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };

    globalThis.addEventListener("scroll", onScroll, { passive: true });
    globalThis.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => {
      globalThis.removeEventListener("scroll", onScroll);
      globalThis.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [windowFactor]);

  return (
    <div
      ref={clipRef}
      aria-hidden
      style={{
        width: "100%",
        // Derived from scale and slice, so at scale/slice 1 this is still the
        // asset's own ratio and the mark lands flush. `maxHeight` is a genuine
        // cap rather than a fixed height: it crops only once the natural height
        // exceeds it, so a narrow viewport — where the mark is already shorter
        // than the cap — gets no crop and no leftover slack.
        aspectRatio: `${clipRatio}`,
        position: "relative",
        ...(maxHeight === undefined
          ? {}
          : { maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight }),
        overflow: "hidden",
        lineHeight: 0,
        pointerEvents: "none",
      }}
    >
      {/* Masked rather than an <img>: scout.svg is hard-filled (currently the
          accent, previously #EF4343 — the fill is baked into the asset), and the
          mark needs to take a theme colour. The mask paints `colour` through
          the artwork, so one asset serves both themes. */}
      <div
        ref={markRef}
        style={{
          width: `${scale * 100}%`,
          // Centres the overhang when scale > 1, so the mark grows out of both
          // sides of the column rather than only the right.
          marginLeft: `${(1 - scale) * 50}%`,
          // The mark always keeps the asset's ratio; the clip box decides how
          // much of it you see.
          aspectRatio: ratio,
          background: colour,
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          transform: "translateY(100%)",
          willChange: "transform",
        }}
      />
    </div>
  );
}
