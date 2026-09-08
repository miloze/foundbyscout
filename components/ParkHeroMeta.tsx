"use client";

import CTAButton from "./CTAButton";
import { catalogueMark } from "@/lib/catalogue";

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
  // "001/", the same mark the park page and every card carry — one helper, so
  // the format cannot drift between them. This carried "(003) /11" until the
  // notations were separated: a featured park on the homepage is not a
  // position in a sequence, so there was no total for the "/11" to be true
  // against. See lib/catalogue.
  const mark = catalogueMark(catalogueId);
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

  // No view-transition names here any more. The park name, catalogue mark and
  // address used to carry park-name/park-cat/park-address-{slug}, matching the
  // park page so the three morphed across the navigation.
  //
  // Two reasons they are gone. The morph read as glitchy in practice — the
  // title flew into place while the destination hero was still resolving
  // behind it, so the one composed thing on screen was the piece that moved.
  // And it was the source of "two <ViewTransition name=...> mounted at the
  // same time": these names and the park page's are identical by design, and
  // an App Router view transition mounts both route trees at once, so React
  // saw two of each. Home to park is a plain crossfade now — see the root
  // timing in app/globals.css.

  return (
    <div>
      {/* fbs-he-* are the homepage entrance's hooks. They carry no styling of
          their own and do nothing unless an ancestor sets data-hero-entrance,
          which only the home hero does on a first visit — see
          components/HeroEntrance. */}
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

      {/* hp-meta row: left fields + CTA right */}
      <div className="fbs-hp-meta">
        <div className="fbs-hpm-left">
          {/* Mark stacked over the metadata chip, each on its own line.
              Inline, the two ran together and the mark read as the start of
              the street address — "003/ Dulwich" parses as a house number.
              The location and scan date used to be two untreated lines sitting
              straight on the photo, which vanished over bright concrete. */}
          {(mark || metaLine) && (
            <div className="fbs-hp-idstack">
              {/* Catalogue number and address line both continue onto the park
                  page. The markup there is different — different classes, a
                  fuller address, the scan date split into its own tag — so
                  these rely on the shared name rather than on matching DOM,
                  which is case (b) of the continuity spec. */}
              {mark && <span className={`${BADGE_CLASS} fbs-he-badge`}>{mark}</span>}
              {metaLine && <span className={`${CHIP_CLASS} fbs-he-chip`}>{metaLine}</span>}
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
        /* Badge over chip, not beside it. Column rather than a wrapped row so
           the two never sit on one line at a wide viewport; flex-start so each
           shrinks to its own content instead of stretching to the wider of the
           two. The 4px gap is deliberately tight — badge and chip are one unit
           identifying this park. */
        .fbs-hp-idstack {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }
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
