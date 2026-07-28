"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ParkCard, ParkCardCTA, PARK_CARD_CSS, getParkAddressChain, getParkTags } from "./ParkCard";

const ParksMap = lazy(() => import("./ParksMap"));

// ── Local preview component ──────────────────────────────────────────────
// Ported from the "Parks Directory" prototype handoff, then reworked per the
// "Scout Archive Accordion" handover: the coral filled-box open state is gone,
// replaced by a quiet grey hover plate + a chevron whose border is the only
// coloured affordance.
//
// Palette note: the handover specifies literal light-mode hex values
// (--bg #f5f3ee, --hover-bg #ece8e2, --coral #d97757). Those are wired to the
// site's theme tokens instead, because /parks renders in both dark and light
// mode and hardcoding would break dark. The light-theme tokens land within a
// point or two of the spec anyway (--background #F5F5F5 ≈ #f5f3ee,
// --card #ebe8e3 ≈ #ece8e2, --border #dddad4 ≈ #e8e4db). The accent is the
// brand coral #D23B3B rather than the spec's #d97757 — see --pda-accent.
//
// Open decisions carried over from the handoff (not resolved here):
//  - bare catalogue number vs. "SCN/" prefix (see getCatalogueIdLabel)
//  - conditions (ParkWeather) tag omitted, as in the prototype
//  - coordinates omitted from the title line
//  - the display face is the --font-display token in app/colors_and_type.css
//    (MSCHN vs Rubik A/B) — the @font-face lives in
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
  brief: string | null;
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
        .select("id, slug, name, postcode, address, location, catalogue_id, brief, hero_image, directory_image_url, lat, lng, opened, sort_order, type, is_free, is_covered")
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
          --pda-accent:var(--accent, #D23B3B); --pda-accent-hover:var(--accent-hover, #B33232);
          --pda-hover-bg:var(--card); --pda-ink:#0a0a0a;
          /* Shared geometry: the desktop list column width and the wrap gutter.
             The search field and the split-view list column are sized and
             aligned from these, so they stay flush with each other. */
          --pda-list-col:300px; --pda-gutter:24px;
          --pda-ease: cubic-bezier(0.16, 1, 0.3, 1);
          --pda-font-mono: 'DM Mono', ui-monospace, monospace;
          --pda-font-ui: 'Rubik', Arial, sans-serif;
          --pda-font-display: var(--font-display), Arial, sans-serif; /* flip MSCHN<->Rubik in colors_and_type.css */
          background:var(--pda-bg); color:var(--pda-fg);
          font-family:var(--pda-font-ui); -webkit-font-smoothing:antialiased;
        }
        .pda-wrap{ max-width:860px; margin:0 auto; padding:0 var(--pda-gutter) 100px; }
        .pda-wrap-wide{ max-width:none; }
        /* The bar's box pins flush under the nav bar, but its *contents* start
           below the floating logo (Nav publishes --logo-bottom; the wordmark is
           taller than the bar and overhangs it). So the logo always sits on the
           bar's solid background, and rows scrolling up disappear behind the bar
           well before they can reach it — no text ever collides with the mark. */
        /* The background is pulled out to the gutter edges — the list and map
           below are full-bleed via the same negative margin, so a bar that only
           spanned the content box left a strip either side where rows stayed
           visible as they scrolled up under it. Padding puts the contents back
           where they were. */
        .pda-bar{
          position:sticky; top:var(--nav-height, 44px); z-index:5;
          background:var(--pda-bg);
          margin:0 calc(var(--pda-gutter) * -1);
          padding:calc(var(--logo-bottom, 78px) - var(--nav-height, 44px) + 14px) var(--pda-gutter) 16px;
        }
        /* Desktop: a compact utility field sitting above the list, not a
           hero-scale input — the list is the page, search is a tool for it. */
        .pda-wrap-wide .pda-bar{ padding-bottom:10px; }
        /* Desktop only. Sized and shifted to sit exactly over the split-view
           list column below it — the column is pulled out of the wrap's gutter,
           so the field is too. Both edges line up with the list. */
        .pda-search-row{
          display:flex; align-items:center; gap:8px;
          width:var(--pda-list-col); height:32px;
          margin-left:calc(var(--pda-gutter) * -1);
          border-radius:16px; border:1px solid var(--pda-line);
          background:var(--pda-panel); padding:0 12px;
        }
        .pda-search-row svg{ width:13px; height:13px; opacity:.6; flex-shrink:0; }
        .pda-search-row input{ flex:1; min-width:0; height:32px; background:none; border:none; color:var(--pda-accent); font-family:var(--pda-font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.03em; }
        .pda-search-row input::placeholder{ color:var(--pda-accent); opacity:.5; }
        .pda-search-row input:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:2px; }

        .pda-mobile-bar-row{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .pda-search-compact{ display:flex; align-items:center; gap:8px; height:30px; flex:1 1 auto; min-width:0; border-radius:15px; background:var(--pda-panel); border:1px solid var(--pda-line); padding:0 12px; }
        .pda-search-compact svg{ width:13px; height:13px; opacity:.6; flex-shrink:0; }
        .pda-search-compact input{ flex:1; min-width:0; height:30px; background:none; border:none; color:var(--pda-accent); font-family:var(--pda-font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.03em; }
        .pda-search-compact input::placeholder{ color:var(--pda-accent); opacity:.5; }
        .pda-search-compact input:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:2px; }

        .pda-view-toggle{ display:flex; align-items:center; flex-shrink:0; height:30px; border:1px solid var(--pda-line); border-radius:15px; overflow:hidden; }
        .pda-view-toggle button{ height:100%; display:flex; align-items:center; justify-content:center; background:transparent; border:none; color:var(--pda-fg); font-family:var(--pda-font-mono); font-size:11px; line-height:1; text-transform:uppercase; letter-spacing:.03em; padding:0 14px; cursor:pointer; transition:background .15s var(--pda-ease), color .15s var(--pda-ease); }
        .pda-view-toggle button.pda-active{ background:var(--pda-accent); color:#fff; }

        /* ── Archive accordion row ──────────────────────────────────────
           The hover plate is static geometry: padding and negative margin are
           always applied so nothing reflows, and only background-color moves.
           The negative margin pulls the plate past .pda-wrap's 24px gutter so
           it reads edge-to-edge on mobile. */
        /* No per-row rule. A divider under every row stacked up into a ladder of
           repeating horizontal lines down the whole list; whitespace, the hover
           plate and the chevron carry the structure instead, and the coral edge
           still marks the open row. Padding is up from 20px to compensate.
           Kept in step with .eacc-item in components/editorial/EditorialAccordion. */
        .pda-item{
          position:relative;
          padding:26px 16px; margin:0 -16px;
          transition:background-color .18s ease;
        }
        /* Open rule — the same 2px coral edge the desktop list shows on its
           selected row, so "active" reads identically on both. */
        .pda-item::after{
          content:""; position:absolute; left:0; right:0; bottom:0; height:2px;
          background:var(--pda-accent); opacity:0;
          transition:opacity .18s ease; pointer-events:none;
        }
        .pda-item.pda-open::after{ opacity:1; }
        /* hover: only on real pointers — on touch it would stick after tap */
        @media (hover: hover){
          .pda-item:not(.pda-open):hover{ background-color:var(--pda-hover-bg); }
          .pda-item:not(.pda-open):hover .pda-chevron{ border-color:var(--pda-accent); }
        }

        .pda-trigger{
          all:unset; box-sizing:border-box;
          display:grid; grid-template-columns:1fr 28px; gap:16px; align-items:center;
          width:100%; cursor:pointer;
          transition:transform .12s var(--pda-ease);
        }
        .pda-trigger:active{ transform:scale(.995); }
        .pda-trigger:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:4px; }

        /* Fixed 12px inset on every trigger line, so hovering only changes
           colour — text never shifts. The trigger's type comes from the shared
           .pcard-archive scale in PARK_CARD_CSS, which the desktop split-list
           row renders from too. */
        .pda-trigger-content{ padding-left:12px; min-width:0; }

        .pda-chevron{
          width:28px; height:28px; border-radius:50%;
          border:0.5px solid var(--pda-line);
          display:flex; align-items:center; justify-content:center;
          color:var(--pda-muted);
          transition:border-color .18s ease;
        }
        .pda-chevron svg{
          width:12px; height:12px;
          transition:transform .28s cubic-bezier(.2,.8,.2,1);
        }
        .pda-item.pda-open .pda-chevron svg{ transform:rotate(180deg); }

        /* Drawer. The handover asks for max-height 0 → 1000px; grid rows
           0fr → 1fr gets the same look on the spec's 420ms curve without the
           magic number, so short rows don't finish animating early. */
        .pda-drawer{
          display:grid; grid-template-rows:0fr; opacity:0;
          transition:grid-template-rows .42s cubic-bezier(.22,1,.36,1), opacity .25s ease;
        }
        .pda-item.pda-open .pda-drawer{ grid-template-rows:1fr; opacity:1; }
        .pda-drawer-inner{ overflow:hidden; min-height:0; }
        /* Indented to sit under the trigger text, not the row edge. */
        .pda-drawer-body{
          padding:18px 12px 4px;
          transform:translateY(-6px);
          transition:transform .42s cubic-bezier(.22,1,.36,1);
        }
        .pda-item.pda-open .pda-drawer-body{ transform:none; }

        .pda-figure{
          position:relative; aspect-ratio:16 / 10; overflow:hidden; cursor:pointer;
          background:linear-gradient(135deg, var(--pda-panel), var(--pda-line));
        }
        .pda-figure img{
          position:absolute; inset:0; width:100%; height:100%; object-fit:cover;
          filter:grayscale(1) contrast(1.05) brightness(.88);
          transition:filter .2s var(--pda-ease);
        }
        .pda-figure:hover img{ filter:grayscale(1) contrast(1.05) brightness(1.1); }
        .pda-figure-label{
          position:absolute; left:8px; bottom:8px; z-index:2;
          font-family:var(--pda-font-mono); font-size:10px; letter-spacing:.1em;
          text-transform:uppercase; color:#fff;
          background:rgba(0,0,0,.55); padding:4px 8px;
        }

        /* The brief itself is styled by .pcard-brief in PARK_CARD_CSS, shared
           with the desktop map card — the gap here owns the spacing instead. */
        .pda-details{ display:flex; flex-direction:column; gap:14px; margin-top:14px; }
        .pda-details .pcard-brief{ margin:0; }
        /* Tags and CTA come from PARK_CARD_CSS (.pcard-tag / .pcard-cta) so the
           drawer and the map cards share one badge and one button. The flex gap
           owns vertical spacing here, so the CTA's own margin is dropped. */
        .pda-details .pcard-tags{ margin-top:0; }
        .pda-details .pcard-cta{ margin-top:0; }
        @media (prefers-reduced-motion: reduce){
          .pda-item, .pda-trigger, .pda-chevron svg, .pda-drawer,
          .pda-drawer-body, .pcard-cta, .pda-figure img{ transition-duration:.01ms; }
          .pda-trigger:active{ transform:none; }
        }

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
            <div style={isMobile
              ? { height: "calc(100dvh - var(--nav-height, 44px) - var(--pda-bar-height, 132px))", margin: "0 calc(var(--pda-gutter) * -1)" }
              : { height: "calc(100dvh - 170px)", margin: "0 calc(var(--pda-gutter) * -1)" }}>
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
  const chain = getParkAddressChain(park);
  const tags = getParkTags(park);
  const image = park.directory_image_url || park.hero_image;
  const panelId = `pda-panel-${park.id}`;
  const triggerId = `pda-trigger-${park.id}`;

  return (
    <div className={`pda-item${isOpen ? " pda-open" : ""}`}>
      <button
        type="button" className="pda-trigger" id={triggerId}
        aria-expanded={isOpen} aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="pda-trigger-content">
          <ParkCard park={park} idx={idx} variant="archive" showTags={false} showLocation />
        </span>
        <span className="pda-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {/* inert while closed so the drawer's link and image stay out of the
          tab order and off screen readers until the row is actually open */}
      <div className="pda-drawer" id={panelId} role="region" aria-labelledby={triggerId} inert={!isOpen}>
        <div className="pda-drawer-inner">
          <div className="pda-drawer-body">
            <div className="pda-figure" onClick={onNavigate}>
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" loading="lazy" />
              )}
              {chain && <span className="pda-figure-label">{chain}</span>}
            </div>

            <div className="pda-details">
              {park.brief && <p className="pcard-brief">{park.brief}</p>}
              {tags.length > 0 && (
                <div className="pcard-tags">
                  {tags.map(t => <span key={t} className="pcard-tag">{t}</span>)}
                </div>
              )}
              <ParkCardCTA slug={park.slug} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}