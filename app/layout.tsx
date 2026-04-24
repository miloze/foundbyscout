import type { Metadata } from "next";
import { Geist, Rubik, DM_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import ThemeProvider from "@/components/ThemeProvider";
import Grain from "@/components/Grain";

const bodyFont    = Geist({ subsets: ["latin"], weight: ["300","400","500","600","700"], variable: "--font-body" });
const headingFont = Rubik({ subsets: ["latin"], weight: ["300"], variable: "--font-heading" });
const monoFont    = DM_Mono({ subsets: ["latin"], weight: ["300","400"], variable: "--font-mono" });

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
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" />
      </head>
      <body className={`${bodyFont.variable} ${headingFont.variable} ${monoFont.variable}`} style={{ fontFamily: "var(--font-body), sans-serif", margin: 0, background: "var(--background)", color: "var(--foreground)" }}>
        <ThemeProvider>
          <Grain />
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", padding: "0 clamp(16px, 4vw, 56px)" }}>
            <div style={{ maxWidth: "1440px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", flex: 1 }}>
              <Nav />
              <main style={{ flex: 1 }}>{children}</main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
