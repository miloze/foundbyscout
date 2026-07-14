"use client";

import Link from "next/link";

const MONTHS: Record<string, string> = {
  january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
  july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
};

function fmtDate(val: string): string {
  const parts = val.trim().split(/\s+/);
  if (parts.length === 2) {
    const m = MONTHS[parts[0].toLowerCase()];
    const y = parts[1].slice(-2);
    if (m) return `${m}/${y}`;
  }
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) return parts[0].slice(-2);
  return val;
}

type Props = {
  catalogueId?: string;
  name: string;
  address?: string[];
  postcode?: string;
  opened?: string;
  scanned?: string;
  slug?: string;
};

export default function ParkHeroMeta({ catalogueId, name, address, postcode, opened, scanned, slug }: Props) {
  const postcodePrefix = postcode?.split(" ")[0];
  const locationChain = [address?.[0], "London", postcodePrefix]
    .filter(Boolean)
    .join(" / ")
    .toUpperCase();

  const idNumber = catalogueId?.replace(/^SCN\//i, "");

  return (
    <div>
      {/* Eyebrow — bare catalogue number, coral to match the brand accent */}
      {idNumber && (
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 19.4, fontWeight: 400,
          color: "var(--accent)", textTransform: "uppercase",
          marginBottom: 6, lineHeight: 1, letterSpacing: "0.04em",
        }}>
          {idNumber}
        </div>
      )}

      {/* Park name */}
      <div style={{
        fontFamily: "'MSCHN', var(--font-heading), Arial, sans-serif", fontWeight: 300,
        fontStyle: "italic",
        fontSize: "clamp(3.5rem, 11vw, 9rem)",
        lineHeight: 0.9, color: "#fff",
        textShadow: "0 2px 16px rgba(0,0,0,0.25)",
        marginBottom: 12,
        textTransform: "uppercase", letterSpacing: "-0.01em",
      }}>
        {name}
      </div>

      {/* hp-meta row: left fields + CTA right */}
      <div className="fbs-hp-meta">
        <div className="fbs-hpm-left">
          {/* 3-tier location */}
          {/* Postcode-in-coral treatment is still an open decision — kept
              as one muted string until that's resolved. */}
          {locationChain && (
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 12.5,
              color: "rgba(255,255,255,0.55)",
              textTransform: "uppercase", letterSpacing: "0.02em",
              marginBottom: 10,
            }}>
              {locationChain}
            </div>
          )}

          {/* Opened + Scanned on one row */}
          {(opened || scanned) && (
            <div style={{ display: "flex", gap: 18 }}>
              {opened && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(255,255,255,0.55)" }}>Opened</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>{fmtDate(opened)}</span>
                </div>
              )}
              {scanned && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(255,255,255,0.55)" }}>Scanned</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>{fmtDate(scanned)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        {slug && (
          <Link href={`/parks/${slug}`} className="fbs-hero-cta">
            View scan →
          </Link>
        )}
      </div>

      <style>{`
        .fbs-hp-meta {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
        }
        .fbs-hpm-left { flex: 1; min-width: 0; }
        .fbs-hero-cta {
          display: inline-block;
          flex-shrink: 0;
          padding: 5px 10px;
          font-size: 10px;
          font-family: var(--font-heading);
          font-weight: 400;
          text-transform: uppercase;
          letter-spacing: .06em;
          background: var(--accent);
          color: #fff;
          text-decoration: none;
        }
        .fbs-hero-cta:hover { opacity: 0.88; }
        @media (max-width: 767px) {
          .fbs-hp-meta { flex-direction: column; align-items: stretch; gap: 10px; }
          .fbs-hero-cta { align-self: flex-start; }
        }
      `}</style>
    </div>
  );
}
