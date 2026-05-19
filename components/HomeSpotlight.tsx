"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const PARKS = [
  {
    slug: "bloblands",
    name: "Bloblands",
    subtitle: "Skatepark",
    location: "South East London",
    tags: ["Street", "Free", "Outdoor"],
    brief: "A neighbourhood concrete gem tucked away in Bermondsey. Raw, local, and well-loved.",
    postcode: "SE1",
    heroImage: "/images/parks/bloblands/hero-01.webp",
    imagePosition: "center center",
  },
  {
    slug: "crystal-palace",
    name: "Crystal Palace",
    subtitle: "Skatepark",
    location: "South East London",
    tags: ["Bowl", "Free", "Outdoor"],
    brief: "South London's concrete icon. World-class cloverleaf pool, built for riders, by riders.",
    postcode: "SE19",
    heroImage: "/images/parks/crystal-palace/hero-01.webp",
    imagePosition: "center 60%",
  },
  {
    slug: "the-grove",
    name: "The Grove",
    subtitle: "Skatepark",
    location: "South London",
    tags: ["Street", "Free", "Outdoor"],
    brief: "A hidden DIY gem, shaped by the community that skates it. Rough, raw, and entirely its own.",
    postcode: "SW2",
    heroImage: "/images/parks/the-grove/hero-01.webp",
    imagePosition: "center center",
  },
];

const INTERVAL = 5000;

export default function HomeSpotlight() {
  const [idx,    setIdx]    = useState(0);
  const [paused, setPaused] = useState(false);

  const park = PARKS[idx];

  const goTo = useCallback((i: number) => {
    setIdx(i);
    setPaused(false);
  }, []);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx(i => (i + 1) % PARKS.length), INTERVAL);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section
      style={{
        position: "relative", height: "78vh",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        padding: "8rem clamp(16px,4vw,56px) 3rem",
        marginLeft: "calc(-1 * clamp(16px, 4vw, 56px))",
        marginRight: "calc(-1 * clamp(16px, 4vw, 56px))",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <style>{`
        @keyframes spotlight-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spotlight-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes spotlight-content { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Hero background — key forces remount + fade on each slide */}
      <div key={idx} style={{ position: "absolute", inset: 0, zIndex: 0, animation: "spotlight-fade 0.6s ease both" }}>
        {park.heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={park.heroImage}
            alt=""
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", objectPosition: park.imagePosition,
            }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "#111" }} />
        )}
      </div>

      {/* Pause / play */}
      <button
        onClick={() => setPaused(p => !p)}
        aria-label={paused ? "Play slideshow" : "Pause slideshow"}
        style={{
          position: "absolute", top: 12, right: 12, zIndex: 10,
          width: 28, height: 28, border: "none", cursor: "pointer",
          background: "rgba(0,0,0,0.55)",
          color: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 2,
        }}
      >
        {paused ? (
          <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
            <path d="M0 0 L8 5 L0 10 Z" />
          </svg>
        ) : (
          <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
            <rect x="0" y="0" width="3" height="10" />
            <rect x="5" y="0" width="3" height="10" />
          </svg>
        )}
      </button>

      {/* Dark gradient */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(to bottom, transparent 0%, transparent 40%, rgba(0,0,0,0.78) 100%)",
      }} />

      {/* Postcode badge */}
      <div style={{
        position: "absolute", top: "clamp(20px,4vw,36px)", left: "clamp(16px,4vw,56px)",
        width: 80, height: 80, borderRadius: "50%", background: "var(--accent)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 2, pointerEvents: "none",
        transition: "none",
      }}>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 300, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {park.postcode}
        </span>
      </div>

      {/* Content — key triggers fade+slide on each slide */}
      <div key={`content-${idx}`} style={{ position: "relative", zIndex: 2, maxWidth: 900, animation: "spotlight-content 0.5s ease 0.15s both" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
          Park Spotlight
        </p>
        <h1 style={{ fontSize: "clamp(3.5rem, 11vw, 9rem)", lineHeight: 0.88, letterSpacing: "-0.03em", color: "#fff", fontWeight: 300, marginBottom: 8 }}>
          {park.name}
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
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link
            href={`/parks/${park.slug}`}
            style={{ display: "inline-block", padding: "11px 28px", fontSize: 12, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.12em", background: "var(--accent)", color: "#fff" }}
          >
            Read More →
          </Link>

          {/* Progress indicators */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {PARKS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                style={{ background: "none", border: "none", padding: "6px 0", cursor: "pointer", width: 36 }}
                aria-label={`Go to ${PARKS[i].name}`}
              >
                <div style={{ height: 2, background: "rgba(255,255,255,0.25)", position: "relative", overflow: "hidden" }}>
                  {i < idx && (
                    <div style={{ position: "absolute", inset: 0, background: "#fff" }} />
                  )}
                  {i === idx && (
                    <div
                      key={`bar-${idx}`}
                      style={{
                        position: "absolute", inset: 0,
                        background: "#fff",
                        transformOrigin: "left center",
                        animation: paused
                          ? "none"
                          : `spotlight-progress ${INTERVAL}ms linear forwards`,
                      }}
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
