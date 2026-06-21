"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import ParkHeroViewer from "./ParkHeroViewer";
import ParkWeather from "./ParkWeather";

type Props = {
  // Viewer
  modelFile: string | null;
  modelFileLow?: string;
  modelFileMobile?: string;
  heroImage?: string;
  preloadImageUrl?: string;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  pingPong?: [[number, number, number], [number, number, number]];
  autoRotate?: boolean;
  debug?: boolean;
  ambientIntensity?: number;
  directionalIntensity?: number;
  environmentPreset?: string;
  environmentIntensity?: number;
  // Meta
  catalogueId?: string;
  name: string;
  address?: string[];
  location?: string;
  postcode?: string;
  lat?: number;
  lng?: number;
  opened?: string;
  scanned?: string;
};

function BwIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
      {active && <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />}
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
    </svg>
  );
}

export default function ParkHeroShell({
  modelFile, modelFileLow, modelFileMobile, heroImage, preloadImageUrl,
  cameraPos, cameraTarget, modelRotation, pingPong, autoRotate, debug,
  ambientIntensity, directionalIntensity, environmentPreset, environmentIntensity,
  catalogueId, name, address, location, postcode, lat, lng, opened, scanned,
}: Props) {
  const [bw, setBw] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);

  function toggleFullscreen() {
    if (!heroRef.current) return;
    if (!document.fullscreenElement) {
      heroRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  const bleed = "calc(-1 * clamp(16px, 4vw, 56px))";
  const postcodePrefix = postcode?.split(" ")[0];
  const idNumber = catalogueId?.replace(/^SCN\//i, "");

  const locationChain = [address?.[0], "London", postcodePrefix]
    .filter(Boolean)
    .join(" / ")
    .toUpperCase();

  const hasCoords = lat != null && lng != null;

  return (
    <div
      ref={heroRef}
      style={{
        position: "relative",
        height: "78vh",
        minHeight: 340,
        overflow: "hidden",
        background: "var(--background)",
        marginTop: "-44px",
        marginLeft: bleed,
        marginRight: bleed,
      }}
    >
      {/* Viewer — grayscale prop controls ParkModel's filter directly */}
      {modelFile ? (
        <div style={{ position: "absolute", inset: 0 }}>
          <ParkHeroViewer
            modelFile={modelFile}
            modelFileLow={modelFileLow}
            modelFileMobile={modelFileMobile}
            heroImage={heroImage}
            preloadImageUrl={preloadImageUrl}
            cameraPos={cameraPos}
            cameraTarget={cameraTarget}
            modelRotation={modelRotation}
            pingPong={pingPong}
            autoRotate={autoRotate}
            debug={debug}
            ambientIntensity={ambientIntensity}
            directionalIntensity={directionalIntensity}
            environmentPreset={environmentPreset}
            environmentIntensity={environmentIntensity}
            grayscale={bw}
          />
        </div>
      ) : (
        <div style={{
          position: "absolute", inset: 0,
          background: "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.025) 59px, rgba(255,255,255,0.025) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.025) 59px, rgba(255,255,255,0.025) 60px)",
        }} />
      )}

      {/* Scrim */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: 300,
        background: "linear-gradient(180deg, rgba(20,19,15,0) 0%, rgba(20,19,15,0.5) 30%, rgba(20,19,15,0.88) 100%)",
        pointerEvents: "none",
        zIndex: 2,
      }} />

      {/* Hero content — bottom anchored */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        padding: "clamp(18px, 4vw, 32px)",
        zIndex: 5,
        color: "#fff",
      }}>
        {/* Back link */}
        <Link
          href="/parks"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14, textDecoration: "none" }}
        >
          <span style={{
            width: 24, height: 24, borderRadius: "50%", background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>←</span>
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            All Parks
          </span>
        </Link>

        {/* Eyebrow */}
        {idNumber && (
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 19.4,
            color: "#ff5a1f", textTransform: "uppercase",
            marginBottom: 6, lineHeight: 1, letterSpacing: "0.04em",
          }}>
            <span style={{ fontWeight: 400 }}>SCN/</span>
            <span style={{ fontWeight: 700 }}>{idNumber}</span>
          </div>
        )}

        {/* Park name */}
        <div style={{
          fontFamily: "var(--font-heading)", fontWeight: 300,
          fontSize: "clamp(34px, 5.5vw, 60px)",
          lineHeight: 0.88, color: "#fff",
          textShadow: "0 2px 24px rgba(0,0,0,0.25)",
          marginBottom: 14,
          textTransform: "uppercase", letterSpacing: "-0.01em",
        }}>
          {name}
        </div>

        {/* hero-meta row: field list (left) + cluster (right) */}
        <div className="fbs-hero-meta">

          {/* Left: field rows */}
          <div className="fbs-hm-left">
            {locationChain && (
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 13,
                color: "rgba(255,255,255,0.92)",
                textTransform: "uppercase", letterSpacing: "0.02em",
                marginBottom: 14,
              }}>
                {locationChain}
              </div>
            )}

            {hasCoords && (
              <div className="fbs-field-row">
                <div className="fbs-field-label">Coordinates</div>
                <a
                  href={`https://maps.google.com/?q=${lat},${lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="fbs-coord"
                >
                  {Math.abs(lat!).toFixed(4)}° {lat! >= 0 ? "N" : "S"}, {Math.abs(lng!).toFixed(4)}° {lng! >= 0 ? "E" : "W"}
                </a>
              </div>
            )}

            {opened && (
              <div className="fbs-field-row">
                <div className="fbs-field-label">Opened</div>
                <div className="fbs-field-value">{opened}</div>
              </div>
            )}

            {scanned && (
              <div className="fbs-field-row">
                <div className="fbs-field-label">Scanned</div>
                <div className="fbs-field-value">{scanned}</div>
              </div>
            )}

            {/* Conditions — desktop only, moves to bottom row on mobile */}
            {hasCoords && (
              <div className="fbs-field-row fbs-cond-desktop">
                <div className="fbs-field-label">Conditions</div>
                <ParkWeather lat={lat!} lng={lng!} />
              </div>
            )}
          </div>

          {/* Right: conditions (mobile only) + cluster */}
          <div className="fbs-hm-right">
            {hasCoords && (
              <div className="fbs-cond-mobile">
                <ParkWeather lat={lat!} lng={lng!} />
              </div>
            )}

            {/* Control cluster pill */}
            <div style={{
              display: "flex", alignItems: "center",
              background: "rgba(20,19,15,0.55)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.18)",
              overflow: "hidden",
            }}>
              <button
                onClick={() => setBw(b => !b)}
                title={bw ? "Show colour" : "Show B&W"}
                className="fbs-cluster-btn"
                style={{
                  width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "none", border: "none", cursor: "pointer",
                  color: bw ? "#ff5a1f" : "#fff",
                }}
              >
                <BwIcon active={bw} />
              </button>
              <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.18)" }} />
              <button
                onClick={toggleFullscreen}
                title="Fullscreen"
                className="fbs-cluster-btn"
                style={{
                  width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "none", border: "none", cursor: "pointer",
                  color: "#fff",
                }}
              >
                <ExpandIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .fbs-hero-meta {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 32px;
        }
        .fbs-hm-left { flex: 1; min-width: 0; }
        .fbs-hm-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          flex-shrink: 0;
          margin-bottom: 1px;
        }
        .fbs-field-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 5px;
        }
        .fbs-field-row:last-child { margin-bottom: 0; }
        .fbs-field-label {
          font-family: var(--font-mono);
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: rgba(255,255,255,0.55);
          width: 88px;
          flex-shrink: 0;
        }
        .fbs-field-value {
          font-family: var(--font-mono);
          font-size: 13px;
          color: #fff;
        }
        .fbs-coord {
          font-family: var(--font-mono);
          font-size: 13px;
          color: #fff;
          text-decoration: none;
          border-bottom: 1px solid rgba(255,255,255,0.3);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .fbs-coord::after { content: "↗"; font-size: 11px; opacity: .6; }
        .fbs-coord:hover { color: #ff5a1f; border-color: #ff5a1f; }
        .fbs-coord:hover::after { opacity: 1; }
        .fbs-cond-mobile { display: none; }
        @media (max-width: 767px) {
          .fbs-hero-meta { flex-direction: column; align-items: stretch; gap: 14px; }
          .fbs-hm-right { flex-direction: row; align-items: center; justify-content: space-between; }
          .fbs-field-label { width: 78px; }
          .fbs-cond-desktop { display: none; }
          .fbs-cond-mobile { display: flex; }
          .fbs-cluster-btn { width: 44px !important; height: 44px !important; }
        }
      `}</style>
    </div>
  );
}
