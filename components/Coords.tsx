import type { ReactNode } from "react";

/**
 * The park's position, as a link to it on a map.
 *
 * Extracted from ParkHeroDetails, which invented this treatment, so the park
 * profile and the homepage's Found Object print a position the same way rather
 * than two components each deciding what a coordinate looks like.
 *
 * What is shared is the *formatting* and the link — the decimal places, the
 * hemisphere letters, the separator, the Maps href, tabular figures. What is
 * not shared is the surface: each consumer passes its own className, so the
 * profile keeps the dark chip it already had (styled by ParkHeroDetails, whose
 * CSS this deliberately does not move) and Found Object sets it as bare mono
 * alongside its other field notation. Extracting the appearance too would have
 * meant restyling a signed-off hero to suit a new caller.
 *
 * Four decimal places is the existing notation and is kept as-is. It is not a
 * claim about how accurately the park was located.
 */

/** Supabase numerics can arrive as strings; a coordinate of 0 is a real place. */
function toNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

export function formatCoords(lat: number, lng: number): string {
  return (
    `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ` +
    `${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`
  );
}

type Props = {
  lat: number | string | null | undefined;
  lng: number | string | null | undefined;
  /** The consumer's own surface treatment. */
  className?: string;
  /** Wraps the anchor — used by the profile for its view-transition boundary. */
  wrap?: (node: ReactNode) => ReactNode;
};

export default function Coords({ lat, lng, className, wrap }: Props) {
  const la = toNumber(lat);
  const ln = toNumber(lng);
  // Both or neither. A single axis is not a position, and printing one would
  // be worse than printing nothing.
  if (la === null || ln === null) return null;

  const node = (
    <a
      href={`https://maps.google.com/?q=${la},${ln}`}
      target="_blank"
      rel="noopener noreferrer"
      className={["fbs-coords", className].filter(Boolean).join(" ")}
    >
      {formatCoords(la, ln)}
    </a>
  );

  return (
    <>
      {wrap ? wrap(node) : node}
      <style>{CSS}</style>
    </>
  );
}

/* Only what every use of a coordinate needs, whatever surface it sits on.
   Tabular figures so the digits hold a column and a value does not change
   width between parks. No backticks inside. */
const CSS = `
.fbs-coords{
  font-family:var(--font-mono), monospace;
  font-variant-numeric:tabular-nums;
  font-feature-settings:"tnum" 1;
}
`;
