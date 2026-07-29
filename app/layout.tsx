import type { Metadata } from "next";
import { Geist, Rubik, DM_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import ThemeProvider from "@/components/ThemeProvider";
import NavOverlayProvider from "@/components/NavOverlay";
import Grain from "@/components/Grain";

// Rubik carries two additions for the Scout Notes block:
//   · italic 300 — the notes are set in italic, and that has to come from a
//     family shipping a real one. Geist has none (next/font: "Unknown style
//     italic for font Geist. Available styles: normal"), so font-style:italic
//     on --font-body only synthesises an oblique: identical advance widths to
//     the upright, and mechanical at reading size.
//   · weight 500 — the last-resort cut for the quote marks. Those are set in
//     --font-display, which resolves to the MSCHN webfont; Rubik only catches
//     them if that fails to load, and a faked weight shows on a 44px glyph.
const headingFont = Rubik({ subsets: ["latin"], weight: ["300","500"], style: ["normal","italic"], variable: "--font-heading" });
const monoFont    = DM_Mono({ subsets: ["latin"], weight: ["300","400","500"], variable: "--font-mono" });
const bodyFont    = Geist({ subsets: ["latin"], weight: ["300","400"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Found By Scout — UK Skatepark Directory",
  description: "The UK's best skatepark resource. Find parks, read features, discover the scene.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // h-full chains down so flex children can fill the viewport reliably on iOS
    <html lang="en">
      <head>
        {/* iOS and Android linkify anything that looks like an address, phone
            number or date, and render it underlined — which is where the
            underlines under the park name and location chain come from on
            mobile. Nothing in the app's own CSS draws them. */}
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" />
      </head>
      <body className={`${headingFont.variable} ${monoFont.variable} ${bodyFont.variable}`} style={{ fontFamily: "var(--font-body), sans-serif", margin: 0, background: "var(--background)", color: "var(--foreground)" }}>
        <ThemeProvider>
          <NavOverlayProvider>
          <Grain />
          <Nav />
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: "var(--nav-height, 44px) clamp(16px, 4vw, 56px) 0" }}>
            <div style={{ maxWidth: "1440px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", flex: 1 }}>
              <main style={{ flex: 1 }}>{children}</main>
              <footer style={{
                paddingTop: 24, paddingBottom: 32,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 24, flexWrap: "wrap",
              }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  © 2016 Scout
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  {[["Parks", "/parks"], ["About", "/about"], ["Contact", "/contact"]].map(([label, href]) => (
                    <a key={href} href={href} style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", textDecoration: "none" }}>
                      {label}
                    </a>
                  ))}
                  <a href="https://instagram.com/foundbyscout" target="_blank" rel="noopener noreferrer"
                    style={{ color: "var(--muted)", display: "flex", alignItems: "center", transition: "color 0.15s" }}
                    aria-label="Instagram">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                      <circle cx="12" cy="12" r="4.5"/>
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
                    </svg>
                  </a>
                </div>
              </footer>
            </div>
          </div>
          </NavOverlayProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
