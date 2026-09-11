"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";
import { useNavOverlay } from "./NavOverlay";

// One destination. ABOUT was removed with its page: it linked to /about,
// which never existed and 404'd, and Scout has no second section to name.
// The archive is the site, so the bar says so and nothing else.
const links = [
  { href: "/parks", label: "PARKS" },
];

// Section matching, not URL equality. An individual park belongs to the parks
// collection, so PARKS stays lit on /parks/bloblands — the bar says which part
// of the site you are in, not which document you have open. Exact matching is
// what left every park page with no active state at all.
function isCurrentSection(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Theme toggle. A flat rounded square: the icon carries the state on its own,
// showing the mode a press moves *to* - a moon while the site is light, a sun
// while it is dark.
//
// Icons are inline SVG. Nothing else here pulls in an icon package and two
// glyphs do not earn the dependency.
const TOGGLE_BOX = 44;

// Fill and ink live in .fbs-nav-toggle in globals.css rather than in this style
// object — including the note on why the rest state is --card. Only the box is
// inline: the control needs a second appearance over a full-bleed photograph,
// and an inline style cannot express a variant any more than it could express
// the nav link's hover state.
function ThemeToggle({ theme, onToggle, onPhoto }: { theme: string; onToggle: () => void; onPhoto?: boolean }) {
  const dark = theme === "dark";
  return (
    <button
      onClick={onToggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={`fbs-nav-toggle${onPhoto ? " fbs-nav-toggle--on-photo" : ""}`}
      style={{
        width: TOGGLE_BOX, height: TOGGLE_BOX,
        borderRadius: 13,
        border: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        padding: 0,
      }}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

// currentColor throughout, so both glyphs inherit the button's --foreground
// and flip with the theme without carrying a colour of their own.
function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { overlay, overlayTone } = useNavOverlay();
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
          aria-label="Primary"
          className="flex items-center justify-end"
          style={{
            background: overlay ? "transparent" : "var(--background)",
            // Deliberately constant: --nav-height feeds the layout's top padding
            // and the hero's negative margin, so letting overlay change the bar's
            // height would jog the whole page when the nav flips solid on scroll.
            paddingTop: "12px", paddingBottom: "12px",
            // --frame-inset, not --content-padding: above 1400px of usable
            // width the body column is centred inside the viewport, so the
            // raw padding put the bar ~19px outside the column it sits over.
            // See the token in colors_and_type.css.
            paddingLeft: "var(--frame-inset)", paddingRight: "var(--frame-inset)",
            borderBottom: "none",
            transition: "background 0.2s, border-color 0.2s",
          }}
        >
          {/* One row at every width. The links used to be `hidden md:flex`,
              with a hamburger and a drop-down panel taking over below 768 —
              so on a phone the only destination in the site was behind a
              24x15px glyph while the theme toggle sat beside it as a 44x44
              filled square. With a single destination there is nothing a menu
              could usefully hold, so the button, the panel, the panel's own
              second copy of the theme toggle and the open/close state are all
              gone rather than restyled. */}
          <ul className="flex items-center" style={{ gap: 4 }}>
            {links.map((link) => {
              const current = isCurrentSection(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    // Over a photograph the bar is transparent and the scrim is
                    // faded, so the label sits on the image and --foreground
                    // stops describing what is behind it. See .fbs-nav-link--on-photo.
                    className={`fbs-nav-link${overlay && overlayTone === "photo" ? " fbs-nav-link--on-photo" : ""}`}
                    aria-current={current ? "page" : undefined}
                  >
                    <span className="fbs-nav-link__label">{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Outside the list, not an <li> in it: the toggle changes how the
              site looks, it is not somewhere you can go, and sitting in the
              navigation list it was announced as one. */}
          <div className="fbs-nav-utility">
            <span className="fbs-nav-rule" aria-hidden="true" />
            <ThemeToggle theme={theme} onToggle={toggle} onPhoto={overlay && overlayTone === "photo"} />
          </div>
        </nav>

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
          // 56 everywhere except /parks. The homepage's postcode badge measures
          // down from --nav-height rather than from the mark now, so this no
          // longer sets the badge's band — but the mark still shares the hero's
          // upper-left corner with it, and 40 there puts the two closer than
          // the frame's own inset.
          //
          // /parks has no badge and does have a floor to protect: its sticky
          // bar pads itself down to --logo-bottom, so every pixel above the
          // mark is a pixel off the bottom of the map and off the detail card
          // anchored to it. 40 there buys the map 16px with nothing to trade
          // against it.
          top: pathname?.startsWith("/parks") ? 40 : 56,
          // Same inset as the bar above it and the hero title group below it —
          // see --frame-inset. This was --content-padding's expression, which
          // is the body column's edge only while the column is gutter-bound.
          left: "var(--frame-inset)",
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
            // Scaled down a further 17% from clamp(41px, 5.5vw, 66px), which
            // was itself 15% off clamp(48px, 6.5vw, 78px). The mark was
            // competing with the hero rather than sitting on it: at 1440 it ran
            // a fifth of the way across the frame, while the park name below it
            // is the thing meant to carry that width.
            //
            // All three terms take the same factor every time, so the viewport
            // at which the mark stops growing is still 1200px. --logo-h and the
            // rest are published from the measured box, so the nav scrim and
            // the /parks sticky bar follow without their own tuning.
            height: "clamp(34px, 4.58vw, 55px)",
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
