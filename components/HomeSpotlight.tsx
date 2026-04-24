"use client";

import { useState } from "react";
import Link from "next/link";

const PARKS = [
  {
    slug: "crystal-palace",
    name: "Crystal Palace",
    subtitle: "Skatepark",
    location: "South East London",
    tags: ["Bowl", "Free", "Outdoor"],
    brief: "South London's concrete icon. World-class cloverleaf pool, built for riders, by riders.",
    postcode: "SE19",
    heroImage: "/images/parks/crystal-palace/gallery-01.webp",
    imagePosition: "center 60%",
  },
  {
    slug: "southbank",
    name: "Southbank",
    subtitle: "Undercroft",
    location: "Waterloo",
    tags: ["Historic", "Free", "Covered"],
    brief: "Fifty years under Waterloo Bridge. The most culturally significant skate spot on earth.",
    postcode: "SE1",
    heroImage: "/images/parks/southbank/gallery-01.webp",
    imagePosition: "center center",
  },
  {
    slug: "stockwell",
    name: "Stockwell",
    subtitle: "Skatepark",
    location: "South London",
    tags: ["Bowl", "Free", "24/7"],
    brief: "Built in 1978. Original concrete, iconic red surface, restored 2023. A true pilgrimage.",
    postcode: "SW9",
    heroImage: "/images/parks/stockwell/gallery-01.webp",
    imagePosition: "center center",
  },
];

export default function HomeSpotlight() {
  const [park] = useState(() => PARKS[Math.floor(Math.random() * PARKS.length)]);
  const [viewMode, setViewMode] = useState<"bw" | "colour">("bw");

  return (
    <section
      style={{
        position: "relative", minHeight: "78vh",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        padding: "8rem clamp(16px,4vw,56px) 3rem",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Hero photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={park.heroImage}
        alt=""
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: park.imagePosition,
          zIndex: 0,
          filter: viewMode === "bw" ? "grayscale(1) contrast(1.05) brightness(0.95)" : "none",
          transition: "filter 0.4s ease",
        }}
      />

      {/* B&W / CLR toggle */}
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10, display: "flex", gap: 2 }}>
        {(["bw", "colour"] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: "5px 12px", border: "none", cursor: "pointer",
              background: viewMode === mode ? "var(--accent)" : "rgba(0,0,0,0.55)",
              color: "#fff", fontFamily: "var(--font-mono)", fontSize: 10,
              letterSpacing: "0.1em", borderRadius: 2,
            }}
          >
            {mode === "bw" ? "B&W" : "CLR"}
          </button>
        ))}
      </div>

      {/* Dark gradient — bottom-heavy so text stays legible */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.72) 100%)",
      }} />

      {/* Postcode badge */}
      <div style={{
        position: "absolute", top: "clamp(20px,4vw,36px)", left: "clamp(16px,4vw,56px)",
        width: 72, height: 72, borderRadius: "50%", background: "var(--accent)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2, pointerEvents: "none",
      }}>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 300, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>{park.postcode}</span>
      </div>

      {/* Content overlay */}
      <div style={{ position: "relative", zIndex: 2, maxWidth: 900 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
          Park Spotlight
        </p>
        <h1 style={{ fontSize: "clamp(3.5rem, 11vw, 9rem)", lineHeight: 0.88, letterSpacing: "-0.03em", color: "#fff", fontWeight: 300, marginBottom: 8 }}>
          {park.name}<br />
          <span style={{ color: "rgba(255,255,255,0.55)" }}>{park.subtitle}</span>
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", marginTop: 16, marginBottom: 8 }}>
          {park.location}
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {park.tags.map(t => (
            <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 9, padding: "3px 8px", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{t}</span>
          ))}
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,0.7)", maxWidth: "52ch", marginBottom: 28 }}>
          {park.brief}
        </p>
        <Link
          href={`/parks/${park.slug}`}
          style={{ display: "inline-block", padding: "11px 28px", fontSize: 12, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.12em", background: "var(--accent)", color: "#fff" }}
        >
          Read More →
        </Link>
      </div>
    </section>
  );
}
