"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { PARK_CARD_CSS } from "./ParkCard";
import { useExploreState, saveSearch, readSearch, useUrlParam } from "./parksGridState";

const ParksMap = lazy(() => import("./ParksMap"));
// Grid replaces the map entirely rather than sitting beside it, so it is never
// needed in the same paint as Explore — lazy on the same terms.
const ParksGridView = lazy(() => import("./ParksGridView"));

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
// point or two of the spec anyway (--background #F3EFEC ≈ #f5f3ee,
// --card #ebe8e3 ≈ #ece8e2, --border #dddad4 ≈ #e8e4db). The accent is the
// brand coral #FF7948 rather than the spec's #d97757 — see --pda-accent.
//
// Open decisions carried over from the handoff (not resolved here):
//  - bare catalogue number vs. "SCN/" prefix (settled: see catalogueMark in
//    lib/catalogue.ts — one mark, "001/", on every surface)
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
  const [parks, setParks] = useState<ParkRow[]>([]);
  const [search, setSearch] = useState("");
  // The park a dropdown pick wants opened on the map, and the counter that
  // makes each pick distinct — see ParksMap's focus prop.
  const [focus, setFocus] = useState<{ id: string; seq: number } | null>(null);
  const focusSeq = useRef(0);
  const [isMobile, setIsMobile] = useState(true);
  // exploreMode + gridDensity, both held in the URL. `mode` is null until the
  // first client layout pass has read it; nothing renders in that commit, so
  // the map never mounts for a frame on a /parks?mode=grid link.
  const { mode, density, setMode, setDensity } = useExploreState();
  // Latched once Explore has been on screen, so a /parks?mode=grid link still
  // costs nothing — the map is only kept alive after it has actually been used.
  const exploreSeen = useRef(false);
  useEffect(() => { if (mode === "explore") exploreSeen.current = true; }, [mode]);
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
      // The border box, not contentRect. Padding is most of this bar's height
      // — it clears the floating logo — and contentRect excludes padding, so
      // this reported ~45px for a ~147px bar. The map below sizes itself by
      // subtracting this from the viewport, so the under-report made the map
      // that much too tall and pushed the detail card below the fold.
      const h = entry.borderBoxSize?.[0]?.blockSize
        ?? entry.target.getBoundingClientRect().height;
      document.documentElement.style.setProperty("--pda-bar-height", `${h}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Search survives a park visit alongside mode, density and scroll. Restored
  // after mount rather than in the useState initialiser: this route is
  // prerendered, so a first render that read sessionStorage would not match the
  // server's.
  useEffect(() => { setSearch(readSearch()); }, []);
  useEffect(() => { saveSearch(search); }, [search]);

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

  // ?park=<slug> opens the map on that park. It is what the park page's
  // "View on map" points at for a reader with no directory history — a direct
  // visit, a shared link, a new tab — so that control lands on the park being
  // read rather than on the random pick the map would otherwise make.
  // Consumed once: the seq counter means re-running would re-centre the map
  // under someone who had since panned away.
  const parkParam = useUrlParam("park");
  const parkParamUsed = useRef(false);
  useEffect(() => {
    if (!parkParam || parkParamUsed.current || parks.length === 0) return;
    const park = parks.find(p => p.slug === parkParam);
    if (!park) return;            // unknown slug: leave the map to its own devices
    parkParamUsed.current = true;
    setMode("explore");
    setFocus({ id: park.id, seq: ++focusSeq.current });
  }, [parkParam, parks, setMode]);

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

  // Search results, capped: this is a jump-to-park control, not a second list.
  const suggestions = useMemo(
    () => (search.trim() ? displayedParks.slice(0, 8) : []),
    [search, displayedParks],
  );

  // A pick lands on the map exactly where tapping the pin would. The query is
  // cleared on the way out: the map filters on that same string, so leaving it
  // set would strand the chosen park as the only pin on screen — the opposite
  // of the surrounding context you opened it to see.
  const jumpToPark = (park: ParkRow) => {
    setMode("explore");
    setFocus({ id: park.id, seq: ++focusSeq.current });
    setSearch("");
  };

  return (
    <div className="pda-root">
      <style>{`
        .pda-root{
          --pda-bg:var(--background); --pda-panel:var(--card); --pda-fg:var(--foreground);
          --pda-address:var(--muted); --pda-muted:var(--muted); --pda-line:var(--border);
          --pda-accent:var(--accent); --pda-accent-hover:var(--accent-hover);
          --pda-hover-bg:var(--card); --pda-ink:#0a0a0a;
          /* Shared geometry: the desktop list column width and the wrap gutter.
             The search field and the split-view list column are sized and
             aligned from these, so they stay flush with each other.
             The gutter is Nav's own expression, not a flat number: Nav pads by
             clamp(16px, 4vw, 56px) (components/Nav.tsx), so anything else here
             tracks it at one width and drifts at every other — 24px against
             Nav's 51px at 1280 was exactly that. */
          /* 280, down from 300 — a 336px index instead of 356. Measured against
             the real names at 18px display: the column gives the title 235px
             and the longest plausible park name ("Stockwell Skatepark") needs
             198, so there is 37px of headroom. 264 was also tested and fits,
             but with only 21px spare it starts reading as cramped rather than
             deliberate, and the 16px of map it buys back is not worth that. */
          --pda-list-col:280px; --pda-gutter:clamp(16px, 4vw, 56px);
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
          /* Above the map's overlay chrome (z-index 21), which the results
             dropdown now hangs down over, and below Nav's floating logo (30) so
             the wordmark still sits on the bar rather than behind it. */
          position:sticky; top:var(--nav-height, 44px); z-index:25;
          background:var(--pda-bg);
          margin:0 calc(var(--pda-gutter) * -1);
          padding:calc(var(--logo-bottom, 78px) - var(--nav-height, 44px) + 22px) var(--pda-gutter) 18px;
        }
        /* Desktop: a compact utility field sitting above the list, not a
           hero-scale input — the list is the page, search is a tool for it. */
        .pda-wrap-wide .pda-bar{ padding-bottom:16px; }
        /* Sits on the page gutter like the field below it, so label, field
           and the split-view list column all start at the same left edge. */
        .pda-search-row{
          display:flex; align-items:center; gap:8px;
          width:100%; height:32px;
          border-radius:16px; border:1px solid var(--pda-line);
          background:var(--pda-panel); padding:0 12px;
        }
        .pda-search-row svg{ width:13px; height:13px; opacity:.6; flex-shrink:0; }
        .pda-search-row input{ flex:1; min-width:0; height:32px; background:none; border:none; color:var(--pda-accent); font-family:var(--pda-font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.03em; }
        .pda-search-row input::placeholder{ color:var(--pda-accent); opacity:.5; }
        .pda-search-row input:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:2px; }

        /* Page label + count, on its own line above the controls. Giving it
           the line is what buys the toggle the width to show words rather than
           bare glyphs, and drops search onto a full-width row of its own. */
        .pda-bar-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
        /* The page's own title, built from the two tiers every row on the site
           already uses: the display face for the name, the 11px mono metadata
           tier for what qualifies it (.pcard-title / .pcard-id in
           PARK_CARD_CSS). At 11px mono it matched the search field beside it —
           but those are controls and this is the page, so they should not have
           read as the same rank. */
        .pda-count{ display:flex; flex-direction:column; gap:3px; min-width:0; }
        .pda-count-title{
          font-family:var(--pda-font-display); text-transform:uppercase;
          font-size:clamp(18px, 2.4vw, 26px); line-height:1.05; letter-spacing:.005em;
          font-weight:700; font-variation-settings:'wght' 700;
          color:var(--pda-fg); white-space:nowrap;
        }
        .pda-count-meta{
          font-family:var(--pda-font-mono); font-size:11px; font-weight:500;
          line-height:1.2; letter-spacing:.08em; text-transform:uppercase;
          color:var(--pda-muted);
          min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        }
        .pda-search-compact{ display:flex; align-items:center; gap:8px; height:30px; min-width:0; border-radius:15px; background:var(--pda-panel); border:1px solid var(--pda-line); padding:0 12px; }
        .pda-search-compact svg{ width:13px; height:13px; opacity:.6; flex-shrink:0; }
        .pda-search-compact input{ flex:1; min-width:0; height:30px; background:none; border:none; color:var(--pda-accent); font-family:var(--pda-font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.03em; }
        .pda-search-compact input::placeholder{ color:var(--pda-accent); opacity:.5; }
        .pda-search-compact input:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:2px; }

        /* Field and results share one positioning box, so the dropdown hangs
           from the field's own edges at either breakpoint — full width on
           mobile, the list column's 300px on desktop. The wrapper carries the
           Inset by the page gutter like every other piece of chrome, so the
           field and the list column below it share one left edge. */
        .pda-search-field{ position:relative; }
        .pda-search-field-wide{ width:var(--pda-list-col); }
        .pda-suggest{
          position:absolute; top:calc(100% + 6px); left:0; right:0; z-index:2;
          margin:0; padding:4px; list-style:none;
          max-height:min(52vh, 320px); overflow-y:auto;
          background:var(--pda-panel); border:1px solid var(--pda-line);
          border-radius:12px; box-shadow:0 12px 28px rgba(0,0,0,.28);
        }
        .pda-suggest-row{
          display:flex; align-items:baseline; gap:10px; width:100%;
          background:none; border:none; border-radius:8px; cursor:pointer;
          padding:9px 10px; text-align:left;
          font-family:var(--pda-font-mono); font-size:11px; line-height:1.3;
          text-transform:uppercase; letter-spacing:.03em;
          transition:background-color .12s var(--pda-ease);
        }
        .pda-suggest-name{ color:var(--pda-fg); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .pda-suggest-area{ margin-left:auto; flex-shrink:0; color:var(--pda-muted); }
        .pda-suggest-row:hover, .pda-suggest-row.pda-suggest-on{ background:var(--pda-hover-bg); }
        .pda-suggest-row.pda-suggest-on .pda-suggest-name{ color:var(--pda-accent); }
        .pda-suggest-row:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:-2px; }

        .pda-view-toggle{ display:flex; align-items:center; flex-shrink:0; height:30px; border:1px solid var(--pda-line); border-radius:15px; overflow:hidden; }
        .pda-view-toggle button{ height:100%; display:flex; align-items:center; justify-content:center; background:transparent; border:none; color:var(--pda-fg); font-family:var(--pda-font-mono); font-size:11px; line-height:1; text-transform:uppercase; letter-spacing:.03em; padding:0 14px; cursor:pointer; transition:background .15s var(--pda-ease), color .15s var(--pda-ease); }
        .pda-view-toggle button.pda-active{ background:var(--pda-accent); color:#fff; }
        /* Glyph + word. These were fixed 38px squares because three of them
           had to share the pill a two-word toggle used to fill; the count line
           above freed that width, so each mode can say what it is instead of
           leaving the glyph to carry it. Padding is tighter than the base rule
           because three still have to share a phone's bar row. */
        .pda-view-toggle button.pda-icon{ padding:0 11px; gap:6px; }
        .pda-view-toggle button.pda-icon svg{ width:14px; height:14px; flex-shrink:0; }
        .pda-view-toggle{ flex-shrink:0; }
        /* Stacked, the title block is ~70px wide instead of the ~120px a single
           mono line took, so it no longer competes with the toggle for the row.
           The buttons keep the tighter padding anyway: the title is the widest
           thing here now and should not be the first thing to give. */
        @media (max-width: 420px){
          .pda-view-toggle button.pda-icon{ padding:0 9px; gap:5px; }
        }
        .pda-view-toggle button:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:-2px; }
        /* Desktop bar. Both ends stop at the page gutter: the field lines up
           with the list column beneath it, the toggle with the map's right
           edge. Chrome stays contained even where imagery under it does not. */
        .pda-desktop-bar-row{
          display:flex; align-items:center; justify-content:space-between; gap:12px;
        }

        /* The accordion row, its drawer and its figure lived here to render
           mobile's List mode. List is gone — search jumps straight to a park
           now — and Explore's list column is ParksMap's own .pms-index-row,
           which carries its own styles. PARK_CARD_CSS below still has to stay:
           ParksMap does not inject it, and its rows render ParkCard. */
        /* The reduced-motion guard for the card CTA used to live here, which
           meant it only applied on pages that mounted this component — the
           standalone grid preview mounted the same button without it. The CTA
           is CTAButton/.fbs-cta now and carries its own guard in globals.css,
           so it is correct everywhere the button renders. */

        .pda-empty{ padding:80px 24px; text-align:center; color:var(--pda-muted); font-size:12px; text-transform:uppercase; letter-spacing:.12em; font-family:var(--pda-font-mono); }
        ::selection{ background:var(--pda-accent); color:var(--pda-ink); }
        ${PARK_CARD_CSS}
      `}</style>

      <div className={`pda-wrap${!isMobile || mode === "grid" ? " pda-wrap-wide" : ""}`}>
        {/* Always mounted in the same place in every mode — search and the
            mode toggle must never move or change behaviour between them. */}
        <header className="pda-bar" ref={barRef}>
          {isMobile ? (
            <>
              <div className="pda-bar-head">
                <ParkCount ready={parks.length > 0} count={displayedParks.length} />
                {/* Map | Grid — the same two modes desktop offers, with Map in
                    Explore's slot. List used to sit here; jumping straight to a
                    named park is what it was for, and search does that now. */}
                <div className="pda-view-toggle">
                  <ToggleButton label="Map" active={mode === "explore"}
                    onClick={() => setMode("explore")} glyph="map" />
                  <ToggleButton label="Grid" active={mode === "grid"}
                    onClick={() => setMode("grid")} glyph="grid" />
                </div>
              </div>
              {/* Full width on its own row, directly above the sheet it filters
                  — sharing a row with a now-worded toggle left it too narrow to
                  read as a field. */}
              <SearchField
                search={search} onSearch={setSearch}
                matches={suggestions} onPick={jumpToPark}
              />
            </>
          ) : (
            <>
              <div className="pda-bar-head">
                <ParkCount ready={parks.length > 0} count={displayedParks.length} />
              </div>
              <div className="pda-desktop-bar-row">
                <SearchField
                  wide search={search} onSearch={setSearch}
                  matches={suggestions} onPick={jumpToPark}
                />
                {/* The one element common to both states, so the way back from
                    Grid is the control that got you there. Not on the map's own
                    control cluster: Grid replaces the map, so a control anchored
                    there would have nowhere to live on the return trip. */}
                {/* MAP | GRID, the same two words mobile uses. Desktop called
                    this mode "Explore" while mobile called it "Map" — one mode
                    with two names, and "Grid" is a shape while "Explore" was a
                    verb, so the pair never read as two views of one thing. */}
                <div className="pda-view-toggle">
                  <ToggleButton label="Map" active={mode === "explore"}
                    onClick={() => setMode("explore")} glyph="explore" />
                  <ToggleButton label="Grid" active={mode === "grid"}
                    onClick={() => setMode("grid")} glyph="grid" />
                </div>
              </div>
            </>
          )}
        </header>

        {mode === null ? null : (
          <>
            {mode === "grid" && (
              <Suspense fallback={<div className="pda-empty">Loading grid…</div>}>
                {/* Out to the gutter edges like the map, so the sheet runs the
                    full content width on both breakpoints. */}
                <div style={{ margin: "0 calc(var(--pda-gutter) * -1)" }}>
                  <ParksGridView
                    search={search}
                    density={density}
                    onDensityChange={setDensity}
                  />
                </div>
              </Suspense>
            )}

            {/* Explore is hidden rather than unmounted while Grid is up, once
                it has been shown at least once. ParksMap keeps its Leaflet
                instance that way, so centre, zoom and the selected park are all
                still there on the way back — unmounting would not merely reset
                the map, it would re-run the "open a random London park" pass
                and return you somewhere you had never been. Its ResizeObserver
                calls invalidateSize when the box comes back, so nothing has to
                tell it it was hidden. */}
            {(mode === "explore" || exploreSeen.current) && (
              <div hidden={mode !== "explore"}>
                <Suspense fallback={<div className="pda-empty">Loading map…</div>}>
                  {/* position + z-index pen Leaflet's own panes (z-index 400 and
                      up) inside this box, so the sticky bar and its results
                      dropdown paint over the map rather than under it. */}
                  <div style={{
                    position: "relative", zIndex: 0,
                    // Both breakpoints measure the chrome above rather than
                    // guessing it. Desktop used a flat 170px, but nav plus the
                    // bar is 215px at 1280 — so the box hung 45px below the
                    // fold and took the card anchored to its bottom edge with
                    // it, costing a scroll to see the CTA.
                    height: "calc(100dvh - var(--nav-height, 44px) - var(--pda-bar-height, 132px))",
                    // Full bleed at both breakpoints. Contained chrome is not
                    // achieved by insetting this box: the list column carries the
                    // gutter as its own padding instead, so the map keeps the
                    // screen edge. The satellite/locate and zoom controls inset
                    // themselves from that edge by one gutter, which is what puts
                    // them under the toggle above.
                    margin: "0 calc(var(--pda-gutter) * -1)",
                  }}>
                    <ParksMap search={search} focus={focus} />
                  </div>
                </Suspense>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Search, plus the results that took over List's job of jumping straight to a
// named park. One component for both breakpoints: they differ only in the
// classes that size them, and the jump has to behave identically on each.
//
// A combobox rather than a bare field — the listbox is keyboard-reachable with
// the arrows, Enter takes the highlighted row and Escape closes without
// clearing what was typed. Rows suppress mousedown so the click lands before
// the input's blur can close the list out from under it.
function SearchField({
  wide = false, search, onSearch, matches, onPick,
}: {
  wide?: boolean;
  search: string;
  onSearch: (value: string) => void;
  matches: ParkRow[];
  onPick: (park: ParkRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const show = open && search.trim().length > 0 && matches.length > 0;

  const pick = (park: ParkRow) => { setOpen(false); setActive(-1); onPick(park); };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setOpen(false); setActive(-1); return; }
    if (!show) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => (i + 1) % matches.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => (i <= 0 ? matches.length : i) - 1); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(matches[active]); }
  };

  return (
    <div className={`pda-search-field${wide ? " pda-search-field-wide" : ""}`}>
      <div className={wide ? "pda-search-row" : "pda-search-compact"}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input
          type="text" placeholder="SEARCH" value={search}
          onChange={e => { onSearch(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          role="combobox" aria-expanded={show} aria-autocomplete="list"
          aria-controls="pda-suggest" aria-label="Search parks"
          aria-activedescendant={show && active >= 0 ? `pda-suggest-${active}` : undefined}
        />
      </div>
      {show && (
        <ul className="pda-suggest" id="pda-suggest" role="listbox" aria-label="Matching parks">
          {matches.map((park, i) => (
            <li key={park.id} id={`pda-suggest-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={`pda-suggest-row${i === active ? " pda-suggest-on" : ""}`}
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(park)}
              >
                <span className="pda-suggest-name">{park.name}</span>
                <span className="pda-suggest-area">{park.location ?? park.postcode ?? ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// "Parks · 24 places". Counts displayedParks, which uses the same predicate as
// filterParks in parksIndex — so the number always agrees with the List and Grid
// sheets below it. (ParksMap matches on name and location only, and layers its
// own region filter on top, so a searched map can show fewer pins than this.)
// The title shows straight away; only the count waits on the fetch. That keeps
// the row from flashing "0 places" and from changing height when the data lands
// — the non-breaking space holds the metadata line until there is a number.
function ParkCount({ ready, count }: { ready: boolean; count: number }) {
  return (
    <span className="pda-count">
      <span className="pda-count-title">Parks</span>
      <span className="pda-count-meta">
        {ready ? `${count} ${count === 1 ? "place" : "places"}` : " "}
      </span>
    </span>
  );
}

// Mode buttons: a glyph — a 3x3 grid mark, a folded map, and a split panel for
// Explore's list-beside-map — beside the word it stands for.
// aria-label and title stay: the visible word is the same string, so nothing
// changes for assistive tech, and the pressed state still needs announcing.
function ToggleButton({
  label, active, onClick, glyph,
}: {
  label: string; active: boolean; onClick: () => void;
  glyph: "grid" | "map" | "explore";
}) {
  return (
    <button
      type="button"
      className={`pda-icon${active ? " pda-active" : ""}`}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {glyph === "grid" && (<g fill="currentColor" stroke="none">
          {[3, 10, 17].map(y => [3, 10, 17].map(x => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" />))}
        </g>)}
        {glyph === "map" && (<><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" /><path d="M15 5.764v15" /><path d="M9 3.236v15" /></>)}
        {glyph === "explore" && (<><rect x="3" y="4" width="18" height="16" rx="1.5" /><line x1="10" y1="4" x2="10" y2="20" /><line x1="5.5" y1="9" x2="7.5" y2="9" /><line x1="5.5" y1="13" x2="7.5" y2="13" /></>)}
      </svg>
      {label}
    </button>
  );
}
