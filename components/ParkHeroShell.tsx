"use client";

import { useState, useRef, useEffect } from "react";

const MONTHS: Record<string, string> = {
  january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
  july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
};

function fmtDate(val: string): string {
  const parts = val.trim().split(/\s+/);
  if (parts.length === 2) {
    const m = MONTHS[parts[0].toLowerCase()];
    const y = parts[1];
    if (m) return `${m}/${y}`;
  }
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) return parts[0];
  return val;
}
import ParkHeroViewer from "./ParkHeroViewer";
import ParkWeather from "./ParkWeather";
import ParkViewerModal from "./ParkViewerModal";

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

function ArIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2l8 4.5v9L12 22l-8-6.5V6.5z"/>
      <path d="M12 2v20M4 6.5l8 5.5 8-5.5"/>
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
  const [open3D, setOpen3D] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const bleed = "calc(-1 * clamp(16px, 4vw, 56px))";
  const postcodePrefix = postcode?.split(" ")[0];
  const idNumber = catalogueId?.replace(/^SCN\//i, "");

  // Area name (not street) + full postcode — matches the homepage hero treatment.
  const areaName = address && address.length > 1 ? address[1] : address?.[0];
  const locationChain = [areaName, "London", postcode]
    .filter(Boolean)
    .join(", ")
    .toUpperCase();

  const hasCoords = lat != null && lng != null;

  return (
    <>
    {open3D && modelFile && (
      <ParkViewerModal
        modelFile={modelFile}
        modelFileMobile={modelFileMobile}
        parkName={name}
        onClose={() => setOpen3D(false)}
        cameraPos={cameraPos}
        cameraTarget={cameraTarget}
        modelRotation={modelRotation}
        pingPong={pingPong}
        autoRotate={autoRotate}
        ambientIntensity={ambientIntensity}
        directionalIntensity={directionalIntensity}
        environmentPreset={environmentPreset}
        environmentIntensity={environmentIntensity}
      />
    )}
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

      {/* Top-left postcode badge */}
      {postcodePrefix && (
        <div style={{
          position: "absolute",
          top: "clamp(64px, 8vw, 80px)",
          right: "clamp(16px, 4vw, 56px)",
          width: 80, height: 80, borderRadius: "50%",
          background: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 6, pointerEvents: "none",
        }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 300, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {postcodePrefix}
          </span>
        </div>
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
        {/* Park name */}
        <div style={{
          fontFamily: "'MSCHN', var(--font-heading), Arial, sans-serif", fontWeight: 500,
          fontSize: "clamp(34px, 5.5vw, 60px)",
          lineHeight: 0.88, color: "#fff",
          textShadow: "0 2px 24px rgba(0,0,0,0.25)",
          marginBottom: 20,
          textTransform: "uppercase", letterSpacing: "0em",
        }}>
          {name}
        </div>

        {/* hero-meta row: field list (left) + cluster (right) */}
        <div className="fbs-hero-meta">

          {/* Left: field pills */}
          <div className="fbs-hm-left">
            <div className="fbs-field-row">
              {locationChain && (
                <span className="fbs-field-tag fbs-field-tag--plain">{locationChain}</span>
              )}

              {hasCoords && (
                <a
                  href={`https://maps.google.com/?q=${lat},${lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="fbs-field-tag fbs-coord-tag"
                >
                  {Math.abs(lat!).toFixed(4)}° {lat! >= 0 ? "N" : "S"}, {Math.abs(lng!).toFixed(4)}° {lng! >= 0 ? "E" : "W"}
                </a>
              )}

              {/* Catalogue no. + Scanned — paired inline, matches the homepage hero */}
              {(idNumber || scanned) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {idNumber && <span className="fbs-field-tag">{idNumber}</span>}
                  {scanned && <span className="fbs-field-tag">Scanned: {fmtDate(scanned)}</span>}
                </div>
              )}

              {/* Conditions — desktop only, moves next to the cluster on mobile */}
              {hasCoords && (
                <div className="fbs-cond-desktop">
                  <ParkWeather lat={lat!} lng={lng!} />
                </div>
              )}
            </div>
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
                  color: bw ? "var(--accent)" : "#fff",
                }}
              >
                <BwIcon active={bw} />
              </button>
              {isMobile && modelFile && (
                <>
                  <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.18)" }} />
                  <button
                    onClick={() => setOpen3D(true)}
                    title="Explore in 3D"
                    className="fbs-cluster-btn"
                    style={{
                      width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                      background: "none", border: "none", cursor: "pointer",
                      color: "#fff",
                    }}
                  >
                    <ArIcon />
                  </button>
                </>
              )}
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
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        .fbs-field-tag {
          display: inline-flex;
          align-items: center;
          font-family: var(--font-mono);
          font-size: 10.5px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.25);
          padding: 5px 9px;
          text-decoration: none;
        }
        .fbs-field-tag--plain {
          border: none;
          padding: 0;
        }
        .fbs-coord-tag { gap: 5px; }
        .fbs-coord-tag::after { content: "↗"; font-size: 10px; opacity: .7; }
        .fbs-coord-tag:hover { color: #fff; border-color: var(--accent); }
        .fbs-coord-tag:hover::after { opacity: 1; }
        .fbs-cond-mobile { display: none; }
        @media (max-width: 767px) {
          .fbs-hero-meta { flex-direction: column; align-items: stretch; gap: 14px; }
          .fbs-hm-right { flex-direction: row; align-items: center; justify-content: space-between; }
          .fbs-cond-desktop { display: none; }
          .fbs-cond-mobile { display: flex; }
          .fbs-cluster-btn { width: 44px !important; height: 44px !important; }
        }
      `}</style>
    </div>
    </>
  );
}
