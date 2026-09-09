"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import { useTheme } from "./ThemeProvider";
import { fixtureCount, makeFixtureParks } from "@/lib/devParkFixtures";
import {
  rememberDirectoryOrigin, saveMapSnapshot, readMapSnapshot,
} from "./parksGridState";
import {
  ParkCard, ParkCardThumbnail, ParkCardCTA, ParkCutout, ParkOpenLink, parkHasCutout,
} from "./ParkCard";

type Park = {
  id: string; slug: string; name: string; postcode: string; location: string;
  borough: string; lat: number; lng: number; type: string;
  is_covered: boolean; is_free: boolean; opened: string; builder: string;
  hero_image: string; brief: string;
  catalogue_id: string | null; sort_order: number | null;
  directory_image_url: string | null;
  address: string[] | null;
};

const REGION_BOUNDS: Record<string,[[number,number],[number,number]]> = {
  "All":        [[49.5,-8.0],[61.0, 2.0]],
  "London":     [[51.30,-0.60],[51.80,0.40]],
  "South East": [[50.7,-1.8],[51.9,1.5]],
  "South West": [[49.9,-5.7],[51.9,-1.8]],
  "Midlands":   [[51.9,-3.2],[53.3,0.2]],
  "North West": [[53.2,-3.2],[54.7,-1.8]],
  "North East": [[53.3,-2.2],[55.8,0.1]],
  "Scotland":   [[54.6,-7.6],[60.9,0.0]],
  "Wales":      [[51.3,-5.3],[53.5,-2.6]],
};


// Two states, not three. There was an "expanded" one, reached by a chevron, a
// tap on the sheet or an upward swipe; all it added was the attributes line
// ("BOWL / FREE"), which is on the park's own page and in the desktop bar.
// A control, two gestures and a third state for one line of tier-3 metadata
// was not a trade worth keeping on a phone.
type CardState = "hidden" | "peek";

// A first estimate of the selected-park overlay's height, used to offset the
// map's pan so the selected marker is never parked underneath it. Only ever
// used for the very first selection, before the overlay has been rendered and
// measured: `overlayH` below carries the real number from a ResizeObserver
// from then on. It is an estimate rather than the truth because the overlay's
// height is now set by CSS clamps against the viewport, so no constant here
// could be right at every width.
const PEEK_H = 186;
// Below this much map height the preview tightens: smaller art on the desktop
// strip, no art at all on a landscape phone, and less padding on both.
const SHORT_H = 440;
// How long a park swap takes, shared by the artwork's slide, the text's fade
// and the timer that clears the direction. 220ms sits in the middle of the
// 200-250ms the interaction brief asked to trial.
const SWAP_MS = 220;

// Honoured by hand where a scroll is driven from script: the reduced-motion
// media query reaches CSS transitions and animations, but a smooth scrollBy is
// neither, so it would keep animating for a reader who asked it not to.
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * Previous / position / next for the selected-park preview.
 *
 * Replaces a row of dots. Dots needed a sliding seven-wide window to survive a
 * real catalogue, and even then said nothing useful — "one of these seven" is
 * not a position in a directory of hundreds. A count is shorter to read and
 * true at any length.
 *
 * Real buttons with real labels, not glyphs with click handlers: this is how a
 * keyboard or screen-reader user steps through the results at all. The count
 * is aria-hidden because the live region below announces position along with
 * the park's name, and having both would say it twice.
 *
 * Nothing renders when there is nothing to step through — one result, or none.
 */
function ParkStepper({
  idx, total, canPrev, canNext, onStep, onGuard, className = "",
}: {
  idx: number; total: number;
  canPrev: boolean; canNext: boolean;
  onStep: (dir: 1 | -1) => void;
  /** Returns true when the click was the tail of a drag and should be ignored. */
  onGuard?: (e: React.MouseEvent) => boolean;
  className?: string;
}) {
  if (total <= 1) return null;
  return (
    <div className={`pms-step ${className}`.trim()}>
      <button
        type="button" className="pms-step-btn" aria-label="Previous park"
        disabled={!canPrev} onClick={e => { e.stopPropagation(); if (onGuard?.(e)) return; onStep(-1); }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      {/* Hidden from assistive tech, not from sight: the live region carries
          the same information with the park's name attached. */}
      <span className="pms-step-count" aria-hidden>
        {idx >= 0 ? `${idx + 1} of ${total}` : `${total} parks`}
      </span>
      <button
        type="button" className="pms-step-btn" aria-label="Next park"
        disabled={!canNext} onClick={e => { e.stopPropagation(); if (onGuard?.(e)) return; onStep(1); }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );
}

// Tile sources. CARTO retired anonymous access to their tile CDN, so each layer
// picks a provider at runtime depending on whether a Mapbox token is present:
//
//  - Mapbox when NEXT_PUBLIC_MAPBOX_TOKEN is set, which is the closer match to
//    the CARTO styles this replaced.
//  - Esri otherwise. Esri needs no credential at all, which is what keeps the
//    map drawing in an environment where the token was never provisioned.
//
// That fallback is not hypothetical: the token is set in .env.local but not on
// the deploy host, so `${token}` interpolated as the literal string "undefined"
// and every tile 401'd, leaving a blank map on the live site. Whichever way the
// token question is settled, the map now renders.
//
// Esri's endpoints order the path {z}/{y}/{x}, not Leaflet's usual {z}/{x}/{y}.
// maxNativeZoom is the deepest level a source actually holds imagery for, as
// opposed to maxZoom, which is how far the map lets you zoom. Leaflet upscales
// the last real tile between the two. Esri's Gray Canvas stops at 16 and its
// aerial imagery at 19, and past those it answers 200 with a "Map data not yet
// available" placeholder rather than a 404 — so a status check reports the
// tiles as fine while the map fills with grey. Without maxNativeZoom that
// placeholder is what a reader sees on any park at close zoom.
type TileSource = {
  url: string;
  options: { attribution: string; maxZoom: number; maxNativeZoom?: number };
};

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

function basemap(theme: string, token: string | undefined): TileSource {
  const light = theme === "light";
  if (token) {
    return {
      url: `https://api.mapbox.com/styles/v1/mapbox/${light ? "light-v11" : "dark-v11"}/tiles/256/{z}/{x}/{y}?access_token=${token}`,
      options: { attribution: "© Mapbox © OpenStreetMap", maxZoom: 19 },
    };
  }
  return {
    url: `${ESRI}/Canvas/${light ? "World_Light_Gray_Base" : "World_Dark_Gray_Base"}/MapServer/tile/{z}/{y}/{x}`,
    options: { attribution: "© Esri © OpenStreetMap contributors", maxZoom: 19, maxNativeZoom: 16 },
  };
}

function satelliteMap(token: string | undefined): TileSource {
  if (token) {
    return {
      url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}?access_token=${token}`,
      options: { attribution: "© Mapbox © OpenStreetMap", maxZoom: 19 },
    };
  }
  return {
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    options: { attribution: "© Esri, Maxar, Earthstar Geographics", maxZoom: 19, maxNativeZoom: 19 },
  };
}

export default function ParksMap({
  search,
  focus = null,
}: {
  search: string;
  // A park to open from outside — the directory's search dropdown picks one and
  // wants exactly what tapping its pin does. Carries a sequence number rather
  // than a bare id so picking the same park twice re-centres it instead of
  // being swallowed as an unchanged prop.
  focus?: { id: string; seq: number } | null;
}) {
  const [parks, setParks] = useState<Park[]>([]);
  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRefs   = useRef<Record<string,any>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const indexRef     = useRef<HTMLDivElement>(null);
  const cardRef      = useRef<HTMLDivElement>(null);
  // The whole selected-park overlay — the mobile sheet including its dot row,
  // or the desktop strip. Distinct from cardRef, which is the mobile sheet's
  // draggable body and so measures short by the height of the dots.
  const overlayRef   = useRef<HTMLDivElement>(null);
  // Whether the saved map view has been consumed yet. Declared here rather
  // than beside the effect that uses it because `snapshot` below has to read
  // it, and nothing may overwrite the stored view before it has been read.
  const restoredRef  = useRef(false);
  const userChangedFilter   = useRef(false);

  const { theme } = useTheme();

  const [activeFilter] = useState("All");
  const [satellite,    setSatellite]    = useState(false);
  const [isMobile,     setIsMobile]     = useState(true);
  const [mapStatus,    setMapStatus]    = useState<"loading"|"ready"|"error">("loading");
  const [mapError,     setMapError]     = useState("");
  const [selectedPark, setSelectedPark] = useState<Park|null>(null);
  // Preview, not selection. Hovering or keyboard-focusing a row or a marker
  // lights the other one and nothing else: no camera move, no strip change, no
  // commitment. Selection is the persistent answer to "which park"; this is
  // the transient answer to "which one am I pointing at", and where the two
  // disagree selection wins visually.
  const [hoveredId, setHoveredId] = useState<string|null>(null);
  const [cardState,    setCardState]    = useState<CardState>("hidden");
  const [shortView,    setShortView]    = useState(false);
  const [slideDir,     setSlideDir]     = useState<"left"|"right"|null>(null);
  // The park being stepped away from, kept mounted for the length of the swap
  // so its artwork can leave while the next one arrives. Only ever set by the
  // stepper and the swipe — a selection made from a list row or a marker has
  // no direction to travel in, and gets the plain crossfade instead.
  const [outgoing,     setOutgoing]     = useState<{ park: Park; dir: 1 | -1 } | null>(null);
  const artRef  = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [locateTip,    setLocateTip]    = useState(false);
  const [locateError,  setLocateError]  = useState("");
  // How much of the map's bottom edge the preview is actually covering.
  //
  // Measured rather than assumed. Everything that has to clear the preview —
  // the pan offset that keeps the selected marker visible, and the locate
  // button — used to read `cardRef.current?.offsetHeight` with PEEK_H as a
  // fallback. In a style attribute that is a read of a ref during render, so
  // it reported the *previous* park's height and never re-ran when the height
  // changed; and one constant cannot describe an overlay whose height is now
  // clamped against the viewport. A ResizeObserver covers every way it moves:
  // selection changes, breakpoint changes, window resize, and art loading.
  const [overlayH,     setOverlayH]     = useState(PEEK_H);
  const didDragRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zoomControlRef = useRef<any>(null);

  // Measured here as well as in the map box's ResizeObserver below: the
  // observer only reports once a reflow happens, so on the first paint of an
  // already-short window the card would render full-height and clip before
  // anything resized. This runs on mount and on every window resize; the
  // observer still covers reflows the window never hears about (the list
  // column appearing, the bar changing height).
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 900);
      const h = containerRef.current?.clientHeight ?? 0;
      if (h > 0) setShortView(h < SHORT_H);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // One-time "Recenter map" tooltip on the locate button — shown once ever per browser
  useEffect(() => {
    if (!localStorage.getItem("fbs-locate-tip-seen")) setLocateTip(true);
  }, []);
  const dismissLocateTip = useCallback(() => {
    setLocateTip(false);
    localStorage.setItem("fbs-locate-tip-seen", "1");
  }, []);

  // Fetch parks from Supabase
  useEffect(() => {
    import("@supabase/supabase-js").then(({ createClient }) => {
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      db.from("parks")
        .select("id, slug, name, postcode, location, borough, lat, lng, type, is_covered, is_free, opened, builder, hero_image, brief, catalogue_id, sort_order, directory_image_url, address")
        .eq("published", true)
        .order("sort_order", { ascending: true })
        .then(({ data }) => {
          if (!data) return;
          const real = data as Park[];
          // Dev-only, and only when the URL asks. See lib/devParkFixtures —
          // this whole branch is eliminated from a production build.
          const n = fixtureCount(window.location.search);
          setParks(n ? [...real, ...makeFixtureParks(n, real.length + 1) as Park[]] : real);
        });
    });
  }, []);

  // ── Leaflet init (map only, no markers yet) ──
  useEffect(() => {
    if (mapRef.current) return;
    let cancelled = false;
    import("leaflet").then(({ default: L }) => {
      if (cancelled) return;
      const el = containerRef.current;
      if (!el) { setMapStatus("error"); setMapError("Map container not found"); return; }
      try {
        const map = L.map(el, { center:[54.2,-3.5], zoom:6, zoomControl:false });
        const base = basemap(theme, MAPBOX_TOKEN);
        tileLayerRef.current = L.tileLayer(base.url, base.options).addTo(map);
        mapRef.current = map;
        setMapStatus("ready");
      } catch(err) { setMapStatus("error"); setMapError(String(err)); }
    }).catch(err => { if (!cancelled) { setMapStatus("error"); setMapError(String(err)); } });
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Attribution corner ────────────────────────────────────────────────
  // Leaflet puts attribution bottom-right, which is where the sheet's artwork
  // slot is on mobile: the park is drawn over the credit and makes it
  // unreadable. Lifting the whole bottom row higher would clear it, but that
  // is paid for on desktop too, where the artwork is nowhere near that corner
  // and the zoom control would end up floating well up the map for no reason.
  // Moving the credit to the corner the artwork is not in costs nothing —
  // bottom-left is empty above the sheet, since the sheet's own text sits
  // below it and the carousel dots are centred.
  useEffect(() => {
    if (mapStatus !== "ready") return;
    const map = mapRef.current;
    map?.attributionControl?.setPosition(isMobile ? "bottomleft" : "bottomright");
  }, [isMobile, mapStatus]);

  // ── Zoom control: desktop only — mobile relies on native pinch-to-zoom ──
  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current) return;
    import("leaflet").then(({ default: L }) => {
      if (!mapRef.current) return;
      if (isMobile) {
        if (zoomControlRef.current) { zoomControlRef.current.remove(); zoomControlRef.current = null; }
      } else if (!zoomControlRef.current) {
        zoomControlRef.current = L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
      }
    });
  }, [isMobile, mapStatus]);

  // ── Add markers once both the map and parks are ready ──
  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || parks.length === 0) return;
    import("leaflet").then(({ default: L }) => {
      parks.forEach(park => {
        if (markerRefs.current[park.id]) return; // already added
        if (!park.lat || !park.lng) return;
        // A survey point, not a pin: one circle, styled from a stylesheet
        // rather than from inline strings, so default/hover/selected are three
        // classes instead of six style assignments per marker per render.
        const dot = L.divIcon({
          className: "pms-marker",
          html: `<span class="pms-marker-dot"></span>`,
          iconSize: [22, 22], iconAnchor: [11, 11],
        });
        const m = L.marker([park.lat, park.lng], { icon: dot, keyboard: true })
          .addTo(mapRef.current)
          .on("click", () => openPark(park))
          // Preview only — the map must not move and nothing must be selected.
          .on("mouseover", () => setHoveredId(park.id))
          .on("mouseout", () => setHoveredId(null));
        markerRefs.current[park.id] = m;

        const el: HTMLElement | undefined = m.getElement?.();
        if (el) {
          // Leaflet gives markers a tabindex but no accessible name, so a
          // keyboard user met a row of unlabelled dots.
          el.setAttribute("role", "button");
          el.setAttribute("aria-label", `${park.name} skatepark`);
          // Keyboard focus earns the same preview relationship as hover.
          el.addEventListener("focus", () => setHoveredId(park.id));
          el.addEventListener("blur", () => setHoveredId(null));
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parks, mapStatus]);

  // Keep Leaflet's internal size/pixel-origin in sync with the container's
  // actual box — the container is shared across mobile/desktop layouts and
  // resizes whenever the list column mounts/unmounts, which is a pure CSS
  // flex reflow (no window "resize" event fires). ResizeObserver covers the
  // general case; the isMobile-keyed call below covers the list column
  // toggling specifically, since that's a same-tick layout change that can
  // race the observer's first callback.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
      const h = containerRef.current?.clientHeight ?? 0;
      if (h > 0) setShortView(h < SHORT_H);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapStatus]);

  useEffect(() => {
    if (!mapRef.current) return;
    const id = setTimeout(() => mapRef.current?.invalidateSize(), 60);
    return () => clearTimeout(id);
  }, [isMobile]);

  // On load, in priority order:
  //   1. a focus request (a search pick, or ?park= on the URL) — the caller
  //      has named the park and owns the camera
  //   2. the snapshot this tab left behind, if there is one
  //   3. a random London park
  //
  // 2 is what makes "Back to map" mean anything. Restoring the centre and zoom
  // without re-selecting would come back to the right place with no preview,
  // and re-selecting through openPark would pan the camera off the restored
  // centre — so the selection is set directly and only the card state comes
  // from openPark's usual path.
  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || parks.length === 0) return;
    if (focus || restoredRef.current) return;
    restoredRef.current = true;

    const snap = readMapSnapshot();
    if (snap) {
      mapRef.current.setView([snap.lat, snap.lng], snap.zoom, { animate: false });
      const park = snap.selectedSlug
        ? parks.find(p => p.slug === snap.selectedSlug)
        : undefined;
      if (park) {
        setSelectedPark(park);
        setCardState("peek");
      }
      if (snap.listScroll && indexRef.current) indexRef.current.scrollTop = snap.listScroll;
      return;
    }

    const londonParks = parks.filter(p => p.location?.includes("London") && p.lat != null && p.lng != null);
    if (!londonParks.length) return;
    const park = londonParks[Math.floor(Math.random() * londonParks.length)];
    mapRef.current.setView([park.lat, park.lng], 14, { animate: false });
    openPark(park);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStatus, parks]);

  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then(({ default: L }) => {
      if (tileLayerRef.current) { tileLayerRef.current.remove(); tileLayerRef.current = null; }
      const src = satellite ? satelliteMap(MAPBOX_TOKEN) : basemap(theme, MAPBOX_TOKEN);
      tileLayerRef.current = L.tileLayer(src.url, src.options).addTo(mapRef.current);
    });
  }, [satellite, theme, MAPBOX_TOKEN]);

  // Keep overlayH honest. Reads the overlay live rather than trusting the
  // observer's first callback, so the height is right on the frame the
  // preview appears rather than one frame later.
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const measure = () => setOverlayH(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [selectedPark?.id, cardState, isMobile, shortView]);

  // ── The park swap ─────────────────────────────────────────────────────
  // Two different animations on purpose. The artwork travels, because it is
  // the thing being browsed and the direction says which way through the
  // catalogue you are going. The text only fades: its box, its baselines and
  // its reserved title height are the whole point of the layout above, and
  // sliding the identity block would undo it.
  //
  // Driven from script rather than CSS because a park change reuses the same
  // DOM nodes — a CSS animation would have to be restarted by remounting, and
  // remounting the artwork means reloading its image. The Web Animations API
  // restarts on demand and leaves the elements alone.
  useEffect(() => {
    if (!selectedPark || prefersReducedMotion()) return;
    const ease = "cubic-bezier(0.2, 0, 0, 1)";
    // No direction for a selection made from a row or a marker — those are
    // jumps, not steps, and an arbitrary left-or-right journey would be
    // inventing a relationship between two parks that has none.
    const from = slideDir === "left" ? 34 : slideDir === "right" ? -34 : 0;
    artRef.current?.animate(
      [{ opacity: 0, transform: `translateX(${from}px)` }, { opacity: 1, transform: "none" }],
      { duration: SWAP_MS, easing: ease },
    );
    textRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: SWAP_MS, easing: ease });
  // slideDir is deliberately not a dependency: it is set in the same commit as
  // the selection and read here, and listing it would re-run this when the
  // timer clears it a fifth of a second later.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPark?.id]);

  // ── Persisting the map view across a park visit ───────────────────────
  // Leaving for a park page unmounts all of this, so without a snapshot the
  // way back lands on the initial view — and the initial view runs the "open a
  // random London park" pass, which returns a reader somewhere they have never
  // been. Written on every settle rather than on the way out: there is no
  // reliable unload hook for a client-side navigation, and a moveend handler
  // costs nothing next to what the map is already doing.
  const snapshot = useCallback(() => {
    // Nothing is written until the stored view has been read back. Leaflet
    // fires moveend as it sets its own initial view, and the parks list — which
    // the restore needs to resolve the selected slug — only arrives after the
    // Supabase round trip. So the map's opening position was overwriting the
    // saved one several hundred milliseconds before anything tried to use it,
    // and "Back to map" came back to the default UK view every time.
    if (!restoredRef.current) return;
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter?.();
    if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return;
    saveMapSnapshot({
      lat: c.lat, lng: c.lng, zoom: map.getZoom(),
      selectedSlug: selectedPark?.slug ?? null,
      listScroll: indexRef.current?.scrollTop ?? 0,
    });
  }, [selectedPark?.slug]);

  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current) return;
    const map = mapRef.current;
    map.on("moveend", snapshot);
    map.on("zoomend", snapshot);
    return () => { map.off("moveend", snapshot); map.off("zoomend", snapshot); };
  }, [mapStatus, snapshot]);

  // Selection is not a map event, and the list's scroll is not either.
  useEffect(() => { if (mapStatus === "ready") snapshot(); }, [selectedPark?.id, mapStatus, snapshot]);
  useEffect(() => {
    const el = indexRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; snapshot(); });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [isMobile, snapshot]);

  const panTo = useCallback((park: Park) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    // The overlay covers the map's bottom edge, so the marker has to sit half
    // that height above centre to stay in the part of the map still visible.
    // Reads the DOM first and falls back to the measured state: the very first
    // selection pans before the overlay has ever been rendered, and only then
    // is the PEEK_H estimate behind overlayH's initial value in play.
    const cardOffset = overlayRef.current?.offsetHeight || overlayH;
    const pt = map.latLngToContainerPoint([park.lat, park.lng]);
    // The camera travel is motion too. A reader who has asked for less of it
    // gets the same destination, arrived at instantly — the CSS media query
    // never reaches Leaflet, so it has to be honoured by hand here.
    const reduce = prefersReducedMotion();
    map.panTo(map.containerPointToLatLng(pt.add([0, cardOffset / 2])),
      { animate: !reduce, duration: reduce ? 0 : 0.4 });
  }, [overlayH]);

  useEffect(() => {
    if (!mapRef.current || !userChangedFilter.current) return;
    const bounds = REGION_BOUNDS[activeFilter];
    if (!bounds) return;
    const pad = cardState !== "hidden" ? overlayH + 16 : 24;
    const reduce = prefersReducedMotion();
    mapRef.current.fitBounds(bounds, {
      animate: !reduce, duration: reduce ? 0 : 0.6,
      paddingTopLeft:[24,24], paddingBottomRight:[24, pad],
    });
  }, [activeFilter, cardState, overlayH]);

  const filteredParks = parks.filter(p => {
    const mF = activeFilter === "All" || p.location.includes(activeFilter) || p.borough.includes(activeFilter);
    const mS = p.name.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase());
    return mF && mS;
  });

  // ── Where the selected park sits in what is currently on screen ──────
  //
  // Derived from the selection and the current results, never stored. It was
  // a piece of state, set when a park was opened and when the carousel
  // stepped — and nothing recomputed it when the search string changed the
  // results underneath it. Type a query and the index kept pointing at a
  // position in the old array: the counter read wrong and stepping jumped to
  // whatever park now happened to sit at that offset. There is no correct
  // moment to "resync" a value like that, so it stops being a value.
  //
  // -1 means the selected park is not in the current results — it can be
  // filtered out while staying selected on the map. Stepping is disabled
  // there rather than guessing an anchor, and the position indicator hides:
  // "3 of 24" would be a lie about a park that is not one of the 24.
  const carouselIdx = selectedPark
    ? filteredParks.findIndex(p => p.id === selectedPark.id)
    : -1;
  // Bounded, not wrapping. A catalogue of hundreds that silently loops from
  // the last park back to the first gives no sense of an end; disabled
  // controls do.
  const canStepPrev = carouselIdx > 0;
  const canStepNext = carouselIdx >= 0 && carouselIdx < filteredParks.length - 1;

  useEffect(() => {
    Object.entries(markerRefs.current).forEach(([id, marker]) => {
      const visible = filteredParks.some(p => p.id === id);
      const el: HTMLElement | undefined = marker.getElement?.();
      if (!el) return;
      const sel = selectedPark?.id === id;
      // Selection wins: a park that is both selected and hovered reads as
      // selected, so pointing at the current park never demotes it.
      el.classList.toggle("is-selected", sel);
      el.classList.toggle("is-hovered", !sel && hoveredId === id);
      el.classList.toggle("is-filtered-out", !visible);
      el.setAttribute("aria-current", sel ? "true" : "false");
      el.style.pointerEvents = visible ? "auto" : "none";
    });
  }, [selectedPark, hoveredId, filteredParks]);

  const openPark = useCallback((park: Park) => {
    setSelectedPark(park);
    setCardState("peek");
    panTo(park);
  }, [panTo]);

  // Consume a focus request once. The effect re-runs as the map turns ready and
  // the parks land, so the seq already handled is tracked rather than trusting
  // it to fire exactly once.
  const focusHandled = useRef<number | null>(null);
  useEffect(() => {
    if (!focus || mapStatus !== "ready" || parks.length === 0) return;
    if (focusHandled.current === focus.seq) return;
    const park = parks.find(p => p.id === focus.id);
    if (!park) return;
    focusHandled.current = focus.seq;
    openPark(park);
  }, [focus, mapStatus, parks, openPark]);

  // Attributes are not in the sheet. Measured both ways at 390x844: with them
  // the sheet is 199px, without it is 172px — 16% taller for a line that
  // answers neither of the two questions the map is being asked ("where is
  // it", "what does it look like"). They are on the park's own page, which the
  // orange arrow opens, and in the desktop bar where there is room.
  const peekDensity = "standard" as const;

  // A park picked on the map may be a park whose row is scrolled out of the
  // index. Bring it back into view so the two halves keep agreeing about what
  // is selected. `block: "nearest"` is what keeps this restrained: a row that
  // is already visible is not moved at all, so clicking rows never scrolls the
  // list under the pointer. Hover deliberately does not call this — an index
  // that chases the cursor is unusable.
  useEffect(() => {
    const list = indexRef.current;
    // Read the row out of the DOM rather than off a ref. The ref this replaces
    // was a single one attached to whichever row happened to be selected, via
    // ref={isSelected ? rowRef : undefined}, so its value depended on React
    // detaching the outgoing row before attaching the incoming one. That
    // ordering does hold today, and no failure was traced to it — this is
    // removing the dependency on it, not fixing an observed bug. A query run
    // after commit is unconditionally in step with what is rendered, and it
    // costs one selector on an interaction that already re-rendered the list.
    const row = list?.querySelector<HTMLElement>(".pms-index-row.pms-active");
    if (!row || !list || !selectedPark) return;
    // Scroll the list, and only the list, and only when the row is actually
    // out of sight. scrollIntoView({block:"nearest"}) was close to this but
    // not the same thing: it walks every scrollable ancestor, so on a short
    // window it scrolled the *page* to bring the map's list into view, and
    // choosing a park on the map jumped the whole document. Measuring against
    // the list's own box and setting scrollTop keeps the effect inside the
    // column, which is what "reveal the row" was always supposed to mean.
    const r = row.getBoundingClientRect();
    const l = list.getBoundingClientRect();
    if (r.top >= l.top && r.bottom <= l.bottom) return; // already visible: do nothing
    // Bring it just inside the edge it is past, rather than centring — a row
    // one pixel below the fold should rise one pixel, not jump to the middle.
    const delta = r.top < l.top ? r.top - l.top : r.bottom - l.bottom;
    list.scrollBy({ top: delta, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [selectedPark?.id]);

  const navigate = useCallback((dir: 1 | -1) => {
    if (carouselIdx < 0) return;                 // selection is outside the results
    const next = carouselIdx + dir;
    if (next < 0 || next >= filteredParks.length) return;   // bounded: no wrap
    setSlideDir(dir === 1 ? "left" : "right");
    if (!prefersReducedMotion() && selectedPark) setOutgoing({ park: selectedPark, dir });
    setSelectedPark(filteredParks[next]);
    panTo(filteredParks[next]);
    setTimeout(() => { setSlideDir(null); setOutgoing(null); }, SWAP_MS);
  }, [carouselIdx, filteredParks, panTo, selectedPark]);

  const nearMe = useCallback(() => {
    dismissLocateTip();
    setLocateError("");
    if (!navigator.geolocation || !mapRef.current) {
      setLocateError("Location isn't available in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const reduce = prefersReducedMotion();
        mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 12,
          { animate: !reduce, duration: reduce ? 0 : 1 });
      },
      err => setLocateError(err.code === err.PERMISSION_DENIED ? "Location access denied" : "Couldn't get your location"),
      { timeout: 10000 }
    );
  }, [dismissLocateTip]);

  useEffect(() => {
    if (!locateError) return;
    const id = setTimeout(() => setLocateError(""), 4000);
    return () => clearTimeout(id);
  }, [locateError]);

  // ── Browsing gestures ─────────────────────────────────────────────────
  // Pointer Events, not Touch Events. One code path then covers a finger on a
  // phone, a finger on an iPad that is wide enough to be running the *desktop*
  // layout, a mouse drag and a pen — where the touch-only version was bound to
  // the mobile sheet alone, so an iPad in landscape (the split map/list layout)
  // had no way to swipe between parks at all. The handlers below are spread
  // onto both bars; nothing about them is breakpoint-specific.
  //
  // Gestures start inside the bar and nowhere else. Anything beginning on the
  // map — including on the strip of map behind the artwork's overhang, which
  // is pointer-transparent — never reaches these and still pans Leaflet.
  const AXIS_LOCK_PX = 10;   // travel before the gesture commits to an axis
  const STEP_PX      = 50;   // travel before a horizontal drag counts as a step
  const gestureRef = useRef<{ id: number; x: number; y: number; axis: "h" | "v" | null } | null>(null);

  const onGestureDown = (e: React.PointerEvent) => {
    // Primary button only: a right-click or a middle-click drag is not a swipe.
    if (e.button !== 0) return;
    gestureRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: null };
    didDragRef.current = false;
  };

  const onGestureMove = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (!g.axis && Math.max(adx, ady) > AXIS_LOCK_PX) {
      // Biased towards vertical: a gesture has to be clearly sideways to be a
      // step, so a scroll that wanders a little never changes park. A vertical
      // lock does nothing at all — it is recorded only so the rest of the
      // gesture is ignored rather than reconsidered pixel by pixel.
      g.axis = adx > ady * 1.4 ? "h" : "v";
      if (g.axis === "h") {
        didDragRef.current = true;
        // Follow the pointer even if it leaves the bar mid-drag, and stop the
        // browser reading it as a text selection.
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* not captureable */ }
      }
    }
    if (g.axis === "h") e.preventDefault();
  };

  const onGestureEnd = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g || g.id !== e.pointerId || g.axis !== "h") return;
    const dx = e.clientX - g.x;
    if (dx <= -STEP_PX) navigate(1);
    else if (dx >= STEP_PX) navigate(-1);
  };

  // Spread onto both preview bars — see the note above.
  const swipeHandlers = {
    onPointerDown: onGestureDown,
    onPointerMove: onGestureMove,
    onPointerUp: onGestureEnd,
    onPointerCancel: onGestureEnd,
  };

  // A drag that happens to finish over a link or a button must not also
  // activate it. Shared by the open arrow, the labelled CTA and the stepper,
  // because a swipe can start or end on any of them.
  const swallowIfDragged = (e: React.MouseEvent) => {
    if (didDragRef.current) { e.preventDefault(); e.stopPropagation(); return true; }
    return false;
  };

  // ── Mobile: photographic peek, expanding to detail ────────────────────
  // Collapsed shows a shallow photographic strip over the identity block. The
  // photograph is not decoration here: on a map the two questions are "where
  // is it" and "what does it look like", and the terrain is how a reader
  // answers the second. The old sheet answered it with a 192px image that ate
  // 57% of the map; this answers it with an 80px crop that costs a quarter of
  // that. See PEEK_IMAGE_H.
  // The art band is dropped on a landscape phone and only there: the map
  // canvas is about 175px tall, and a band plus the identity block would be
  // taller than the map it sits on. Geography stays; the artwork is what a
  // reader gives up for a 175px map, in both states — expanding on a landscape
  // phone must not bring back the thing that did not fit.
  const showArt = !shortView;
  // A cutout leaves the page colour showing where a photograph would be, and a
  // white grip is invisible against a light page. See .pms-peek--art.
  const cutout = selectedPark ? parkHasCutout(selectedPark) : false;
  const floatingCard = selectedPark && (
    <div
      ref={overlayRef}
      className={`pms-sheet pms-peek${shortView ? " pms-peek--short" : ""}${cutout && showArt ? " pms-peek--art" : ""}`}
      style={{ position:"absolute", left:0, right:0, bottom:0, zIndex:25, isolation:"isolate" }}
    >
      <ParkStepper
        className="pms-step--sheet"
        idx={carouselIdx} total={filteredParks.length}
        canPrev={canStepPrev} canNext={canStepNext} onStep={navigate}
        onGuard={swallowIfDragged}
      />
      <div
        ref={cardRef}
        className="pms-peek-body"
        {...swipeHandlers}

      >
        <div className="pms-peek-grip" aria-hidden />

        {/* A park with only a photograph keeps the band across the top of the
            sheet — a rectangle cannot straddle the bar's edge the way a cutout
            can, and hanging one over the map would read as a torn-out picture.
            Identical in both states, deliberately: expanding used to swap this
            shallow band for a full-width 16:10 photograph, which cost more
            than half the map and moved everything under it the moment a reader
            asked for one more line of text. */}
        <div className="pms-peek-id pms-peek-id--row">
          {/* Same reserved-area rule as the desktop bar: the artwork column is
              a breakpoint constant, so the title beside it starts in the same
              place for every park. Held even for a park with no artwork at
              all — see .pms-peek-art. */}
          {showArt && (
            <div className="pms-peek-art">
              {outgoing && (
                <div className="pms-art-exit" data-dir={outgoing.dir} aria-hidden>
                  <ParkCutout park={outgoing.park} />
                </div>
              )}
              <div ref={artRef} className="pms-art-live">
                {cutout
                  ? <ParkCutout park={selectedPark} />
                  : <ParkCardThumbnail park={selectedPark} variant="peek" />}
              </div>
            </div>
          )}
          <div className="pms-peek-text" ref={textRef}>
            <ParkCard park={selectedPark} density={peekDensity} />
          </div>
          {/* The action slot: a reserved 44px column holding the one control
              the sheet has. Reserved rather than sized to its contents, so the
              park name beside it can never run into it. */}
          <div className="pms-peek-actions">
            <ParkOpenLink
              park={selectedPark}
              // A swipe that happens to start on the arrow still ends with a
              // click on it, and the browser only suppresses that click for
              // gestures it handled itself — these are handled in JS, so it
              // does not. Without this guard, swiping to the next park from
              // the arrow opened the park you were swiping away from.
              onClick={e => {
                if (swallowIfDragged(e)) return;
                rememberDirectoryOrigin("explore", selectedPark.slug);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ── Desktop: bottom information strip ─────────────────────────────────
  // Attached to the foot of the map rather than floating at its bottom-left.
  // The old card sat directly against the index column, so the two read as one
  // ~700px block down the left of the viewport and geography was pushed into
  // the right half. A strip spans the map instead: it costs ~14% of the map's
  // height instead of 55%, and because the axis is horizontal the park name is
  // no longer competing with a fixed-width button for a 76px column.
  const splitCard = selectedPark && (
    <div
      ref={overlayRef}
      className={`pms-panel pms-strip${shortView ? " pms-strip--short" : ""}`}
      {...swipeHandlers}
    >
      {/* The reserved artwork area, and it is reserved whatever is in it — a
          cutout, a photograph, or nothing at all when a park has neither or its
          file 404s. That is the whole point of it: its width is a property of
          the breakpoint, never of the selected park, so the title beside it
          starts in the same place for every park in the catalogue. Sizing this
          to each silhouette instead moved the title's left edge by up to 56px
          between Bloblands and Crystal Palace. */}
      <div className="pms-strip-art">
        {/* The park being left, on its way out. Absolutely positioned over the
            same reserved area so it cannot affect the bar's height, and paired
            with its own park — never the new name over the old picture. It is
            aria-hidden and pointer-transparent like every cutout, so a second
            copy for a fifth of a second adds nothing focusable or readable. */}
        {outgoing && (
          <div className="pms-art-exit" data-dir={outgoing.dir} aria-hidden>
            <ParkCutout park={outgoing.park} />
          </div>
        )}
        <div ref={artRef} className="pms-art-live">
          {cutout
            ? <ParkCutout park={selectedPark} />
            : <ParkCardThumbnail park={selectedPark} variant="strip" />}
        </div>
      </div>
      <div className="pms-strip-id" ref={textRef}>
        <ParkCard park={selectedPark} density={shortView ? "standard" : "expanded"} />
      </div>
      <div className="pms-strip-cta">
        {/* Stepping lives with the action rather than under the artwork: both
            are things you do, and the identity block between them stays a
            block of statements. It shifts View park left by a fixed amount —
            the same amount for every park, so no anchor moves as you browse. */}
        <ParkStepper
          idx={carouselIdx} total={filteredParks.length}
          canPrev={canStepPrev} canNext={canStepNext} onStep={navigate}
          onGuard={swallowIfDragged}
        />
        {/* Both actions are rendered and CSS shows one — see .pms-strip-cta.
            Which is appropriate is a question about the bar's width, and the
            bar's width is not something this component measures. */}
        <ParkCardCTA
          slug={selectedPark.slug}
          onClick={e => {
            if (swallowIfDragged(e)) return;
            rememberDirectoryOrigin("explore", selectedPark.slug);
          }}
        />
        <ParkOpenLink
          park={selectedPark}
          onClick={e => {
            if (swallowIfDragged(e)) return;
            rememberDirectoryOrigin("explore", selectedPark.slug);
          }}
        />
      </div>
    </div>
  );

  return (
    <div
      data-parks-page
      style={{
        height: "100%",
        ["--pms-edge" as string]: shortView ? "14px" : "28px",
        // How far Leaflet's own bottom-corner controls have to be lifted to
        // clear the preview. Published as a custom property because those
        // controls are Leaflet's DOM rather than this component's, so a
        // stylesheet rule is the only way to reach them — and the value is
        // measured, so it tracks the strip and the sheet at every breakpoint.
        ["--pms-overlay-h" as string]: `${selectedPark ? overlayH : 0}px`,
      }}
    >
      <style>{`
        @keyframes fbs-spin      { to { transform:rotate(360deg); } }
        @keyframes fbs-fade-up   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        /* Opacity only. Nothing that moves the preview's text, because that
           text has to look nailed down as a reader steps through parks. */
        @keyframes fbs-swap      { from { opacity:0; } to { opacity:1; } }
        .leaflet-container { background:var(--background) !important; }
        .leaflet-control-attribution { font-size:9px !important; background:rgba(0,0,0,0.4) !important; color:#888 !important; }
        .leaflet-control-attribution a { color:#aaa !important; }
        /* Zoom is overlay UI on the map, not map imagery: it takes the page
           gutter off the canvas's right edge, lining up with the satellite and
           locate pair above it and the Explore/Grid toggle above them. The
           bottom offset is the same clearance the detail card uses, so neither
           can run off a short window. Attribution keeps Leaflet's own corner. */
        .leaflet-bottom.leaflet-right .leaflet-control-zoom{
          margin-right:var(--pda-gutter, 24px);
          margin-bottom:var(--pms-edge, 28px);
        }
        /* ── Keeping Leaflet's bottom corner above the preview ─────────────
           Both controls that live down there — zoom, and the attribution —
           were being covered by the selected-park preview. Leaflet gives its
           control corners a z-index in the hundreds, but they sit inside the
           map container, and that container is z-index:0 against the preview's
           25, so the whole corner loses regardless of what Leaflet asks for.
           Raising the container instead would put the controls over the
           preview, which is worse: the attribution would then float across a
           park's name.

           So the corner moves rather than restacks, by exactly as much of the
           map as the preview is covering. One rule on the row lifts zoom and
           attribution together and keeps the spacing they already had between
           them. Attribution is a licensing requirement, not decoration — it
           has to be legible, not merely present in the DOM. */
        .leaflet-bottom{
          margin-bottom:var(--pms-overlay-h, 0px);
          transition:margin-bottom .3s cubic-bezier(0.32,0.72,0,1);
        }
        @media (prefers-reduced-motion: reduce){
          .leaflet-bottom{ transition:none; }
        }
        /* ── Card scale, declared by the layout ────────────────────────────
           The scale a park card is set at is a property of the box it has been
           put in, so each surface states its own. ParkCard carries the language
           and the defaults; these override only what differs. */
        .pms-sheet{
          /* One title size per breakpoint. Deliberately not fitted to the
             name: shrinking a long park's name to fit is exactly the jump the
             reserved two lines exist to prevent. */
          --pcard-title-size: var(--pms-title-size);
          --pms-title-size: clamp(19px, 4.8vw, 26px);
          /* The photographic band, for parks with no cutout. */
          --pcard-peek-image-h: clamp(104px, 15.5vw, 124px);
          /* Silhouette height, and the reserved area that follows from it.
             The area is height x CUTOUT_SLOT_ASPECT (2.55) — see
             lib/parkMapArt: wide enough for the widest silhouette drawn at
             this height, so every park is centred in the same box. */
          /* Trimmed from 16vw. The action column took 6px more than the bare
             expand chevron it replaced, and that was enough to push
             "SE27 / SOUTH LONDON" (142px) past a 137px text column and onto a
             second line — while "SW9 / SOUTH LONDON" at 137px still fitted, so
             the sheet was 12px taller for three parks than for the fourth.
             The artwork gives the width back rather than the location losing
             a line. */
          --pms-ink-h: clamp(58px, 15vw, 100px);
          --pms-art-w: calc(var(--pms-ink-h) * 2.55);
          --pms-ink-base: 2px;
          /* Tighter than the bar's, both of them. The sheet has less height to
             spend and the same three rows to show, and at this type size 3px
             is still a clear step between the mark, the name and the place —
             the reserved second title line is the space between name and
             place that actually reads as generous, and that one has to stay. */
          --pcard-mark-gap: 3px;
          --pcard-place-gap: 3px;
          /* Lifts the open arrow off the top of its column so it sits level
             with the title's first line rather than with the catalogue mark
             above it: mark (16.5) + its gap, plus half a title line, less half
             the 44px target. */
          --pms-open-offset: calc(19.5px + var(--pms-title-size) * 0.575 - 22px);
          /* Reserved identity height: two title lines plus the fixed rows
             beneath and their gaps. Attributes are not in the collapsed sheet,
             so they are not reserved here. The constant is measured, not
             guessed — see the note on the desktop bar's copy of it. Smaller
             than it was by the 5px the tightened gaps above gave back. */
          --pms-id-h: calc(var(--pms-title-size) * 2.3 + 41px);
        }
        .pms-panel{
          --pcard-title-size: var(--pms-title-size);
          /* The mockup's one prominent title. MSCHN at this size is the
             site's own display face, not a new one. */
          --pms-title-size: clamp(24px, 2.3vw, 34px);
          --pcard-place-size: 11px;
          --pcard-place-tracking: .1em;
          --pcard-mark-gap: 3px;
          --pcard-place-gap: 5px;
          /* Sized against the bar, not the viewport — 13cqi of the map column
             rather than 11vw of the window. The two are not the same thing:
             the list column takes 336px, so a viewport-derived width kept
             claiming space the bar did not have, and once the stepper joined
             the row it was the park name that paid for it (248px of identity
             at 1440, with "Crystal Palace" wrapping).

             The floor is what keeps the object crossing the bar's edge at the
             narrower end rather than landing flush against it, which reads as
             the artwork being cut off rather than standing on the bar. */
          --pms-ink-h: clamp(120px, 13cqi, 158px);
          --pms-art-w: calc(var(--pms-ink-h) * 2.55);
          --pms-ink-base: 12px;
          /* Two title lines, plus mark, place and attributes and their gaps.
             Only the title scales with the breakpoint, so the rest is a
             constant and this tracks on its own.

             That constant is measured rather than estimated, and it matters
             that it is not short: at 52px it was 5px under the real stack, so
             the min-height never bound, and a park with no attributes came out
             5px shorter — moving the title and the bar's own top edge, which
             is the one thing this layout may not do. Measured at 1440: mark
             16.5 + 3 gap + 5 gap + place 15.4 + 3 gap + tags 14 = 56.9, so 58
             with a little headroom for font-metric variation. */
          --pms-id-h: calc(var(--pms-title-size) * 2.3 + 58px);
        }

        /* ── Desktop: bottom information strip ─────────────────────────────
           Attached to the foot of the map, spanning it. Sharp: no radius, no
           shadow, no blur, no gradient — a hairline and a solid ground are
           what separate it from the map, the same way every other edge on the
           site is drawn. The floating card this replaces had all four, and sat
           against the index column so the two read as one block down the left
           of the viewport. */
        .pms-strip{
          position:absolute; left:0; right:0; bottom:0; z-index:25;
          /* The browser keeps vertical, we take horizontal. Without this the
             gesture handler and the browser both try to interpret a diagonal
             drag and the bar fights the page. */
          touch-action:pan-y;
          /* Three fixed areas, left to right: artwork, identity, action. Only
             the identity flexes. Nothing here is sized from the selected
             park, which is the entire requirement — switching parks replaces
             content and moves no boundary. */
          /* Grid with named areas rather than a flex row: the compact
             arrangement below needs to move the action under the identity,
             which is a different shape, not a different set of widths. */
          display:grid; align-items:center;
          grid-template-columns:auto minmax(0, 1fr) auto;
          grid-template-areas:"art id action";
          column-gap:clamp(12px, 1.8vw, 30px);
          padding:11px var(--pda-gutter, 24px);
          background:var(--pda-bg);
          border-top:1px solid var(--pda-line);
          /* The artwork crosses this edge. Nothing here may clip it; the map's
             own flex parent is what keeps it inside the map viewport. */
          overflow:visible;
        }
        /* The reserved artwork area. Width comes from the wanted silhouette
           height and the slot aspect (lib/parkMapArt), so it is a breakpoint
           constant — never a function of which park is showing.
           align-self:stretch so the cutout's bottom offset resolves against
           the bar's floor rather than against its own content. */
        .pms-strip-art{
          grid-area:art; width:var(--pms-art-w);
          align-self:stretch; position:relative; z-index:1;
        }
        /* The identity takes the slack. Above the artwork layer, because the
           cutout's transparent box is far wider than its silhouette and
           reaches back across this column. */
        .pms-strip-id{ grid-area:id; min-width:0; position:relative; z-index:2; }
        .pms-strip-cta{
          grid-area:action; position:relative; z-index:2;
          display:flex; align-items:center; justify-content:flex-end;
          gap:clamp(6px, 1vw, 16px);
        }
        /* One action is shown at a time; the other is display:none, so it
           leaves the accessibility tree rather than lingering as a second way
           to reach the same page. */
        .pms-strip-cta .pcard-open{ display:none; }

        /* ── Narrowing the bar, in two steps ───────────────────────────────
           Both keyed to the *bar's* width, not the viewport's: the list column
           takes 336px of it, so a 1366px iPad in landscape is a 1016px bar and
           a 1024px iPad in portrait is a 688px one. Sizing this against the
           viewport is what collapsed the identity column to zero and stacked
           the park name one character per line.

           Step 1 — the labelled button becomes the orange arrow. 122px of
           button for 44px of arrow, and the arrow is already the site's mark
           for "open this park". At a 1016px bar that alone takes the identity
           from 201px to 577px, which is the difference between "Crystal
           Palace" wrapping and not.

           Step 2 — the stepper drops to a row of its own beneath the identity.
           Only when even the arrow is not enough: at a 688px bar the single
           row leaves the name 120px, and no amount of arrow-swapping fixes
           that. It costs a row of height, which is why it is the second step
           and not the first. */
        @container pms-map (max-width: 1040px){
          .pms-strip{ --pms-ink-h:clamp(88px, 13cqi, 120px); }
          .pms-strip-cta .fbs-cta{ display:none; }
          .pms-strip-cta .pcard-open{ display:flex; }
        }
        @container pms-map (max-width: 820px){
          .pms-strip{
            grid-template-columns:auto minmax(0, 1fr);
            grid-template-areas:"art id" "art action";
            row-gap:2px;
          }
          /* Stepper left, arrow right, so the arrow stays where it has been in
             every other layout — the far end of the bar. */
          .pms-strip-cta{ justify-content:space-between; margin-bottom:-6px; }
        }

        /* ── Holding the text still ────────────────────────────────────────
           The bar's height and every baseline in it are reserved rather than
           measured off the current park:

             - the title reserves two lines, so a one-word name and a wrapping
               one put the metadata in the same place
             - the block reserves its full stack, so a park with no attributes
               does not pull the title down as the bar re-centres it

           Both are min-heights. A third title line, or 200% text zoom, grows
           the bar instead of clipping the name — the brief's one exception to
           holding the height, and the right way round. */
        .pms-strip .pcard{ min-height:var(--pms-id-h); }
        /* Two reserved lines, and the name sits at the top of them.
           Centring it looked better for a one-line name — the spare half-line
           split above and below instead of pooling underneath — but it moved
           the title itself: "Bloblands" on one line centred 11px lower than
           "Crystal Palace" on two, so the name visibly jumped between parks
           even though the block around it never moved. Top-aligned, every
           park's first line starts on the same baseline and the spare line
           always falls in the same place. The gap under a short name is the
           price of the reservation, and it is the right way round. */
        .pms-strip .pcard-title{
          --pcard-title-lines:2;
          display:flex; align-items:flex-start;
        }
        /* Wrap, never ellipsise: a truncated park name is the one thing on
           this bar that must never happen. overflow-wrap lets a word break
           when it genuinely cannot fit its column — without it a long name at
           200% text zoom overflowed the column and ran under the action beside
           it, which is the one direction reserving the action's width cannot
           protect against. It only engages when a word would otherwise
           overflow, so ordinary names wrap on spaces exactly as before. */
        .pms-strip .pcard-name{
          white-space:normal; overflow:visible; overflow-wrap:break-word;
          /* The title is a flex container (it top-aligns the name in its
             reserved lines), and a flex item will not shrink below its longest
             word unless told to. Without this, overflow-wrap never gets the
             chance to break anything. */
          min-width:0;
        }

        /* Attributes drop where the identity column gets too narrow to carry a
           third line. The bar's height is unchanged by this — the reserved
           block above is what holds it — so it is not a layout shift, and it
           happens at a breakpoint rather than per park. */
        @media (max-width: 1050px){ .pms-strip .pcard-tags{ display:none; } }

        /* Short viewport — a landscape phone or a squat window. The bar
           tightens and the artwork stops crossing the edge: on a map canvas a
           few hundred pixels tall, an object standing proud of the bar covers
           the thing it is pointing at. It keeps its reserved area. */
        .pms-strip--short{
          padding:7px var(--pda-gutter, 24px);
          --pms-ink-h:56px;
          --pms-title-size:20px;
        }

        /* ── Mobile: photographic peek ─────────────────────────────────────
           Full-bleed to the screen edges and square-cornered, so the
           photograph reads as a strip across the sheet rather than a picture
           inside a floating card. */
        .pms-peek-body{
          touch-action:pan-y;
          background:var(--pda-bg);
          border-top:1px solid var(--pda-line);
          padding-bottom:env(safe-area-inset-bottom, 0px);
          /* No cursor:pointer any more. The sheet was tap-to-expand and the
             pointer said so; with the expanded state gone the only thing you
             can do to the body itself is swipe it, and a hand cursor promising
             a click that does nothing is worse than no affordance. The orange
             arrow carries the one action. */
          user-select:none;
          transition:transform .3s cubic-bezier(0.32,0.72,0,1);
        }
        /* The grip. Overlaid on the art rather than given a row of its own —
           it is the swipe affordance and it should not cost 17px of map. */
        .pms-peek-grip{
          position:absolute; top:8px; left:50%; transform:translateX(-50%);
          width:32px; height:3px; border-radius:2px;
          background:rgba(255,255,255,.6); z-index:2; pointer-events:none;
        }
        /* White reads over a photograph and disappears over a cutout, whose
           band is the page colour rather than an image. The line colour is
           the one that holds in both themes, and it is what the rest of the
           page already draws quiet edges in. */
        .pms-peek--art .pms-peek-grip,
        .pms-peek--short .pms-peek-grip{ background:var(--pda-line); }
        /* Tighter than it was. The bar's height is what the object has to
           stand clear of, and on a phone every pixel of it is the difference
           between a park that straddles the edge and one sitting in a box. */
        .pms-peek-id{ padding:9px var(--pda-gutter, 16px) 10px; }
        /* ── Landscape phone ───────────────────────────────────────────────
           A 390px-tall phone in landscape has about 190px of map under the
           page header, and the composition above — reserved two-line title,
           metadata, artwork, a button on its own row — came to 177px of that.
           The preview was the map.

           So this viewport gets a different arrangement rather than a squeezed
           one: no artwork, and the identity and the action laid out along a
           single row instead of stacked. Same elements, same reservations,
           turned through ninety degrees. It is the composition changing across
           a breakpoint, which is allowed; what it still may not do is move
           when the park changes, so the title keeps its reserved lines. */
        .pms-peek--short .pms-peek-id{ padding:6px var(--pda-gutter, 16px) 7px; }
        /* The action column lies down beside the identity here rather than
           stacking, so the row stays one line tall. */
        .pms-peek--short .pms-peek-actions{ align-items:center; }
        .pms-peek--short .pms-peek-actions .pcard-open{ margin-top:0; }
        /* A fixed two-row grid, not a wrapping flex row. Wrapping was the
           obvious way to get the mark, name and place onto one line, and it
           reflowed differently per park — "Bloblands" fitted on one line and
           "Crystal Palace" did not, so the bar's height and the title's left
           edge both moved as you stepped through the list. The grid puts the
           mark in its own column and the name and place in fixed rows, so
           nothing reflows and the title still reserves its two lines. */
        .pms-peek--short .pms-peek-text .pcard{
          display:grid;
          grid-template-columns:auto minmax(0, 1fr);
          column-gap:10px; min-height:0;
        }
        .pms-peek--short .pcard-id{ grid-area:1 / 1; margin:0; }
        .pms-peek--short .pcard-title{
          grid-area:1 / 2; margin:0;
          --pcard-title-lines:2;
          font-size:17px;
        }
        .pms-peek--short .pcard-location{ grid-area:2 / 2; margin:0; }
        .pms-peek--short .pcard-tags{ display:none; }
        .pms-peek--short .pms-dots{ padding-bottom:5px; }
        .pms-peek-id--row{ display:flex; align-items:stretch; gap:10px; }
        .pms-peek-id--row .pcard{ flex:1 1 auto; min-width:0; }
        /* 44px, the touch minimum. The extra height is absorbed by the row
           rather than added to it: the identity block beside it is already
           taller than that in every density the sheet uses. */
        .pms-peek .pcard-cta-row{ margin:0 var(--pda-gutter, 16px) 16px; }

        /* A portrait tablet is on the sheet layout but has more than twice a
           phone's width, and the same artwork share that leaves a phone's name
           unreadable leaves a tablet with an object too small to reach the
           sheet's top edge. It gets its own scale rather than a compromise
           between the two. */
        @media (min-width: 600px){
          .pms-sheet{ --pms-ink-h: clamp(110px, 19vw, 150px); }
        }

        /* ── The sheet's reserved areas ────────────────────────────────────
           Artwork column, then text, then the expand control. The artwork
           column's width is --pms-art-w, a breakpoint constant, so the title
           does not move between parks; it is held even when the park has no
           artwork, because a missing image must not shift the text either. */
        .pms-peek-art{
          flex:0 0 var(--pms-art-w); width:var(--pms-art-w);
          align-self:stretch; position:relative; z-index:1;
        }
        /* Text and action share the remaining column, above the artwork layer:
           the cutout's transparent box is wider than its silhouette and reaches
           back across this column. */
        .pms-peek-text{ flex:1 1 auto; min-width:0; position:relative; z-index:2; }
        /* The same reservations the desktop bar makes, at the sheet's scale. */
        .pms-peek .pcard{ min-height:var(--pms-id-h); }
        .pms-peek .pcard-title{
          --pcard-title-lines:2;
          display:flex; align-items:flex-start;
        }
        .pms-peek .pcard-name{ white-space:normal; overflow:visible; overflow-wrap:break-word; min-width:0; }
        /* ── The action column ─────────────────────────────────────────────
           44px wide, which is exactly what the expand chevron already took, so
           moving the open control in here recovered the whole of the CTA row's
           height and cost the park name nothing.

           The arrow sits level with the title's first line rather than at the
           top of the column: the catalogue mark is above the title, so a
           top-aligned control would point at the mark instead of the name.
           --pms-open-offset is that mark plus its gap, less half the 44px
           target, and it is stated once here rather than nudged by eye. */
        .pms-peek-actions{
          flex:0 0 44px; width:44px; align-self:stretch;
          display:flex; flex-direction:column; align-items:center;
          position:relative; z-index:2;
          /* Pulled into the page gutter. The arrow's 44px target is bigger
             than the glyph inside it, so the visible mark still sits a
             comfortable distance from the screen edge while the target reaches
             most of the way to it. */
          margin-right:-10px;
        }
        .pms-peek-actions .pcard-open{ margin-top:var(--pms-open-offset, 8px); }
        /* Pushed to the bottom of the identity block, as far from the open
           arrow as the column allows. */
        /* The photographic fallback fills the reserved area rather than the
           sheet's full width — it is in a column now, not a band. */
        .pms-peek .pcard-thumb-peek{
          position:absolute; left:0; right:0; bottom:0;
          height:var(--pms-ink-h); margin:0;
        }

        /* ── The two artwork layers ────────────────────────────────────────
           Both fill the reserved slot exactly, so the outgoing copy cannot
           change the bar's height or nudge anything beside it. .pcard-cutout
           positions itself against its nearest positioned ancestor, so these
           have to be the same box the slot is — inset:0 on a positioned
           parent, not a wrapper with its own size.

           Both are pointer-transparent. The cutout inside already is, and
           these wrappers only ever cover the slot's own area rather than the
           overhang — but the artwork carries no interaction this pass, so
           making the whole layer transparent states the guarantee instead of
           leaving it to depend on where the boxes happen to fall. */
        .pms-art-live, .pms-art-exit{ position:absolute; inset:0; pointer-events:none; }
        /* Leaves the way the catalogue is moving: stepping forward pushes the
           old park off to the left. */
        .pms-art-exit[data-dir="1"]{ animation:fbs-art-out-l ${SWAP_MS}ms cubic-bezier(0.2,0,0,1) both; }
        .pms-art-exit[data-dir="-1"]{ animation:fbs-art-out-r ${SWAP_MS}ms cubic-bezier(0.2,0,0,1) both; }
        @keyframes fbs-art-out-l{ to { opacity:0; transform:translateX(-34px); } }
        @keyframes fbs-art-out-r{ to { opacity:0; transform:translateX(34px); } }
        @media (prefers-reduced-motion: reduce){
          .pms-art-exit{ display:none; animation:none; }
        }

        /* ── Stepping controls ─────────────────────────────────────────────
           Quiet by construction: mono at the metadata's size, muted, no fill
           and no border. It is a way of moving through the catalogue, not a
           second call to action competing with View park beside it. */
        .pms-step{ display:flex; align-items:center; gap:2px; flex:0 0 auto; }
        .pms-step-btn{
          /* 44px of target around a 16px glyph — the same trade the sheet's
             open arrow makes. */
          width:44px; height:44px; padding:0; flex:0 0 auto;
          display:flex; align-items:center; justify-content:center;
          background:none; border:none; cursor:pointer;
          color:var(--pda-muted);
          transition:color .12s var(--pda-ease);
        }
        .pms-step-btn svg{ width:16px; height:16px; }
        @media (hover: hover){
          .pms-step-btn:not(:disabled):hover{ color:var(--pda-fg); }
        }
        /* Disabled rather than absent at the ends: a control that vanishes
           when you reach the last park takes the layout with it. */
        .pms-step-btn:disabled{ opacity:.3; cursor:default; }
        .pms-step-btn:focus-visible{
          outline:2px solid var(--pda-accent); outline-offset:-8px; border-radius:6px;
        }
        .pms-step-count{
          font-family:var(--pda-font-mono); font-size:10px; font-weight:500;
          letter-spacing:.1em; text-transform:uppercase; color:var(--pda-muted);
          white-space:nowrap; min-width:56px; text-align:center;
        }

        /* On the sheet it sits above the bar, on the map, where the dots were.
           White, because there it is over the map rather than on the bar. */
        .pms-step--sheet{
          justify-content:center; padding-bottom:2px;
          --pda-muted:rgba(255,255,255,.75); --pda-fg:#fff;
        }
        .pms-step--sheet .pms-step-btn{ width:44px; height:36px; }
        .pms-step--sheet .pms-step-count{ color:rgba(255,255,255,.85); }

        @media (prefers-reduced-motion: reduce){
          .pms-strip, .pms-peek-body{ animation:none; transition:none; }
          .pms-peek-body{ animation:none !important; }
        }
        /* Scrollbars are hidden across the map's own chrome — the sheet, the
           carousel, Leaflet's panes — because none of those are things a
           reader scrolls. The park index is, and it is the one surface here
           whose scrollbar has to survive: with a full catalogue in it, that
           bar is the only thing on screen saying there are more parks below
           the fold. The blanket rule used to cover it too.

           :not() rather than a narrower selector so the exemption travels with
           the list wherever it is placed. */
        ::-webkit-scrollbar { display:none; }
        .pms-index-list::-webkit-scrollbar{ display:block; width:10px; }
        .pms-index-list::-webkit-scrollbar-track{ background:transparent; }
        .pms-index-list::-webkit-scrollbar-thumb{
          background:color-mix(in srgb, var(--pda-muted) 38%, transparent);
          border-radius:5px;
          /* Inset from the track so the thumb reads as a mark beside the rows
             rather than as a second border against the map's hairline. */
          border:3px solid transparent; background-clip:content-box;
        }
        .pms-index-list::-webkit-scrollbar-thumb:hover{
          background:color-mix(in srgb, var(--pda-muted) 62%, transparent);
          border:3px solid transparent; background-clip:content-box;
        }
        /* Firefox, which has no pseudo-elements for this. */
        .pms-index-list{
          scrollbar-width:thin;
          scrollbar-color:color-mix(in srgb, var(--pda-muted) 38%, transparent) transparent;
        }

        /* Desktop split view — list column stays synced with the map beside it */
        /* Desktop split view — list column stays synced with the map beside it.
           Deliberately the same row as the mobile accordion trigger: same
           card content at the same 20px/16px + 12px inset, same quiet grey
           plate on hover, and the same coral rule along the bottom edge when
           selected as the accordion shows when open. No chevron here (nothing
           expands — a row selects its pin), and no filled coral box: coral is
           reserved for the postcode and that bottom rule. 300px so the longest
           name clears 18px without wrapping. */
        /* Width is the column plus the gutter, with the gutter as padding: the
           rows' text starts on the page gutter (level with the search field and
           count above), the hairline lands at gutter + column, and the map takes
           everything from there to the screen edge. */
        .pms-index-list{
          width:calc(var(--pda-list-col, 300px) + var(--pda-gutter, 24px));
          padding-left:var(--pda-gutter, 24px);
          flex-shrink:0; min-height:0; height:100%; overflow-y:auto;
          border-right:1px solid var(--pda-line);
        }
        .pms-index-row{
          position:relative;
          display:block; width:100%; text-align:left; background:none; border:none;
          /* 12px, down from 20px: 105px rows read as deliberate at four parks
             and as padding at forty. 89px still gives the three-line block its
             air — the detail that used to justify the height moved to the
             bottom strip in 5B. */
          padding:12px 16px; cursor:pointer;
          border-bottom:1px solid var(--pda-line);
          transition:background-color .15s ease;
        }
        /* .pcard-archive until the variant classes went; the row still owns
           this indent, the card just no longer names itself after a variant. */
        .pms-index-row .pcard{ padding-left:12px; }

        /* ── One rule, three states ────────────────────────────────────────
           Every state is the same horizontal divider changing colour. Preview
           and selection were briefly drawn at different edges — a leading bar
           for preview, a bottom rule for selection — and two rules meeting at
           a corner read as a half-drawn box rather than as an index. Keeping
           them on one edge makes the list a catalogue whose lines change
           weight, not a control with parts that light up.

           The rule rides over the divider on bottom:-1px rather than
           replacing it, so a row is exactly as tall in every state and nothing
           in the list ever nudges. */
        .pms-index-row::after{
          content:""; position:absolute; left:0; right:0; bottom:-1px; height:2px;
          background:transparent;
          transition:background-color .15s ease; pointer-events:none;
        }
        /* Preview — pointing, not choosing. A brighter neutral, never accent:
           orange is what selection means here, and a second orange would put
           two answers to "which park" on screen at once. --pda-muted against
           the divider's --pda-line is a clear step in both themes. */
        .pms-index-row:hover::after,
        .pms-index-row.pms-preview::after{ background:var(--pda-muted); }
        .pms-index-row:hover, .pms-index-row.pms-preview{ background-color:var(--pda-hover-bg); }
        /* Selected — the same rule in Scout orange. Declared after hover so a
           row that is both selected and pointed at stays orange. */
        .pms-index-row.pms-active::after{ background:var(--pda-accent); }
        .pms-index-row.pms-active:hover::after{ background:var(--pda-accent); }
        .pms-index-row.pms-active{ background-color:var(--pda-hover-bg); }
        /* Keyboard focus keeps a real ring — a full inset outline, not a
           partial edge, so it never reads as one of the rule states and is not
           communicated by colour alone. Same accent ring the CTA and the nav
           links use. */
        .pms-index-row:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:-2px; }

        /* ── Markers ───────────────────────────────────────────────────────
           A survey point: one circle, three states. The ring is the map's own
           background colour, which is what keeps the dot legible over pale
           streets, dark parkland and satellite imagery alike without a drop
           shadow doing the work. */
        .pms-marker{ display:flex; align-items:center; justify-content:center; }
        .pms-marker .pms-marker-dot{
          display:block; width:10px; height:10px; border-radius:50%;
          background:var(--pda-fg); border:2px solid var(--pda-bg);
          opacity:.72;
          transition:width .14s ease, height .14s ease, opacity .14s ease, background-color .14s ease;
        }
        /* Preview — the same point, brought forward. No size jump large enough
           to move the reader's eye off where it actually is. */
        .pms-marker.is-hovered .pms-marker-dot{ width:14px; height:14px; opacity:1; }
        /* Selected — Scout orange and a ring. The ring is a spread-only
           box-shadow: no offset and no blur, so it is a drawn circle rather
           than a shadow, and it holds against both themes. */
        .pms-marker.is-selected .pms-marker-dot{
          width:14px; height:14px; opacity:1;
          background:var(--pda-accent);
          box-shadow:0 0 0 4px color-mix(in srgb, var(--pda-accent) 30%, transparent);
        }
        .pms-marker.is-filtered-out .pms-marker-dot{ opacity:.14; }
        .pms-marker:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:2px; border-radius:50%; }
        @media (prefers-reduced-motion: reduce){
          .pms-marker .pms-marker-dot, .pms-index-row, .pms-index-row::after, .pms-index-row::before{ transition:none; }
        }
      `}</style>

      {/* One polite announcement per settled selection, naming the park and
          its position. Not on the stepper's count, which is aria-hidden, and
          not per animation frame — this updates when the selection does. */}
      <div
        aria-live="polite" aria-atomic="true"
        style={{
          position:"absolute", width:1, height:1, margin:-1, padding:0,
          overflow:"hidden", clip:"rect(0 0 0 0)", whiteSpace:"nowrap", border:0,
        }}
      >
        {selectedPark
          ? carouselIdx >= 0
            ? `${selectedPark.name}, ${carouselIdx + 1} of ${filteredParks.length}`
            : selectedPark.name
          : ""}
      </div>

      {/* List column and map canvas are always both mounted — only the
          overlay chrome around the map differs by breakpoint. The map
          canvas must never unmount/remount across the mobile/desktop
          switch, or the Leaflet instance orphans against a detached
          container and markers stop tracking real positions. */}
      <div style={{ display:"flex", height:"100%", minHeight:0, overflow:"hidden" }}>
        {!isMobile && (
          <div className="pms-index-list" ref={indexRef} aria-label="Park index">
            {filteredParks.map(park => {
              const isSelected = selectedPark?.id === park.id;
              return (
                <button
                  key={park.id}
                  type="button"
                  className={`pms-index-row${isSelected ? " pms-active" : ""}${!isSelected && hoveredId === park.id ? " pms-preview" : ""}`}
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => { if (park.lat && park.lng) openPark(park); }}
                  // Preview only. Deliberately not onClick's job and
                  // deliberately not the map's: no camera move, no selection.
                  onMouseEnter={() => setHoveredId(park.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(park.id)}
                  onBlur={() => setHoveredId(null)}
                >
                  <ParkCard park={park} density="standard" />
                </button>
              );
            })}
          </div>
        )}

        {/* A query container, so the bar inside it sizes against the map's own
            width rather than the viewport's. The two differ by the whole list
            column — 336px — which is why a bar tuned on a full-width viewport
            collapsed its title to one character per line on an iPad in
            portrait: 1024px of viewport is only 688px of bar. */}
        <div style={{
          position:"relative", flex:1, height:"100%", minHeight:0, touchAction:"none",
          containerType:"inline-size", containerName:"pms-map",
        }}>
          {/* Leaflet gives the container a tabindex but no name, so a keyboard
              user landed on an unlabelled scrollable region before reaching the
              markers inside it. */}
          <div
            ref={containerRef}
            role="application"
            aria-label="Map of skateparks. Use Tab to reach each park marker."
            style={{ position:"absolute", inset:0, zIndex:0 }}
          />

          {mapStatus === "loading" && (
            <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:5,background:"var(--background)" }}>
              <div style={{ width:32,height:32,border:"3px solid var(--border)",borderTopColor:"var(--accent)",borderRadius:"50%",animation:"fbs-spin 0.8s linear infinite" }} />
              <p style={{ marginTop:12,fontSize:12,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.12em" }}>Loading map…</p>
            </div>
          )}
          {mapStatus === "error" && (
            <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:5,background:"var(--background)",padding:32 }}>
              <p style={{ fontSize:13,fontWeight:"bold",color:"var(--accent)",marginBottom:10 }}>Map failed to load</p>
              <p style={{ fontSize:12,color:"var(--muted)",maxWidth:300,textAlign:"center" }}>{mapError}</p>
            </div>
          )}

          {isMobile ? (
            <>
              {/* Satellite — search and the List/Map toggle now live in the
                  always-visible header above the map, not floating here. */}
              <div style={{ position:"absolute", top:16, right:"var(--pda-gutter, 24px)", zIndex:21 }}>
                <button onClick={() => setSatellite(v => !v)} title="Satellite" style={{ width:44, height:44, borderRadius:"50%", background: satellite ? "#141414" : (theme === "dark" ? "rgba(30,30,30,0.95)" : "#fff"), border:"none", boxShadow:"0 4px 14px rgba(0,0,0,0.15)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color: satellite ? "#fff" : (theme === "dark" ? "#fff" : "#141414") }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m11 19-1.106-.552a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0l4.212 2.106a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619V12"/><path d="M15 5.764V12"/><path d="M18 15v6"/><path d="M21 18h-6"/><path d="M9 3.236v15"/></svg>
                </button>
              </div>

              {/* Locate — floating, bottom-right of the map canvas, clear of the card */}
              <div style={{ position:"absolute", bottom: selectedPark ? overlayH + 40 : 20, right:"var(--pda-gutter, 24px)", zIndex:21, transition:"bottom 0.3s" }}>
                {(locateTip || locateError) && (
                  <div style={{ position:"absolute", bottom:"calc(100% + 8px)", right:0, background: locateError ? "var(--accent)" : "#141414", color:"#fff", fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.04em", padding:"6px 10px", borderRadius:6, whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(0,0,0,0.35)" }}>
                    {locateError || "Recenter map"}
                  </div>
                )}
                <button onClick={nearMe} title="Recenter map" style={{ width:44, height:44, borderRadius:"50%", background: theme === "dark" ? "rgba(30,30,30,0.95)" : "#fff", border:"none", boxShadow:"0 4px 14px rgba(0,0,0,0.15)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color: theme === "dark" ? "#fff" : "#141414" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><circle cx="12" cy="12" r="7"/></svg>
                </button>
              </div>

              {floatingCard}
            </>
          ) : (
            <>
              {/* Satellite + Locate — floating side by side, top-right of the map canvas */}
              <div style={{ position:"absolute", top:20, right:"var(--pda-gutter, 24px)", zIndex:12, display:"flex", gap:8 }}>
                <button onClick={()=>setSatellite(v=>!v)} title="Satellite"
                  style={{ width:38, height:38, borderRadius:4, background: satellite ? "var(--accent)" : "var(--card)", border:`1px solid ${satellite ? "var(--accent)" : "var(--border)"}`, boxShadow:"0 2px 8px rgba(0,0,0,0.2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color: satellite ? "#fff" : "var(--foreground)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m11 19-1.106-.552a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0l4.212 2.106a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619V12"/><path d="M15 5.764V12"/><path d="M18 15v6"/><path d="M21 18h-6"/><path d="M9 3.236v15"/></svg>
                </button>
                <div style={{ position:"relative" }}>
                  {(locateTip || locateError) && (
                    <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, background: locateError ? "var(--accent)" : "#141414", color:"#fff", fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.04em", padding:"6px 10px", borderRadius:6, whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(0,0,0,0.35)" }}>
                      {locateError || "Recenter map"}
                    </div>
                  )}
                  <button onClick={nearMe} title="Recenter map" style={{ width:38, height:38, borderRadius:4, background:"var(--card)", border:"1px solid var(--border)", boxShadow:"0 2px 8px rgba(0,0,0,0.2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--foreground)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><circle cx="12" cy="12" r="7"/></svg>
                  </button>
                </div>
              </div>

              {splitCard}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
