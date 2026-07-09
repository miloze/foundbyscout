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
  .pcard-title{
    font-family:var(--pda-font-display); text-transform:uppercase; line-height:0.85;
    letter-spacing:.005em; font-style:italic; font-weight:700;
    font-variation-settings:'wght' 700, 'ital' 1;
    display:block; padding:10px 12px 8px; margin:0;
  }
  .pcard-title .pcard-name{ color:var(--pda-fg); }
  .pcard-title .pcard-postcode{ color:var(--pda-accent); }
  .pcard-row .pcard-title{ font-size:clamp(28px, 6.6vw, 58px); }
  .pcard-map .pcard-title{ font-size:clamp(20px, 5vw, 26px); padding:6px 0 4px; }
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
    font-family:var(--pda-font-display); font-style:italic; font-weight:900; font-variation-settings:'wght' 700;
    color:var(--pda-fg); line-height:1;
    filter:drop-shadow(0 2px 8px rgba(0,0,0,0.45));
    transition:transform .25s var(--pda-ease), color .2s var(--pda-ease);
  }
  .pcard-thumb:hover .pcard-thumb-arrow{ transform:translateX(18px); color:var(--pda-accent); }
  .pcard-thumb-row .pcard-thumb-arrow{ right:20px; bottom:6px; font-size:clamp(70px, 11vw, 130px); }
  .pcard-thumb-map .pcard-thumb-arrow{ right:12px; bottom:0px; font-size:clamp(36px, 8vw, 48px); }
`;

export function ParkCard({
  park, idx, variant, showTags = true, showLocation = true,
}: {
  park: ParkCardPark;
  idx: number;
  variant: "row" | "map";
  showTags?: boolean;
  showLocation?: boolean;
}) {
  const idNumber = getCatalogueIdLabel(park, idx);
  const tags = getParkTags(park);
  const postcodePrefix = park.postcode?.split(" ")[0] ?? "";

  return (
    <div className={`pcard pcard-${variant}`}>
      <div className="pcard-id">{idNumber}/</div>
      <span className="pcard-title">
        <span className="pcard-name">{park.name}/</span>
        {postcodePrefix && <span className="pcard-postcode">{postcodePrefix}/</span>}
      </span>
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
  variant: "row" | "map";
  onClick?: (e: React.MouseEvent) => void;
}) {
  const image = park.directory_image_url || park.hero_image;

  return (
    <div className={`pcard-thumb pcard-thumb-${variant}`} onClick={onClick}>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" loading="lazy" />
      )}
      <span className="pcard-thumb-arrow">&#8594;</span>
    </div>
  );
}
