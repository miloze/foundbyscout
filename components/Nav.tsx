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

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { overlay } = useNavOverlay();
  const headerRef = useRef<HTMLElement>(null);

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
    const ro = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty("--nav-height", `${entry.contentRect.height}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 w-full" style={{ zIndex: 30 }}>
      <header ref={headerRef} style={{ position: "relative", zIndex: 20, borderBottom: "none" }} className="w-full">
        <nav
          className="flex items-center justify-end"
          style={{
            background: overlay ? "linear-gradient(180deg, rgba(0,0,0,0.35), transparent)" : "var(--background)",
            paddingTop: "12px", paddingBottom: overlay ? "24px" : "12px",
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
              <button
                onClick={toggle}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                style={{
                  width: 36, height: 20,
                  borderRadius: 10,
                  background: theme === "dark" ? "var(--border)" : "var(--accent)",
                  border: "1px solid var(--border)",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: "absolute",
                  top: 2, left: theme === "dark" ? 2 : 16,
                  width: 14, height: 14,
                  borderRadius: "50%",
                  background: theme === "dark" ? "var(--muted)" : "#fff",
                  transition: "left 0.2s, background 0.2s",
                }} />
              </button>
            </li>
          </ul>

          {/* Mobile: toggle + hamburger */}
          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={toggle}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                width: 36, height: 20,
                borderRadius: 10,
                background: theme === "dark" ? "var(--border)" : "var(--accent)",
                border: "1px solid var(--border)",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              <span style={{
                position: "absolute",
                top: 2, left: theme === "dark" ? 2 : 16,
                width: 14, height: 14,
                borderRadius: "50%",
                background: theme === "dark" ? "var(--muted)" : "#fff",
                transition: "left 0.2s, background 0.2s",
              }} />
            </button>
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

      {/* Logo — a sibling of the header bar, not a child, so it isn't clipped
          by anything the header does. Sized taller than the bar itself so it
          hangs below the header's bottom edge and reads as floating over
          scrolling content rather than being boxed inside the nav. */}
      <Link
        href="/"
        aria-label="Scout — home"
        className="logo-overhang"
        style={{
          position: "absolute",
          top: 10,
          left: "clamp(16px, 4vw, 56px)",
          zIndex: 30,
          display: "block",
          filter: overlay ? "drop-shadow(0 2px 10px rgba(0,0,0,0.4))" : "drop-shadow(0 1px 3px rgba(0,0,0,0.08))",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/scout.svg" alt="Scout" style={{ display: "block", height: "clamp(44px, 6vw, 68px)", width: "auto" }} />
      </Link>
    </div>
  );
}
