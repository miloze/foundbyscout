"use client";

import { useState } from "react";
import CTAButton from "./CTAButton";
import { catalogueMark } from "@/lib/catalogue";

// Shared content model for the map's index column, the map preview cards and
// the grid's tile label — same component renders in all of them so they can't
// drift apart over time.

export type ParkCardPark = {
  slug: string;
  name: string;
  catalogue_id?: string | null;
  sort_order?: number | null;
  brief?: string | null;
  postcode?: string | null;
  address?: string[] | null;
  location: string | null;
  type?: string | null;
  is_free?: boolean | null;
  is_covered?: boolean | null;
  directory_image_url?: string | null;
  hero_image?: string | null;
};

/** "001/", or nothing. See lib/catalogue — identity never comes from an index. */
export function getParkCatalogueMark(park: ParkCardPark): string | undefined {
  return catalogueMark(park.catalogue_id, park.sort_order);
}

/** Tier 3 field notation: "BOWL / DIY / FREE". */
export function getParkTags(park: ParkCardPark): string[] {
  return [park.type, park.is_free ? "Free" : null, park.is_covered ? "Covered" : null]
    .filter(Boolean)
    .map(t => (t as string).toUpperCase());
}

/**
 * Tier 2 field notation: "SE24 / SOUTH LONDON".
 *
 * The postcode used to be a second display-sized token inside the title, in
 * accent, which put two things in the primary slot and spent the brand colour
 * on geography. It belongs with the location — together they are one statement
 * of where this is, and the outward code is the half that identifies the area.
 *
 * Outward code only ("SE24", not "SE24 9BJ"): the full code is a delivery
 * address, and the area is what a reader is placing.
 */
export function getParkPlace(park: ParkCardPark): string {
  const outward = park.postcode?.split(" ")[0] ?? "";
  return [outward, park.location].filter(Boolean).join(" / ").toUpperCase();
}

// Relies on --pda-* custom properties defined on .pda-root (ParksDirectoryAccordion)
// which cascade to ParksMap since it only ever renders nested inside that tree.
export const PARK_CARD_CSS = `
  /* ── Field notation ────────────────────────────────────────────────────
     One information language for every surface that names a park:

       001/  BLOBLANDS            catalogue mark + name   (tier 1)
             SE24 / SOUTH LONDON  postcode / location     (tier 2)
             BOWL / DIY / FREE    type + attributes       (tier 3)
             [ image ]                                    (tier 4, a sibling)

     Metadata is set as survey notation rather than as UI: DM Mono, uppercase,
     wide tracking, slash-separated, and nothing drawn around it.

     WHAT THE COMPONENT OWNS vs WHAT THE LAYOUT OWNS
     The component owns the language — which tiers exist, what they are set in,
     and the order they appear in. The layout owns the scale, through the custom
     properties below.

     That split is what replaced the .pcard-map and .pcard-feature blocks. Those
     two "variants" differed only in type size, weight and vertical rhythm —
     properties of the box a card had been put in, not of the card. A layout now
     states its scale once (see .pms-sheet / .pms-panel in ParksMap) instead of
     the component carrying a class per placement it might be dropped into.

     The defaults below are the index-row / grid-tile scale, which is what
     .pcard-archive used to set. */
  .pcard{ display:block; }
  /* The defaults live as var() fallbacks at each use site, NOT as declarations
     on .pcard. A custom property declared on the element itself beats one
     inherited from an ancestor, so declaring them here would shadow whatever
     .pms-panel or .pms-sheet set and every card would silently render at the
     index-row scale. (Verified the hard way: the desktop panel came back as
     18px/700 with the declarations in place.) Fallbacks inherit properly and
     still document the default at the point it is used. */

  /* Tier 1a — the catalogue mark. Accent everywhere, in every density: orange
     is catalogue identity and the primary action, and nothing else. */
  .pcard-id{
    font-family:var(--pda-font-mono); font-size:11px; font-weight:500;
    letter-spacing:.08em; text-transform:uppercase; color:var(--pda-accent);
    display:block; padding:0;
  }
  /* Tier 1b — the park name. */
  .pcard-title{
    font-family:var(--pda-font-display); text-transform:uppercase;
    font-size:var(--pcard-title-size, 18px); line-height:1.15; letter-spacing:.005em;
    font-weight:var(--pcard-title-weight, 700);
    font-variation-settings:'wght' var(--pcard-title-weight, 700);
    display:block; padding:0; margin:var(--pcard-mark-gap, 5px) 0 0;
  }
  .pcard-title .pcard-name{ color:var(--pda-fg); }
  /* Tier 2 — postcode and location, one statement of where this is. The class
     name is kept from when this was the Rubik location line, because the grid's
     density rules select on it. */
  .pcard-location{
    font-family:var(--pda-font-mono); font-size:var(--pcard-place-size, 11px);
    line-height:1.4; letter-spacing:var(--pcard-place-tracking, .08em);
    text-transform:uppercase; color:var(--pda-muted);
    display:block; padding:0; margin-top:var(--pcard-place-gap, 6px);
  }
  /* Tier 3 — sits tight under the place line so the two read as one block of
     annotation beneath the name rather than as two separate rows. */
  .pcard-tags{
    font-family:var(--pda-font-mono); font-size:10px; line-height:1.4;
    letter-spacing:.1em; text-transform:uppercase; color:var(--pda-muted);
    display:block; margin-top:3px;
  }
  /* Compact density — the single-line treatment a card takes when it is a cell
     in a flex row rather than a block: the name takes whatever width is left
     and ellipsises instead of wrapping the row open. These three rules lived in
     ParksMap as .pms-card-mini descendant selectors reaching into .pcard-*
     internals. They belong to the density, not to that one layout. */
  .pcard-compact{ min-width:0; }
  .pcard-compact .pcard-title{ display:flex; min-width:0; }
  .pcard-compact .pcard-name{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

  /* Tier 4 — the image. A sibling of the card rather than a tier inside it,
     because its position genuinely differs by layout: a banner above the text,
     a square beside it, or absent. A layout composes it; no prop implies it. */
  .pcard-thumb{ position:relative; overflow:hidden; cursor:pointer; background:var(--pda-bg); }
  .pcard-thumb img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; transition:filter .2s var(--pda-ease); }
  /* Colour, not greyscale — see the note in ParksGridView. Hover keeps a
     gentle lift so the thumbnail still reads as clickable. */
  .pcard-thumb:hover img{ filter:brightness(1.06); }
  .pcard-thumb-map{ aspect-ratio:16 / 10; margin-top:12px; }
  /* Image flush to the card edges. Nothing overlays the photo: navigation is
     the explicit VIEW PARK button. */
  .pcard-thumb-feature{ aspect-ratio: 16 / 9; margin-top:0; }
  /* The collapsed mobile peek's photographic strip: a fixed shallow height
     rather than a ratio, because what matters is how much map it costs, not
     what shape the frame is. object-position sits a little above centre —
     park photography puts the terrain in the middle band and sky or car park
     at the top, and there is no per-park focal point in the schema to read. */
  .pcard-thumb-peek{ height:var(--pcard-peek-image-h, 80px); margin:0; }
  .pcard-thumb-peek img{ object-position:center 45%; }
  /* The desktop strip's thumbnail — sized off the strip's own height. */
  .pcard-thumb-strip{ height:100%; aspect-ratio:16 / 10; margin:0; }
  .pcard-thumb-strip img{ object-position:center 45%; }

  /* The one CTA, and it is the site's CTA — CTAButton / .fbs-cta, the same
     object as VIEW SCAN and EXPLORE, differing only in its label. All this rule
     owns is where the button sits. Deliberately no flex sizing: a card must
     never be the thing reserving width away from the park name. Where a row
     still pins the button (.pms-card-mini), that is the layout's rule and the
     layout's problem to solve. */
  .pcard-cta-row{ display:block; margin-top:14px; }
`;

/**
 * Density — how much of the field notation a card shows.
 *
 *   compact   tier 1     mark + name
 *   standard  tiers 1-2  + postcode / location
 *   expanded  tiers 1-3  + attributes
 *
 * Geography is tier 2 and belongs to every density above compact, whatever the
 * card has been placed in. That is the point of the ladder: "where is this" was
 * previously tied to a `variant`, so both condensed map cards dropped it while
 * keeping the image and the button — on a map.
 *
 * Tier 4, the image, is deliberately not in here; see the note on .pcard-thumb.
 *
 * There was a tier 5, the park's one-line brief, and an `omit` escape hatch for
 * two cards that sat off the ladder. Both are gone: the bottom strip and the
 * mobile sheet that replaced those cards show no brief, so nothing renders it
 * and no call site needs an exception. The ladder is now the whole API.
 */
export type ParkCardDensity = "compact" | "standard" | "expanded";

const TIERS: Record<ParkCardDensity, { place: boolean; tags: boolean }> = {
  compact:  { place: false, tags: false },
  standard: { place: true,  tags: false },
  expanded: { place: true,  tags: true  },
};

export function ParkCard({
  park, density,
}: {
  park: ParkCardPark;
  density: ParkCardDensity;
}) {
  const mark = getParkCatalogueMark(park);
  const tags = getParkTags(park);
  const place = getParkPlace(park);
  const show = TIERS[density];

  return (
    <div className={`pcard pcard-${density}`}>
      {/* No mark rather than an invented one — see catalogueMark. */}
      {mark && <div className="pcard-id">{mark}</div>}
      <span className="pcard-title">
        <span className="pcard-name">{park.name}</span>
      </span>
      {show.place && place && <div className="pcard-location">{place}</div>}
      {show.tags && tags.length > 0 && (
        <div className="pcard-tags">{tags.join(" / ")}</div>
      )}
    </div>
  );
}

// Tier 4. Kept a separate component rather than folded into ParkCard: the image
// sits above the text in the mobile sheet, above the padded block in the desktop
// panel, and beside the name in both condensed rows, so where it goes is the
// layout's call. That also means image visibility is already independent of
// density, rather than being assumed because something is a "feature" card.
export function ParkCardThumbnail({
  park, variant, onClick,
}: {
  park: Pick<ParkCardPark, "directory_image_url" | "hero_image">;
  /** The frame's shape, not the card's rank. */
  variant: "map" | "feature" | "mini" | "peek" | "strip";
  onClick?: (e: React.MouseEvent) => void;
}) {
  const image = park.directory_image_url || park.hero_image;
  // Several published parks carry a directory_image_url pointing at a file that
  // does not exist, so the `||` fallback never fires — the URL is present, it
  // just 404s. That used to cost nothing; it costs an empty 80px band now that
  // the collapsed peek leads with the photograph. Rendering nothing is honest,
  // and the sheet closes up around it rather than framing a hole.
  // Reset on a new image by adjusting state during render rather than in an
  // effect — the same pattern ParksGridView uses for its sheet key. An effect
  // would commit one frame with the previous park's failure still latched, so
  // a working photograph would flash absent when you selected the park after
  // a broken one.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [lastSrc, setLastSrc] = useState(image);
  if (image !== lastSrc) {
    setLastSrc(image);
    setFailedSrc(null);
  }
  if (!image || failedSrc === image) return null;

  return (
    <div className={`pcard-thumb pcard-thumb-${variant}`} onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" loading="lazy" onError={() => setFailedSrc(image)} />
    </div>
  );
}

// The single "go to this park" control, shared by both map cards.
// stopPropagation because the map cards are themselves click-to-navigate —
// without it the parent handler fires the same push twice. CTAButton runs it
// before following the href.
export function ParkCardCTA({ slug }: { slug: string }) {
  return (
    <div className="pcard-cta-row">
      <CTAButton label="View park" href={`/parks/${slug}`} onClick={e => e.stopPropagation()} />
    </div>
  );
}
