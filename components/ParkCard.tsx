"use client";

// Shared content model for the Parks Directory accordion row and the map
// preview card, per the "Map View Card" handover — same component renders
// in both contexts so they can't drift apart over time.

export type ParkCardPark = {
  slug: string;
  name: string;
  catalogue_id?: string | null;
  sort_order?: number | null;
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
  .pcard-id{
    font-family:var(--pda-font-mono); font-size:12px; color:var(--pda-muted);
    letter-spacing:.02em; font-weight:500;
    display:block; width:fit-content; padding:2px 7px;
  }
  /* Map card: catalogue no. sized to match the address line below it, coral like the postcode */
  .pcard-map .pcard-id{ color:var(--pda-accent); font-size:10px; }
  .pcard-map .pcard-address{ margin:2px 0 8px; padding:0; }
  .pcard-title{
    font-family:var(--pda-font-display); text-transform:uppercase; line-height:0.85;
    letter-spacing:.005em; font-weight:700;
    font-variation-settings:'wght' 700;
    display:block; padding:10px 12px 8px; margin:0;
  }
  .pcard-title .pcard-name{ color:var(--pda-fg); }
  .pcard-title .pcard-postcode{ color:var(--pda-accent); }
  .pcard-row .pcard-title{ font-size:clamp(28px, 6.6vw, 58px); }
  .pcard-map .pcard-title{ font-size:clamp(20px, 5vw, 26px); padding:6px 0 4px; }
  /* Index: compact desktop split-list row — scan-and-pick, not sell-the-park.
     Stacked: cat. no. above name, shortened area below — full address lives
     in the map's detail card instead, per the split-list spec. */
  .pcard-index{ display:block; padding:12px 14px; }
  .pcard-index .pcard-id{ padding:0; margin-bottom:4px; font-size:10px; }
  .pcard-index .pcard-title{ padding:0; margin:0; display:block; }
  .pcard-index .pcard-title .pcard-name{ font-size:16px; line-height:1.2; }
  .pcard-index .pcard-title .pcard-postcode{ font-size:16px; line-height:1.2; }
  .pcard-index .pcard-location{ padding:0; margin-top:3px; font-size:9px; }
  .pcard-tags{ display:flex; gap:6px; flex-wrap:wrap; }
  .pcard-row .pcard-tags{ padding:0 12px; margin:4px 0 2px; }
  .pcard-map .pcard-tags{ margin:0 0 8px; }
  .pcard-tag{
    font-family:var(--pda-font-mono); font-size:9px; letter-spacing:.08em; text-transform:uppercase;
    color:var(--pda-muted); border:1px solid var(--pda-line); padding:2px 7px;
  }
  .pcard-location{
    font-family:var(--pda-font-mono); font-size:10px; letter-spacing:.03em; text-transform:uppercase;
    color:var(--pda-address); display:block; width:fit-content;
  }
  .pcard-row .pcard-location{ padding:3px 12px; margin-top:2px; }
  .pcard-map .pcard-location{ padding:0; margin-bottom:10px; }
  .pcard-address{
    font-family:var(--pda-font-mono); font-size:10px; letter-spacing:.03em; text-transform:uppercase;
    color:var(--pda-address); display:block; width:fit-content; padding:3px 7px; margin-top:8px;
    transition:background .3s var(--pda-ease), color .3s var(--pda-ease);
  }
  .pcard-address-inline{ margin-top:0; }
  .pcard-tags-preimage{ margin:0 0 10px; }
  .pcard-thumb{ position:relative; overflow:hidden; cursor:pointer; background:var(--pda-bg); }
  .pcard-thumb img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:grayscale(1) contrast(1.05) brightness(0.88); transition:filter .2s var(--pda-ease); }
  .pcard-thumb:hover img{ filter:brightness(1.15) grayscale(1) contrast(1.05); }
  .pcard-thumb-row{ height:230px; margin-top:16px; }
  .pcard-thumb-map{ height:130px; margin-top:12px; }
  .pcard-thumb-arrow{
    position:absolute; z-index:2;
    font-family:var(--pda-font-display); font-weight:900; font-variation-settings:'wght' 700;
    color:var(--pda-fg); line-height:1;
    filter:drop-shadow(0 2px 8px rgba(0,0,0,0.45));
    transition:transform .25s var(--pda-ease), color .2s var(--pda-ease);
  }
  .pcard-thumb:hover .pcard-thumb-arrow{ transform:translateX(18px); color:var(--pda-accent); }
  .pcard-thumb-row .pcard-thumb-arrow{ right:20px; bottom:6px; font-size:clamp(70px, 11vw, 130px); }
  .pcard-thumb-map .pcard-thumb-arrow{ right:12px; bottom:0px; font-size:clamp(36px, 8vw, 48px); }

  /* Feature: large image-led card — desktop map split view. Image flush to
     the card edges (55–60% of card height via aspect-ratio), on-photo
     circular CTA button rather than the row/map variants' giant text arrow. */
  .pcard-thumb-feature{ aspect-ratio: 16 / 9; margin-top:0; }
  .pcard-cta{
    position:absolute; z-index:2; bottom:12px; right:12px;
    width:36px; height:36px; border-radius:50%;
    background:var(--pda-accent); color:#fff;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 14px rgba(0,0,0,0.35);
    transition:transform .2s var(--pda-ease);
  }
  .pcard-thumb:hover .pcard-cta{ transform:scale(1.08); }
  .pcard-feature .pcard-id{ color:var(--pda-accent); font-size:11px; padding:0; margin-bottom:2px; }
  .pcard-feature .pcard-title{ padding:0; margin:0 0 4px; }
  .pcard-feature .pcard-title .pcard-name{ font-size:clamp(20px, 2.2vw, 26px); font-weight:500; }
  .pcard-feature .pcard-title .pcard-postcode{ font-size:clamp(20px, 2.2vw, 26px); font-weight:500; }
  .pcard-feature .pcard-location{ padding:0; margin:0; font-size:10px; }
`;

export function ParkCard({
  park, idx, variant, showTags = true, showLocation = true, showAddress = false,
}: {
  park: ParkCardPark;
  idx: number;
  variant: "row" | "map" | "index" | "feature";
  showTags?: boolean;
  showLocation?: boolean;
  showAddress?: boolean;
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
    </div>
  );
}

// Full-span directory/hero image with the nav-to-park-page arrow overlaid in
// the corner, instead of pushed below as a separate element. Image and arrow
// are one click target, independent of whatever toggles the row/card itself.
export function ParkCardThumbnail({
  park, variant, onClick,
}: {
  park: Pick<ParkCardPark, "directory_image_url" | "hero_image">;
  variant: "row" | "map" | "feature";
  onClick?: (e: React.MouseEvent) => void;
}) {
  const image = park.directory_image_url || park.hero_image;

  return (
    <div className={`pcard-thumb pcard-thumb-${variant}`} onClick={onClick}>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" loading="lazy" />
      )}
      {variant === "feature" ? (
        <span className="pcard-cta" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      ) : (
        <span className="pcard-thumb-arrow">&#8594;</span>
      )}
    </div>
  );
}
