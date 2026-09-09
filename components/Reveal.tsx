"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

// ── Grouped scroll reveal ──────────────────────────────────────────────────
// One fade per section, not one per element. A stagger down a list of chips
// draws attention to the animation; a section arriving as a single block draws
// attention to the section. Everything inside a Reveal moves together, and
// nothing inside it is animated on its own.
//
// Restrained on purpose: opacity, plus 10px of rise that exists only to give
// the fade a direction. No scale, no blur, no per-child delay, and it happens
// once — scrolling back up does not replay it, because a page that re-animates
// on the way back is a page you cannot re-read.
//
// **Content is visible by default and is hidden only once this component is
// mounted and has decided to animate it.** That order matters: the obvious
// construction — hide in CSS, reveal in JS — means any failure of the
// observer, the script, or the hydration leaves the page blank-but-present,
// which is the worst outcome available. Here a broken script leaves everything
// on screen, exactly as the server sent it.

const REVEAL_CSS_ID = "fbs-reveal-css";
const REVEAL_CSS = `
  /* Armed only by script; see the note above. Without .is-armed these rules do
     nothing and the section is simply visible. */
  .fbs-reveal.is-armed{
    opacity:0;
    transform:translateY(10px);
  }

  /* The transition is declared on the destination state, not on .is-armed —
     and that is the whole trick. A transition is chosen from the *after-change*
     style, so with it on .is-armed, arming did not hide the section: it started
     a 550ms fade out of a section the reader could still see, and only then
     faded it back in. Declaring it here means arming is an instant cut (no
     transition in the after-change style, nothing to interpolate) while the
     reveal itself, which does have one, animates. */
  .fbs-reveal.is-armed.is-in{
    opacity:1;
    transform:none;
    transition:opacity .55s cubic-bezier(0.2, 0, 0, 1),
               transform .55s cubic-bezier(0.2, 0, 0, 1);
  }
  @media (prefers-reduced-motion: reduce){
    /* Belt and braces: the component already declines to arm under reduced
       motion, so this only catches a preference changed after mount. */
    .fbs-reveal.is-armed{ opacity:1; transform:none; }
    .fbs-reveal.is-armed.is-in{ transition:none; }
  }
`;

// Arming has to happen before the browser paints, or the section is drawn at
// full strength and then blinks out. useLayoutEffect on the server warns and
// does nothing, so swap by environment — the same pattern parksGridState uses.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function Reveal({
  children, className = "", as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** The element to render, when a plain div would be the wrong semantics. */
  as?: "div" | "section";
}) {
  const ref = useRef<HTMLDivElement>(null);

  // One stylesheet for however many Reveals a page mounts.
  useIsoLayoutEffect(() => {
    if (document.getElementById(REVEAL_CSS_ID)) return;
    const style = document.createElement("style");
    style.id = REVEAL_CSS_ID;
    style.textContent = REVEAL_CSS;
    document.head.appendChild(style);
  }, []);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    // Already on screen at mount, so there is nothing to reveal: a section the
    // reader can see is not something that arrives. This matters on a restored
    // scroll position and on a deep link — without it, coming back to a park
    // half way down the page hides what you were reading and fades it in at
    // you. Only sections still below the fold are armed. The 0.9 matches the
    // observer's -10% bottom margin, so the two agree on where "in view"
    // starts and a section cannot be judged out of view here and in view there.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    // Classes rather than state: this is a purely visual enhancement, and
    // driving it through React state would re-render the section twice for
    // something the compositor can do on its own. It also keeps the component
    // out of the setState-inside-an-effect pattern React lints against.
    el.classList.add("is-armed");

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add("is-in");
        io.disconnect();      // once, not every time it crosses the edge
      },
      // Fires a little before the section reaches the bottom edge, so it is
      // already settling as it comes into view rather than starting once it is
      // fully on screen and visibly late.
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref as React.Ref<HTMLDivElement & HTMLElement>} className={`fbs-reveal ${className}`.trim()}>
      {children}
    </Tag>
  );
}
