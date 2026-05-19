"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "./ThemeProvider";

const links = [
  { href: "/parks", label: "Parks" },
];

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();

  return (
    <header style={{ borderBottom: "none" }} className="sticky top-0 z-50">
      <nav
        className="flex items-center justify-between"
        style={{ background: "var(--background)", paddingTop: "12px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}
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
                className="text-sm transition-colors"
                style={{ color: pathname === link.href ? "var(--accent)" : "var(--muted)" }}
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

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden px-6 pb-6 flex flex-col gap-4" style={{ background: "var(--background)" }}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm"
              style={{ color: pathname === link.href ? "var(--accent)" : "var(--foreground)" }}
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
