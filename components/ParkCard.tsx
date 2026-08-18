"use client";

import Link from "next/link";

// Shared content model for the Parks Directory accordion row and the map
// preview card, per the "Map View Card" handover — same component renders
// in both contexts so they can't drift apart over time.

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

export function getCatalogueIdLabel(park: ParkCardPark, idx: number): string {
  return park.catalogue_id?.replace(/^SCN\//i, "").trim()
    || String(park.sort_order ?? idx + 1).padStart(3, "0");
}

export function getParkTags(park: ParkCardPark): string[] {
  return [park.type, park.is_free ? "Free" : null, park.is_covered ? "Covered" : null].filter(Boolean) as string[];
}

export function getParkAddressChain(park: ParkCardPark): string {
  const postcodePrefix = park.postcode?.split(" ")[0] ?? "";
  return [park.address?.[0], park.location, postcodePrefix].filter(Boolean).join(" / ").toUpperCase();
}

// Relies on --pda-* custom properties defined on .pda-root (ParksDirectoryAccordion)
// which cascade to ParksMap since it only ever renders nested inside that tree.
export const PARK_CARD_CSS = `
  /* ── One type scale for every surface ──────────────────────────────────
     The base rules below ARE the "Scout Archive Accordion" treatment: mono
     catalogue no. on top, display name, Rubik location under it, no filled
     boxes. The mobile accordion trigger, the desktop split-list row and the
     cards over the map all render from these; variants only override size
     and colour, never the family or the rhythm. Nothing here owns outer
     padding — wrappers (.pda-trigger-content, .pms-index-row, the map card)
     do, so one scale can serve differently-spaced containers. */
  /* Mono metadata tier — catalogue no., tags, address. One size for all three
     so they read as the same rank beneath the name. 11px is the top of the
     spec's 10–11px band; 10px sat too quiet next to an 18px name. */
  .pcard-id{
    font-family:var(--pda-font-mono); font-size:11px; font-weight:500;
    letter-spacing:.08em; text-transform:uppercase; color:var(--pda-muted);
    display:block; padding:0;
  }
  .pcard-title{
    font-family:var(--pda-font-display); text-transform:uppercase;
    font-size:18px; line-height:1.15; letter-spacing:.005em;
    font-weight:700; font-variation-settings:'wght' 700;
    display:block; padding:0; margin:5px 0 0;
  }
  .pcard-title .pcard-name{ color:var(--pda-fg); }
  .pcard-title .pcard-postcode{ color:var(--pda-accent); }
  .pcard-location{
    font-family:var(--pda-font-ui); font-size:12px; line-height:1.4;
    color:var(--pda-muted); display:block; padding:0; margin-top:4px;
  }
  .pcard-address{
    font-family:var(--pda-font-mono); font-size:11px; letter-spacing:.08em;
    text-transform:uppercase; color:var(--pda-muted);
    display:block; padding:0; margin-top:6px;
  }
  /* The park's one-line brief. Same rule serves the accordion drawer and the
     desktop map card, so the two read as the same piece of copy. */
  .pcard-brief{
    font-family:var(--pda-font-ui); font-size:13px; line-height:1.6;
    color:var(--pda-muted); margin:10px 0 0;
  }
  .pcard-tags{ display:flex; gap:6px; flex-wrap:wrap; margin-top:12px; }
  /* Informational register — see .fbs-meta-tag in globals.css. Unfilled and
     pill-shaped rather than the solid panel box this used to be, so tags read
     alongside the catalogue no. and address rather than as controls. Scoped
     --pda-* rather than the global token because this card renders inside the
     directory's own palette. */
  .pcard-tag{
    display:inline-flex; align-items:center;
    font-family:var(--pda-font-mono); font-size:10px; letter-spacing:.1em;
    text-transform:uppercase; color:var(--pda-muted); line-height:1;
    white-space:nowrap;
    background:transparent; border:1px solid var(--pda-line);
    border-radius:999px; padding:4px 9px;
  }

  /* Archive row — mobile accordion trigger and desktop split-list row.
     Identical markup and type on both; only the wrapper differs. */
  .pcard-archive{ display:block; }

  /* Cards over the map — same scale, tightened for an overlay. */
  .pcard-map .pcard-id{ color:var(--pda-accent); }
  .pcard-map .pcard-title{ font-size:clamp(18px, 4.5vw, 22px); }
  .pcard-map .pcard-tags{ margin:12px 0 4px; }

  .pcard-thumb{ position:relative; overflow:hidden; cursor:pointer; background:var(--pda-bg); }
  .pcard-thumb img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:grayscale(1) contrast(1.05) brightness(0.88); transition:filter .2s var(--pda-ease); }
  .pcard-thumb:hover img{ filter:brightness(1.15) grayscale(1) contrast(1.05); }
  .pcard-thumb-map{ aspect-ratio:16 / 10; margin-top:12px; }
  /* Feature: large image-led card — desktop map split view. Image flush to
     the card edges. Nothing overlays the photo: navigation is the explicit
     VIEW PARK button below it, same as the accordion drawer. */
  .pcard-thumb-feature{ aspect-ratio: 16 / 9; margin-top:0; }

  /* The one CTA. Rendered identically by the accordion drawer, the mobile map
     card and the desktop split card — same label, font, case and colour, so
     "go to this park" looks the same wherever it appears. */
  .pcard-cta{
    display:inline-flex; align-items:center; gap:7px; align-self:flex-start;
    width:fit-content;
    background:var(--pda-accent); color:#fff;
    font-family:var(--pda-font-ui); font-size:12px; font-weight:500;
    letter-spacing:.08em; text-transform:uppercase; line-height:1;
    padding:10px 14px; margin-top:14px;
    transition:background .18s ease, transform .18s ease;
  }
  .pcard-cta:hover{ background:var(--pda-accent-hover); transform:translateY(-1px); }
  .pcard-cta:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:3px; }
  .pcard-cta svg{ flex-shrink:0; }
  .pcard-feature .pcard-id{ color:var(--pda-accent); font-size:11px; padding:0; margin-bottom:2px; }
  .pcard-feature .pcard-title{ padding:0; margin:0 0 4px; }
  .pcard-feature .pcard-title .pcard-name{ font-size:clamp(20px, 2.2vw, 26px); font-weight:500; }
  .pcard-feature .pcard-title .pcard-postcode{ font-size:clamp(20px, 2.2vw, 26px); font-weight:500; }
  .pcard-feature .pcard-location{ padding:0; margin:0; font-size:10px; }
`;

export function ParkCard({
  park, idx, variant, showTags = true, showLocation = true, showAddress = false, showBrief = false,
}: {
  park: ParkCardPark;
  idx: number;
  variant: "archive" | "map" | "feature";
  showTags?: boolean;
  showLocation?: boolean;
  showAddress?: boolean;
  showBrief?: boolean;
}) {
  const idNumber = getCatalogueIdLabel(park, idx);
  const tags = getParkTags(park);
  const postcodePrefix = park.postcode?.split(" ")[0] ?? "";
  const chain = showAddress ? getParkAddressChain(park) : "";

  return (
    <div className={`pcard pcard-${variant}`}>
      <div className="pcard-id">{idNumber}/</div>
      <span className="pcard-title">
        <span className="pcard-name">{park.name}/</span>
        {postcodePrefix && <span className="pcard-postcode">{postcodePrefix}/</span>}
      </span>
      {showAddress && chain && <span className="pcard-address">{chain}</span>}
      {showTags && tags.length > 0 && (
        <div className="pcard-tags">
          {tags.map(t => <span key={t} className="pcard-tag">{t}</span>)}
        </div>
      )}
      {showLocation && park.location && <div className="pcard-location">{park.location}</div>}
      {showBrief && park.brief && <p className="pcard-brief">{park.brief}</p>}
    </div>
  );
}

// Full-span directory/hero image. Nothing is overlaid on the photo — every
// surface navigates through the explicit ParkCardCTA button instead.
export function ParkCardThumbnail({
  park, variant, onClick,
}: {
  park: Pick<ParkCardPark, "directory_image_url" | "hero_image">;
  variant: "map" | "feature";
  onClick?: (e: React.MouseEvent) => void;
}) {
  const image = park.directory_image_url || park.hero_image;

  return (
    <div className={`pcard-thumb pcard-thumb-${variant}`} onClick={onClick}>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" loading="lazy" />
      )}
    </div>
  );
}

// The single "go to this park" control, shared by the accordion drawer and
// both map cards. stopPropagation because the map cards are themselves
// click-to-navigate — without it the parent handler fires the same push twice.
export function ParkCardCTA({ slug }: { slug: string }) {
  return (
    <Link href={`/parks/${slug}`} className="pcard-cta" onClick={e => e.stopPropagation()}>
      View park
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
