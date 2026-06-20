"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "./ThemeProvider";

const links = [
  { href: "/parks", label: "PARKS" },
  { href: "/about", label: "ABOUT" },
];

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();

  return (
    <header style={{ borderBottom: "none", position: "relative" }} className="fixed top-0 left-0 right-0 w-full z-50">
      <nav
        className="flex items-center justify-between"
        style={{ background: "var(--background)", paddingTop: "12px", paddingBottom: "12px", paddingLeft: "clamp(16px, 4vw, 56px)", paddingRight: "clamp(16px, 4vw, 56px)", borderBottom: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <Link href="/" className="text-sm font-black" style={{ color: "var(--accent)", letterSpacing: "0.04em" }}>
          Found by Scout
        </Link>

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
            <span className="block w-6 h-px" style={{ background: "var(--foreground)" }} />
            <span className="block w-6 h-px" style={{ background: "var(--foreground)" }} />
            <span className="block w-4 h-px" style={{ background: "var(--foreground)" }} />
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
  );
}
