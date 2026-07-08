"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ── Local preview component ──────────────────────────────────────────────
// Ported from the "Parks Directory" prototype handoff. Uses coral (--accent)
// as confirmed by the handoff notes — yellow was the earlier exploration,
// coral is now the settled choice for this page.
//
// Open decisions carried over from the handoff (not resolved here):
//  - bare catalogue number vs. "SCN/" prefix (see idNumber below)
//  - conditions (ParkWeather) tag omitted, as in the prototype
//  - coordinates omitted from the title line
//  - colours below are prototype approximations, not confirmed brand tokens
//  - MSCHN isn't licensed for production; it's wired up here for LOCAL
//    TESTING ONLY via a @font-face pointing at public/fonts/MSCHN.* — do
//    not commit/push an actual MSCHN font file. Falls back to bold italic
//    Rubik (--pda-font-display) if the file isn't present.

type ParkRow = {
  id: string;
  slug: string;
  name: string;
  postcode: string | null;
  address: string[] | null;
  location: string | null;
  catalogue_id: string | null;
  hero_image: string | null;
  lat: number | null;
  lng: number | null;
  opened: string | null;
  sort_order: number | null;
};

type SortMode = "az" | "date" | "nearest";

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function parseOpenedForSort(opened: string | null): number {
  if (!opened) return -Infinity;
  const parts = opened.trim().split(/\s+/);
  if (parts.length === 2) {
    const m = MONTHS[parts[0].toLowerCase()];
    const y = parseInt(parts[1], 10);
    if (m !== undefined && !Number.isNaN(y)) return Date.UTC(y, m, 1);
  }
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) return Date.UTC(parseInt(parts[0], 10), 0, 1);
  return -Infinity;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const imgFilter = "grayscale(1) contrast(1.05) brightness(0.88)";

export default function ParksDirectoryAccordion() {
  const router = useRouter();
  const [parks, setParks] = useState<ParkRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("az");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    import("@supabase/supabase-js").then(({ createClient }) => {
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      db.from("parks")
        .select("id, slug, name, postcode, address, location, catalogue_id, hero_image, lat, lng, opened, sort_order")
        .eq("published", true)
        .order("sort_order", { ascending: true })
        .then(({ data }) => { if (data) setParks(data as ParkRow[]); });
    });
  }, []);

  const handleSort = (mode: SortMode) => {
    setSortMode(mode);
    if (mode === "nearest" && !userCoords && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  };

  const displayedParks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = !q ? parks : parks.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.location ?? "").toLowerCase().includes(q) ||
      (p.postcode ?? "").toLowerCase().includes(q) ||
      (p.address ?? []).some(a => a.toLowerCase().includes(q))
    );

    const sorted = [...filtered];
    if (sortMode === "az") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "date") {
      sorted.sort((a, b) => parseOpenedForSort(b.opened) - parseOpenedForSort(a.opened));
    } else if (sortMode === "nearest" && userCoords) {
      sorted.sort((a, b) => {
        const da = a.lat != null && a.lng != null ? haversine(userCoords.lat, userCoords.lng, a.lat, a.lng) : Infinity;
        const db = b.lat != null && b.lng != null ? haversine(userCoords.lat, userCoords.lng, b.lat, b.lng) : Infinity;
        return da - db;
      });
    }
    return sorted;
  }, [parks, search, sortMode, userCoords]);

  const goToPark = (slug: string) => router.push(`/parks/${slug}`);

  return (
    <div className="pda-root">
      <style>{`
        /* MSCHN — local testing only, not licensed for production.
           Drop the file at public/fonts/MSCHN.<ext> (whichever format you
           have); the multiple src formats below let the browser pick
           whichever one actually exists. Falls back to Rubik if absent. */
        @font-face{
          font-family:'MSCHN';
          src: url('/fonts/MSCHN.woff2') format('woff2'),
               url('/fonts/MSCHN.woff') format('woff'),
               url('/fonts/MSCHN.otf') format('opentype'),
               url('/fonts/MSCHN.ttf') format('truetype');
          font-weight:300 700;
          font-style:normal;
          font-display:swap;
        }
        .pda-root{
          --pda-bg:#0a0a0a; --pda-panel:#141412; --pda-fg:#f7f7f2;
          --pda-address:#9d9d95; --pda-muted:#6f6f68; --pda-line:#232320;
          --pda-accent:var(--accent, #ff5841); --pda-ink:#0a0a0a;
          --pda-ease: cubic-bezier(0.16, 1, 0.3, 1);
          --pda-font-mono: 'DM Mono', ui-monospace, monospace;
          --pda-font-ui: 'Rubik', Arial, sans-serif;
          --pda-font-display: 'MSCHN', 'Rubik', Arial, sans-serif; /* falls back to Rubik if MSCHN.* isn't present */
          background:var(--pda-bg); color:var(--pda-fg);
          font-family:var(--pda-font-ui); -webkit-font-smoothing:antialiased;
        }
        .pda-wrap{ max-width:860px; margin:0 auto; padding:0 24px 100px; }
        .pda-bar{ position:sticky; top:0; z-index:5; background:var(--pda-bg); padding:24px 0 16px; }
        .pda-search-row{ display:flex; align-items:center; gap:10px; border:1px solid var(--pda-line); background:var(--pda-panel); padding:12px 16px; }
        .pda-search-row svg{ width:15px; height:15px; opacity:.6; flex-shrink:0; }
        .pda-search-row input{ flex:1; width:100%; background:none; border:none; outline:none; color:var(--pda-accent); font-family:var(--pda-font-mono); font-size:16px; text-transform:uppercase; letter-spacing:.03em; }
        .pda-search-row input::placeholder{ color:var(--pda-accent); opacity:.5; }
        .pda-filter-row{ display:flex; justify-content:space-between; align-items:center; margin-top:12px; flex-wrap:wrap; gap:8px; font-family:var(--pda-font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.03em; }
        .pda-filter-row .pda-sub{ color:var(--pda-muted); }
        .pda-sort-controls{ display:flex; gap:16px; }
        .pda-sort-controls button{ background:none; border:none; color:var(--pda-muted); font-family:var(--pda-font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.03em; cursor:pointer; padding:2px 0 4px; border-bottom:1px solid transparent; transition:color .15s var(--pda-ease), border-color .15s var(--pda-ease); }
        .pda-sort-controls button.pda-active, .pda-sort-controls button:hover{ color:var(--pda-accent); border-color:var(--pda-accent); }

        .pda-row{ border-bottom:1px solid var(--pda-line); }
        .pda-row-head{ padding:20px 20px 18px; }
        .pda-row-head-btn{ cursor:pointer; }
        .pda-cat-id{
          font-family:var(--pda-font-mono); font-size:12px; color:var(--pda-muted);
          letter-spacing:.02em; font-weight:500;
          display:block; width:fit-content; padding:2px 7px; margin-bottom:0;
          transition:background .3s var(--pda-ease), color .3s var(--pda-ease);
        }
        .pda-title-line{
          font-family:var(--pda-font-display); text-transform:uppercase; line-height:0.85;
          font-size:clamp(28px, 6.6vw, 58px); letter-spacing:.005em;
          font-style:italic; font-weight:700; font-variation-settings:'wght' 700, 'ital' 1;
          display:block; padding:14px 12px 10px; margin:0;
          transition:background .3s var(--pda-ease);
        }
        .pda-title-line .pda-name{ color:var(--pda-fg); transition:color .3s var(--pda-ease); }
        .pda-title-line .pda-postcode{ color:var(--pda-accent); transition:color .3s var(--pda-ease); }
        .pda-loc-chain{
          font-family:var(--pda-font-mono); font-size:10px; letter-spacing:.03em; text-transform:uppercase;
          color:var(--pda-address); display:block; width:fit-content; padding:3px 7px; margin-top:0;
          transition:background .3s var(--pda-ease), color .3s var(--pda-ease);
        }

        .pda-row.pda-open .pda-cat-id{ background:var(--pda-accent); color:var(--pda-ink); }
        .pda-row.pda-open .pda-loc-chain{ background:var(--pda-accent); color:var(--pda-ink); }
        .pda-row.pda-open .pda-title-line{ background:var(--pda-accent); }
        .pda-row.pda-open .pda-title-line .pda-name{ color:var(--pda-ink); }
        .pda-row.pda-open .pda-title-line .pda-postcode{ color:var(--pda-fg); }

        .pda-expand-wrap{ display:grid; grid-template-rows:0fr; transition:grid-template-rows .5s var(--pda-ease); }
        .pda-row.pda-open .pda-expand-wrap{ grid-template-rows:1fr; }
        .pda-expand-inner{ overflow:hidden; min-height:0; }

        .pda-render-panel{ display:flex; height:230px; margin-top:16px; background:var(--pda-bg); }
        .pda-card-foot{ height:4px; background:var(--pda-accent); margin-top:16px; opacity:0; transition:opacity .25s ease .1s; }
        .pda-row.pda-open .pda-card-foot{ opacity:1; }
        .pda-render-img{ flex:1.7; position:relative; cursor:pointer; overflow:hidden; background:#111; }
        .pda-render-img img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:${imgFilter}; transition:filter .2s var(--pda-ease); }
        .pda-render-panel:hover .pda-render-img img{ filter:brightness(1.15) grayscale(1) contrast(1.05); }

        .pda-arrow-box{ flex:1; min-width:160px; background:var(--pda-bg); display:flex; align-items:center; justify-content:center; cursor:pointer; }
        .pda-glyph{
          font-family:var(--pda-font-display); font-style:italic; font-weight:900; font-variation-settings:'wght' 700;
          font-size:clamp(70px, 11vw, 130px); color:var(--pda-fg); line-height:1;
          transition:transform .25s var(--pda-ease), color .2s var(--pda-ease);
        }
        .pda-render-panel:hover .pda-glyph{ transform:translateX(18px); color:var(--pda-accent); }

        .pda-empty{ padding:80px 24px; text-align:center; color:var(--pda-muted); font-size:12px; text-transform:uppercase; letter-spacing:.12em; font-family:var(--pda-font-mono); }
        ::selection{ background:var(--pda-accent); color:var(--pda-ink); }
      `}</style>

      <div className="pda-wrap">
        <header className="pda-bar">
          <div className="pda-search-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text" placeholder="SEARCH" value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="pda-filter-row">
            <span className="pda-sub">Browse the Scout database of parks</span>
            <div className="pda-sort-controls">
              <button className={sortMode === "az" ? "pda-active" : ""} onClick={() => handleSort("az")}>A–Z</button>
              <button className={sortMode === "date" ? "pda-active" : ""} onClick={() => handleSort("date")}>Date</button>
              <button className={sortMode === "nearest" ? "pda-active" : ""} onClick={() => handleSort("nearest")}>Nearest</button>
            </div>
          </div>
        </header>

        <div>
          {displayedParks.map((park, idx) => (
            <Row
              key={park.id}
              park={park}
              idx={idx}
              isOpen={openId === park.id}
              onToggle={() => setOpenId(cur => (cur === park.id ? null : park.id))}
              onNavigate={() => goToPark(park.slug)}
            />
          ))}
          {displayedParks.length === 0 && (
            <div className="pda-empty">No parks match your filters</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  park, idx, isOpen, onToggle, onNavigate,
}: {
  park: ParkRow; idx: number; isOpen: boolean; onToggle: () => void; onNavigate: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const idNumber = park.catalogue_id?.replace(/^SCN\//i, "").trim()
    || String(park.sort_order ?? idx + 1).padStart(3, "0");
  const postcodePrefix = park.postcode?.split(" ")[0] ?? "";
  const chain = [park.address?.[0], park.location, postcodePrefix].filter(Boolean).join(" / ").toUpperCase();

  const nav = (e: React.MouseEvent) => { e.stopPropagation(); onNavigate(); };
  const onHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); }
  };

  return (
    <div className={`pda-row${isOpen ? " pda-open" : ""}`}>
      <div className="pda-row-head">
        <div
          className="pda-row-head-btn"
          role="button" tabIndex={0} aria-expanded={isOpen}
          onClick={onToggle} onKeyDown={onHeaderKeyDown}
        >
          <div className="pda-cat-id">{idNumber}/</div>
          <span className="pda-title-line">
            <span className="pda-name">{park.name}/</span><span className="pda-postcode">{postcodePrefix}/</span>
          </span>
          {chain && <span className="pda-loc-chain">{chain}</span>}
        </div>

        <div className="pda-expand-wrap"><div className="pda-expand-inner" ref={contentRef}>
          <div className="pda-render-panel">
            <div className="pda-render-img" onClick={nav}>
              {park.hero_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={park.hero_image} alt="" loading="lazy" />
              )}
            </div>
            <div className="pda-arrow-box" onClick={nav}>
              <span className="pda-glyph">&#8594;</span>
            </div>
          </div>
          <div className="pda-card-foot" />
        </div></div>
      </div>
    </div>
  );
}