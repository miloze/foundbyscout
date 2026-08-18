"use client";

import CTAButton from "./CTAButton";
import ViewTransitionBoundary from "./ViewTransitionBoundary";
import { heroTransitionNames } from "@/lib/view-transitions";

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

// Chip fill under the hero metadata. The catalogue badge always takes the
// opposite fill, so the pair reads as one inverted set rather than two
// unrelated tags. Flip this one constant to swap both at once.
//
// The `as` is load-bearing, not decoration: with a plain `const X: ChipVariant
// = "dark"`, TypeScript narrows the declared type to the initialiser, so both
// comparisons below read as provably false and `next build` fails the type
// check on them. `next dev` doesn't type check, so this only ever surfaced in
// a production build.
type ChipVariant = "dark" | "beige";
const CHIP_VARIANT = "dark" as ChipVariant;
const CHIP_CLASS = CHIP_VARIANT === "beige" ? "fbs-hp-chip fbs-hp-chip--inv" : "fbs-hp-chip";
const BADGE_CLASS = CHIP_VARIANT === "beige" ? "fbs-hp-chip" : "fbs-hp-chip fbs-hp-chip--inv";

export default function ParkHeroMeta({ catalogueId, name, address, postcode, opened, scanned, slug }: Props) {
  const idNumber = catalogueId?.replace(/^SCN\//i, "");
  // Area name (not street) reads better at hero scale — street-level detail
  // lives in the park page's "Getting there" section.
  const areaName = address && address.length > 1 ? address[1] : address?.[0];
  // One condensed line. "London" and the postcode are gone: the postcode area
  // is already the circle badge on this hero, and the city was never doing
  // work at this size.
  const metaLine = [areaName, scanned && `Scanned ${fmtDate(scanned)}`]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();

  // Only the featured park has a slug, and only it can be navigated into, so
  // the transition identities exist only when there's a destination.
  const vt = slug ? heroTransitionNames(slug) : null;

  return (
    <div>
      {/* Park name — the anchor of the hero → park page transition. It keeps
          its identity across the navigation and repositions/resizes into the
          park hero's layout rather than being unmounted and rebuilt. */}
      <ViewTransitionBoundary name={vt?.name}>
      {/* fbs-he-* are the homepage entrance's hooks. They carry no styling of
          their own and do nothing unless an ancestor sets data-hero-entrance,
          which only the home hero does on a first visit — see
          components/HeroEntrance. ViewTransitionBoundary renders no element of
          its own, so they have to sit on the real nodes. */}
      <div className="fbs-he-title" style={{
        fontFamily: "var(--font-display), Arial, sans-serif", fontWeight: 300,
        fontStyle: "italic",
        fontSize: "clamp(3.5rem, 11vw, 9rem)",
        lineHeight: 0.9, color: "#fff",
        // No text-shadow: the blur panel behind the hero copy now carries the
        // contrast, and the shadow only softened the italic's edges.
        marginBottom: 18,
        textTransform: "uppercase", letterSpacing: "0em",
      }}>
        {name}
      </div>
      </ViewTransitionBoundary>

      {/* hp-meta row: left fields + CTA right */}
      <div className="fbs-hp-meta">
        <div className="fbs-hpm-left">
          {/* Catalogue no. + metadata chip — one row. The location and scan
              date used to be two untreated lines sitting straight on the
              photo, which vanished over bright concrete. */}
          {(idNumber || metaLine) && (
            <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* Catalogue number and address line both continue onto the park
                  page. The markup there is different — different classes, a
                  fuller address, the scan date split into its own tag — so
                  these rely on the shared name rather than on matching DOM,
                  which is case (b) of the continuity spec. */}
              {idNumber && (
                <ViewTransitionBoundary name={vt?.catalogue}>
                  <span className={`${BADGE_CLASS} fbs-he-badge`}>{idNumber}</span>
                </ViewTransitionBoundary>
              )}
              {metaLine && (
                <ViewTransitionBoundary name={vt?.address}>
                  <span className={`${CHIP_CLASS} fbs-he-chip`}>{metaLine}</span>
                </ViewTransitionBoundary>
              )}
            </div>
          )}
        </div>

        {/* CTA — the arrow lives in the button text, not as a separate glyph.
            The standalone ↘ that briefly sat above this is gone: it duplicated
            this link's destination and never sat right at any size.
            Shared with the EXPLORE CTA further down the homepage; all of its
            styling and interaction lives in .fbs-cta. */}
        {slug && <CTAButton label="View scan" href={`/parks/${slug}`} />}
      </div>

      <style>{`
        .fbs-hp-meta {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
        }
        .fbs-hpm-left { flex: 1; min-width: 0; }
        /* Metadata chip and catalogue badge share every dimension — the badge
           is the same chip with the fill and text swapped, so the two match in
           height and sit as one unit. Solid fill, not a blur or a full-width
           scrim: both of those were tried on this hero and reversed. Radius is
           kept square rather than reading as a pill. */
        .fbs-hp-chip {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
          padding: 3px 8px;
          border-radius: 3px;
          background: rgba(20,18,15,0.82);
          color: #F3EFEC;
        }
        .fbs-hp-chip--inv {
          background: rgba(243,239,236,0.82);
          color: #14120f;
        }
        /* The CTA's own styling is in globals.css under .fbs-cta — it is
           shared with EXPLORE. Only this hero's layout of it belongs here. */
        @media (max-width: 767px) {
          .fbs-hp-meta { flex-direction: column; align-items: stretch; gap: 10px; }
          .fbs-hp-meta .fbs-cta { align-self: flex-start; }
        }
      `}</style>
    </div>
  );
}
