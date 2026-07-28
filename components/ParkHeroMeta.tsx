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
    const y = parts[1];
    if (m) return `${m}/${y}`;
  }
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) return parts[0];
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
  const idNumber = catalogueId?.replace(/^SCN\//i, "");
  // Area name (not street) reads better at hero scale — street-level detail
  // lives in the park page's "Getting there" section.
  const areaName = address && address.length > 1 ? address[1] : address?.[0];
  const locationChain = [areaName, "London", postcode]
    .filter(Boolean)
    .join(", ")
    .toUpperCase();

  return (
    <div>
      {/* Park name */}
      <div style={{
        fontFamily: "var(--font-display), Arial, sans-serif", fontWeight: 300,
        fontSize: "clamp(3.5rem, 11vw, 9rem)",
        lineHeight: 0.9, color: "#fff",
        textShadow: "0 2px 16px rgba(0,0,0,0.25)",
        marginBottom: 18,
        textTransform: "uppercase", letterSpacing: "0em",
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
              fontFamily: "var(--font-mono)", fontSize: 10.5,
              color: "rgba(255,255,255,0.55)",
              textTransform: "uppercase", letterSpacing: "0.02em",
              marginBottom: 8,
            }}>
              {locationChain}
            </div>
          )}

          {/* Catalogue no. + Scanned — cat. no. inline in front of the pill */}
          {(idNumber || scanned) && (
            <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 8 }}>
              {idNumber && <span className="fbs-hp-tag">{idNumber}</span>}
              {scanned && <span className="fbs-hp-tag">Scanned: {fmtDate(scanned)}</span>}
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
        .fbs-hp-tag {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 10.5px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.25);
          padding: 5px 9px;
        }
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
