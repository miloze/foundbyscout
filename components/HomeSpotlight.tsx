"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const ContourModel = dynamic(() => import("./ContourModel"), { ssr: false });

const PARKS = [
  {
    slug: "crystal-palace",
    name: "Crystal Palace",
    subtitle: "Skatepark",
    location: "South East London",
    tags: ["Bowl", "Free", "Outdoor"],
    brief: "South London's concrete icon. World-class cloverleaf pool, built for riders, by riders.",
    postcode: "SE19",
    modelFile: "/crystal_palace_skate_park.glb",
  },
  {
    slug: "southbank",
    name: "Southbank",
    subtitle: "Undercroft",
    location: "Waterloo",
    tags: ["Historic", "Free", "Covered"],
    brief: "Fifty years under Waterloo Bridge. The most culturally significant skate spot on earth.",
    postcode: "SE1",
  },
  {
    slug: "stockwell",
    name: "Stockwell",
    subtitle: "Skatepark",
    location: "South London",
    tags: ["Bowl", "Free", "24/7"],
    brief: "Built in 1978. Original concrete, iconic red surface, restored 2023. A true pilgrimage.",
    postcode: "SW9",
  },
];

export default function HomeSpotlight() {
  const [park] = useState(() => PARKS[Math.floor(Math.random() * PARKS.length)]);

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
      {/* Background */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: "#2a2a2a",
        }}
      />

      {/* Contour model — only for parks with a modelFile */}
      {park.modelFile && (
        <div style={{ position: "absolute", inset: 0 }}>
          <ContourModel
            modelFile={park.modelFile}
            heightMapFile="/CP-heightfield.jpg"
            lineColor="#ffffff"
          />
        </div>
      )}

      {/* Subtle grid texture */}
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(255,255,255,0.02) 59px,rgba(255,255,255,0.02) 60px),repeating-linear-gradient(90deg,transparent,transparent 59px,rgba(255,255,255,0.02) 59px,rgba(255,255,255,0.02) 60px)", pointerEvents: "none" }} />

      {/* Postcode badge */}
      <div style={{ position: "absolute", top: "clamp(20px,4vw,36px)", left: "clamp(16px,4vw,56px)", width: 72, height: 72, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 16, fontWeight: 300, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>{park.postcode}</span>
      </div>

      {/* Content */}
      <div className="relative" style={{ zIndex: 2, maxWidth: 900 }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,88,65,0.9)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
          Park Spotlight
        </p>
        <h1 style={{ fontSize: "clamp(3.5rem, 11vw, 9rem)", lineHeight: 0.88, letterSpacing: "-0.03em", color: "#f0f0eb", fontWeight: 300, marginBottom: 8 }}>
          {park.name}<br />
          <span style={{ color: "rgba(240,240,235,0.55)" }}>{park.subtitle}</span>
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(240,240,235,0.7)", letterSpacing: "0.08em", marginTop: 16, marginBottom: 8 }}>
          {park.location}
        </p>
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {park.tags.map(t => (
            <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 9, padding: "3px 8px", border: "1px solid rgba(240,240,235,0.4)", color: "rgba(240,240,235,0.8)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{t}</span>
          ))}
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(240,240,235,0.75)", maxWidth: "52ch", marginBottom: 28 }}>
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
