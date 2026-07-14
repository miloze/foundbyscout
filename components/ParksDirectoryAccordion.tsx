"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ParkCard, ParkCardThumbnail, PARK_CARD_CSS, getParkAddressChain, getParkTags } from "./ParkCard";

const ParksMap = lazy(() => import("./ParksMap"));

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
//  - MSCHN isn't licensed for production yet — the @font-face lives in
//    app/colors_and_type.css and falls back to Rubik (--pda-font-display)
//    until public/fonts/MSCHN.* actually exists.

type ParkRow = {
  id: string;
  slug: string;
  name: string;
  postcode: string | null;
  address: string[] | null;
  location: string | null;
  catalogue_id: string | null;
  hero_image: string | null;
  directory_image_url: string | null;
  lat: number | null;
  lng: number | null;
  opened: string | null;
  sort_order: number | null;
  type: string | null;
  is_free: boolean | null;
  is_covered: boolean | null;
};

export default function ParksDirectoryAccordion() {
  const router = useRouter();
  const [parks, setParks] = useState<ParkRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [isMobile, setIsMobile] = useState(true);
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Publish the header's real rendered height so the mobile map view (which
  // fills the remaining viewport below it) can size itself to match — the
  // header stays mounted and in the same place in both list and map view,
  // so search + the List/Map toggle never move or change behaviour.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty("--pda-bar-height", `${entry.contentRect.height}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    import("@supabase/supabase-js").then(({ createClient }) => {
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      db.from("parks")
        .select("id, slug, name, postcode, address, location, catalogue_id, hero_image, directory_image_url, lat, lng, opened, sort_order, type, is_free, is_covered")
        .eq("published", true)
        .order("sort_order", { ascending: true })
        .then(({ data }) => { if (data) setParks(data as ParkRow[]); });
    });
  }, []);

  const displayedParks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parks;
    return parks.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.location ?? "").toLowerCase().includes(q) ||
      (p.postcode ?? "").toLowerCase().includes(q) ||
      (p.address ?? []).some(a => a.toLowerCase().includes(q))
    );
  }, [parks, search]);

  const goToPark = (slug: string) => router.push(`/parks/${slug}`);

  // Desktop always shows the map as a split list/map view — the header's
  // List/Map toggle only matters on mobile, where screen space forces a choice.
  const showMap = !isMobile || view === "map";

  return (
    <div className="pda-root">
      <style>{`
        .pda-root{
          --pda-bg:var(--background); --pda-panel:var(--card); --pda-fg:var(--foreground);
          --pda-address:var(--muted); --pda-muted:var(--muted); --pda-line:var(--border);
          --pda-accent:var(--accent, #EF4343); --pda-ink:#0a0a0a;
          --pda-ease: cubic-bezier(0.16, 1, 0.3, 1);
          --pda-font-mono: 'DM Mono', ui-monospace, monospace;
          --pda-font-ui: 'Rubik', Arial, sans-serif;
          --pda-font-display: 'MSCHN', 'Rubik', Arial, sans-serif; /* falls back to Rubik if MSCHN.* isn't present */
          background:var(--pda-bg); color:var(--pda-fg);
          font-family:var(--pda-font-ui); -webkit-font-smoothing:antialiased;
        }
        .pda-wrap{ max-width:860px; margin:0 auto; padding:0 24px 100px; }
        .pda-wrap-wide{ max-width:none; }
        .pda-bar{ position:sticky; top:var(--nav-height, 44px); z-index:5; background:var(--pda-bg); padding:24px 0 16px; }
        .pda-search-row{ display:flex; align-items:center; gap:10px; border:1px solid var(--pda-line); background:var(--pda-panel); padding:12px 16px; }
        .pda-search-row svg{ width:15px; height:15px; opacity:.6; flex-shrink:0; }
        .pda-search-row input{ flex:1; width:100%; background:none; border:none; outline:none; color:var(--pda-accent); font-family:var(--pda-font-mono); font-size:16px; text-transform:uppercase; letter-spacing:.03em; }
        .pda-search-row input::placeholder{ color:var(--pda-accent); opacity:.5; }

        .pda-mobile-bar-row{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .pda-search-compact{ display:flex; align-items:center; gap:8px; height:30px; flex:1 1 auto; min-width:0; border-radius:15px; background:var(--pda-panel); border:1px solid var(--pda-line); padding:0 12px; }
        .pda-search-compact svg{ width:13px; height:13px; opacity:.6; flex-shrink:0; }
        .pda-search-compact input{ flex:1; min-width:0; height:30px; background:none; border:none; outline:none; color:var(--pda-accent); font-family:var(--pda-font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.03em; }
        .pda-search-compact input::placeholder{ color:var(--pda-accent); opacity:.5; }

        .pda-view-toggle{ display:flex; align-items:center; flex-shrink:0; height:30px; border:1px solid var(--pda-line); border-radius:15px; overflow:hidden; }
        .pda-view-toggle button{ height:100%; display:flex; align-items:center; justify-content:center; background:transparent; border:none; color:var(--pda-fg); font-family:var(--pda-font-mono); font-size:11px; line-height:1; text-transform:uppercase; letter-spacing:.03em; padding:0 14px; cursor:pointer; transition:background .15s var(--pda-ease), color .15s var(--pda-ease); }
        .pda-view-toggle button.pda-active{ background:var(--pda-accent); color:#fff; }

        .pda-row{ box-shadow:0 1px 0 var(--pda-line); transition:box-shadow .45s var(--pda-ease); }
        .pda-row.pda-open{ box-shadow:0 4px 0 var(--pda-accent); }
        .pda-row-head{ padding:20px 20px 18px; }
        .pda-row-head-btn{ cursor:pointer; }
        .pda-row .pcard-id, .pda-row .pcard-title, .pda-row .pcard-location{ transition:background .3s var(--pda-ease), color .3s var(--pda-ease); }

        .pda-row.pda-open .pcard-id{ background:var(--pda-accent); color:var(--pda-ink); }
        .pda-row.pda-open .pcard-address-inline{ background:var(--pda-accent); color:var(--pda-ink); }
        .pda-row.pda-open .pcard-title{ background:var(--pda-accent); }
        .pda-row.pda-open .pcard-title .pcard-name{ color:#fff; }
        .pda-row.pda-open .pcard-title .pcard-postcode{ color:var(--pda-ink); }

        .pda-expand-wrap{ display:grid; grid-template-rows:0fr; transition:grid-template-rows .5s var(--pda-ease); }
        .pda-row.pda-open .pda-expand-wrap{ grid-template-rows:1fr; }
        .pda-expand-inner{ overflow:hidden; min-height:0; }

        .pda-empty{ padding:80px 24px; text-align:center; color:var(--pda-muted); font-size:12px; text-transform:uppercase; letter-spacing:.12em; font-family:var(--pda-font-mono); }
        ::selection{ background:var(--pda-accent); color:var(--pda-ink); }
        ${PARK_CARD_CSS}
      `}</style>

      <div className={`pda-wrap${!isMobile ? " pda-wrap-wide" : ""}`}>
        {/* Always mounted in the same place for list and map view alike —
            search and the List/Map toggle must never move or change
            behaviour when switching views. */}
        <header className="pda-bar" ref={barRef}>
          {isMobile ? (
            <div className="pda-mobile-bar-row">
              <div className="pda-search-compact">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  type="text" placeholder="SEARCH" value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="pda-view-toggle">
                <button className={view === "list" ? "pda-active" : ""} onClick={() => setView("list")}>List</button>
                <button className={view === "map" ? "pda-active" : ""} onClick={() => setView("map")}>Map</button>
              </div>
            </div>
          ) : (
            <div className="pda-search-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                type="text" placeholder="SEARCH" value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}
        </header>

        {showMap ? (
          <Suspense fallback={<div className="pda-empty">Loading map…</div>}>
            <div style={isMobile ? { height: "calc(100dvh - var(--nav-height, 44px) - var(--pda-bar-height, 132px))", margin: "0 -24px" } : { height: "calc(100dvh - 170px)", margin: "0 -24px" }}>
              <ParksMap search={search} />
            </div>
          </Suspense>
        ) : (
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
        )}
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
  const chain = getParkAddressChain(park);
  const tags = getParkTags(park);

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
          <ParkCard park={park} idx={idx} variant="row" showTags={false} showLocation={false} />
          {chain && <span className="pcard-address pcard-address-inline">{chain}</span>}
        </div>

        <div className="pda-expand-wrap"><div className="pda-expand-inner" ref={contentRef}>
          {tags.length > 0 && (
            <div className="pcard-tags pcard-tags-preimage">
              {tags.map(t => <span key={t} className="pcard-tag">{t}</span>)}
            </div>
          )}
          <ParkCardThumbnail park={park} variant="row" onClick={nav} />
        </div></div>
      </div>
    </div>
  );
}