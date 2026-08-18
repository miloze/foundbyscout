"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { useNavOverlay } from "./NavOverlay";

const links = [
  { href: "/parks", label: "PARKS" },
  { href: "/about", label: "ABOUT" },
];

// Theme switch. The track is a neutral warm grey that inverts between modes —
// deliberately not --accent, which read as a live "on" state rather than a
// control. The thumb stays white in both modes and carries state by position:
// left in light, right in dark. A hairline border plus a soft shadow keep the
// white thumb legible against the light track.
const TRACK_W = 40, TRACK_H = 22, THUMB = 16, PAD = 2;
// Track borders sit inside the 40px box, so the travel is the box minus the
// thumb, both pads and both 1px borders.
const THUMB_TRAVEL = TRACK_W - THUMB - PAD - 2;

function ThemeSwitch({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  const dark = theme === "dark";
  return (
    <button
      onClick={onToggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: TRACK_W, height: TRACK_H,
        borderRadius: TRACK_H / 2,
        background: dark ? "#3a3733" : "#dcd8d2",
        border: `1px solid ${dark ? "#4a453f" : "#c7c1b8"}`,
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s, border-color 0.2s",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span style={{
        position: "absolute",
        top: PAD,
        left: dark ? THUMB_TRAVEL : PAD,
        width: THUMB, height: THUMB,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.28)",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { overlay } = useNavOverlay();
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);

  // Publish the viewport's *inner* width — clientWidth, which excludes the
  // scrollbar — as --vw, for .full-bleed in globals.css.
  //
  // 100vw is the obvious choice there and is wrong: it counts the classic
  // scrollbar, so on Windows/Linux every full-bleed element renders ~15px
  // wider than the visible page and, being centred by its negative margins,
  // overhangs ~7px past each edge. That is exactly enough to knock a
  // full-bleed hero out of alignment with the nav bar above it, which is
  // measured in real page pixels. Observing documentElement catches the
  // scrollbar appearing and disappearing as well as plain resizes.
  //
  // Measures the page shell, not <html> or <body>: globals.css pins both of
  // those to `max-width: 100vw`, so neither box ever narrows when a scrollbar
  // appears and an observer on either never fires for the one case this
  // exists to catch. The shell is a plain block in normal flow, so its width
  // *is* the usable width, scrollbar excluded, and it changes exactly when
  // that does.
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>("[data-page-shell]");
    if (!shell) return;
    const publish = () => {
      document.documentElement.style.setProperty("--vw", `${shell.getBoundingClientRect().width}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(shell);
    return () => ro.disconnect();
  }, []);

  // Publish the header's real rendered height as a CSS var so anything
  // meant to sit flush below it (e.g. the sticky search bar on /parks)
  // tracks the actual height instead of a hardcoded guess that drifts
  // whenever the nav's content/padding changes across breakpoints. This
  // deliberately measures the header BAR only, not the logo overhang —
  // page content should clear the bar, not the part of the logo that's
  // meant to float over it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () => {
      document.documentElement.style.setProperty("--nav-height", `${el.getBoundingClientRect().height}px`);
    };
    publish(); // before first paint — otherwise the 44px fallback is used for a
               // frame and everything below the bar jumps once the observer fires
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ...and the logo's real bottom edge as --logo-bottom. The logo is sized to
  // hang *below* the bar, so --nav-height alone isn't enough for a page that
  // needs to sit clear of it rather than scroll under it (see /parks, where
  // the sticky search bar pads itself down to this value). Measured rather
  // than recomputed from the clamp() so it can't drift if the logo resizes.
  useEffect(() => {
    const el = logoRef.current;
    if (!el) return;
    const publish = () => {
      const r = el.getBoundingClientRect();
      document.documentElement.style.setProperty("--logo-bottom", `${r.bottom}px`);
      // The mark's top edge. Nav is position:fixed, so this is constant in
      // viewport coordinates and safe for anything that needs to sit on the
      // logo's band — the homepage postcode badge centres its row on it.
      document.documentElement.style.setProperty("--logo-top", `${r.top}px`);
      // Centre and size drive the scrim's gradient below, so it stays locked to
      // the logo across breakpoints instead of re-deriving the clamp() by hand.
      document.documentElement.style.setProperty("--logo-w",  `${r.width}px`);
      document.documentElement.style.setProperty("--logo-h",  `${r.height}px`);
      document.documentElement.style.setProperty("--logo-cx", `${r.left + r.width / 2}px`);
      document.documentElement.style.setProperty("--logo-cy", `${r.top + r.height / 2}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 w-full" style={{ zIndex: 30 }}>
      <header ref={headerRef} style={{ position: "relative", zIndex: 20, borderBottom: "none" }} className="w-full">
        <nav
          className="flex items-center justify-end"
          style={{
            background: overlay ? "transparent" : "var(--background)",
            // Deliberately constant: --nav-height feeds the layout's top padding
            // and the hero's negative margin, so letting overlay change the bar's
            // height would jog the whole page when the nav flips solid on scroll.
            paddingTop: "12px", paddingBottom: "12px",
            paddingLeft: "clamp(16px, 4vw, 56px)", paddingRight: "clamp(16px, 4vw, 56px)",
            borderBottom: "none",
            transition: "background 0.2s, border-color 0.2s",
          }}
        >
          {/* Desktop links + toggles */}
          <ul className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: pathname === link.href ? "var(--accent)" : "var(--muted)" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <ThemeSwitch theme={theme} onToggle={toggle} />
            </li>
          </ul>

          {/* Mobile: toggle + hamburger */}
          <div className="md:hidden flex items-center gap-4">
            <ThemeSwitch theme={theme} onToggle={toggle} />
            <button
              className="flex flex-col gap-1.5 p-1"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span className="block w-6 h-px" style={{ background: overlay ? "#fff" : "var(--foreground)", boxShadow: overlay ? "0 1px 3px rgba(0,0,0,0.4)" : "none" }} />
              <span className="block w-6 h-px" style={{ background: overlay ? "#fff" : "var(--foreground)", boxShadow: overlay ? "0 1px 3px rgba(0,0,0,0.4)" : "none" }} />
              <span className="block w-4 h-px" style={{ background: overlay ? "#fff" : "var(--foreground)", boxShadow: overlay ? "0 1px 3px rgba(0,0,0,0.4)" : "none" }} />
            </button>
          </div>
        </nav>

        {/* Mobile menu — drops inline below the nav bar, right-aligned to match burger position */}
        {menuOpen && (
          <div className="md:hidden" style={{
            position: "absolute", top: "100%", right: 0,
            background: "var(--background)", borderBottom: "1px solid var(--border)",
            borderLeft: "1px solid var(--border)",
            padding: "8px 0", minWidth: 140,
            zIndex: 50,
          }}>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "block", padding: "10px 20px",
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  color: pathname === link.href ? "var(--accent)" : "var(--foreground)",
                }}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Scrim — a full-width band of the page background across the top, so
          any content scrolling beneath it is knocked back rather than colliding
          with the logo and nav links. Spans the site width instead of pooling
          around the mark, so text is treated the same wherever it passes.

          Only while the nav is solid. `overlay` is true exactly when a
          full-bleed hero sits behind the nav, and over a hero the logo is meant
          to sit directly on the photograph — so the scrim fades out there and
          the image stays clean.

          zIndex 10 puts it under the header bar (20) as well as the logo (30):
          the bar paints its own solid background on top, so the scrim is only
          ever visible in the strip below the bar where the logo overhangs.
          Colour is var(--background), which is the white in light mode and the
          black in dark. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "calc(var(--logo-h, 68px) * 2.1)",
          zIndex: 10,
          pointerEvents: "none",
          // Solid down to the logo's baseline (55% of the height lands there),
          // then a short fade so there is no visible edge where it ends.
          background: `linear-gradient(to bottom, var(--background) 0%, var(--background) 55%, transparent 100%)`,
          opacity: overlay ? 0 : 1,
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Logo — a sibling of the header bar, not a child, so it isn't clipped
          by anything the header does. Sized taller than the bar itself so it
          hangs below the header's bottom edge and reads as floating over
          scrolling content rather than being boxed inside the nav. */}
      <Link
        href="/"
        ref={logoRef}
        aria-label="Scout — home"
        className="logo-overhang"
        style={{
          position: "absolute",
          // Dropped from 10 to open real space above the mark. The postcode
          // badge centres its row on --logo-top / --logo-h, so it travels
          // down with the logo and the two keep reading as one lockup
          // instead of two independently-tuned positions.
          //
          // 56 rather than 30 so the badge clears the 50px nav bar entirely.
          // At 30 the badge's top edge landed at y=28, overlapping the
          // PARKS/ABOUT row's 12–38 band with only 20px of horizontal gap
          // between them; the two read as crowded even though their boxes
          // never actually intersect.
          top: 56,
          left: "clamp(16px, 4vw, 56px)",
          zIndex: 30,
          display: "block",
        }}
      >
        {/* Masked rather than an <img>, the same way FooterWordmark draws it:
            scout.svg is hard-filled, so an <img> pinned the logo to whatever
            colour is baked into the artwork and it silently kept the old
            coral through the accent change. The mask paints var(--accent)
            through the artwork, so the mark now tracks the token. */}
        <div
          aria-hidden
          style={{
            display: "block",
            // Between the original clamp(44px, 6vw, 68px) and the oversized
            // clamp(56px, 7.5vw, 96px) that replaced it. --logo-h/--logo-w are
            // published from the measured box, so the homepage postcode badge
            // follows this without its own tuning.
            height: "clamp(48px, 6.5vw, 78px)",
            aspectRatio: "500 / 130",
            background: "var(--accent)",
            maskImage: "url(/scout.svg)",
            WebkitMaskImage: "url(/scout.svg)",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
      </Link>
    </div>
  );
}
