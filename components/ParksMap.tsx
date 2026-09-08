"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { useTheme } from "./ThemeProvider";
import { ParkCard, ParkCardThumbnail, ParkCardCTA } from "./ParkCard";

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


type CardState = "hidden" | "peek" | "expanded";

// The collapsed sheet's height, used to offset the map's pan so the selected
// marker is never parked underneath it.
const PEEK_H = 162;
// The photographic strip in the collapsed sheet. 80px, chosen against real
// park photography rather than picked as the smallest number that fits: at
// 60-70px the bowl lip and transitions flatten into a band and a reader cannot
// tell a bowl from a street plaza; by 80px the form reads. 90 and 100 add
// little the crop had not already given. The sources are 16:10, so 80px on a
// full-width sheet is roughly a 4.3:1 slice of the frame.
const PEEK_IMAGE_H = 80;
// Below this much map height the desktop strip drops its thumbnail and its
// attributes and tightens its padding.
const SHORT_H = 440;
const DOT_WINDOW = 7;

// Sliding window of dot indices centred on `active`, capped at `max` — real
// data can run into the hundreds of parks, unlike the mockup's 3-dot example.
function getDotWindow(total: number, active: number, max: number): number[] {
  if (total <= max) return Array.from({ length: total }, (_, i) => i);
  const start = Math.max(0, Math.min(active - Math.floor(max / 2), total - max));
  return Array.from({ length: max }, (_, i) => start + i);
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
  const router = useRouter();
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
  const selectedRowRef = useRef<HTMLButtonElement>(null);
  const cardRef      = useRef<HTMLDivElement>(null);
  const touchStart          = useRef({ x:0, y:0 });
  const touchDir            = useRef<"h"|"v"|null>(null);
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
  const [carouselIdx,  setCarouselIdx]  = useState(0);
  const [cardState,    setCardState]    = useState<CardState>("hidden");
  const [shortView,    setShortView]    = useState(false);
  const [slideDir,     setSlideDir]     = useState<"left"|"right"|null>(null);
  const [locateTip,    setLocateTip]    = useState(false);
  const [locateError,  setLocateError]  = useState("");
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
        .then(({ data }) => { if (data) setParks(data as Park[]); });
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

  // On load: pick a random London park, zoom to it and select it — unless the
  // map is being opened *at* a park, in which case the focus effect below owns
  // the first view and a random pick would only fight it for the camera.
  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || parks.length === 0) return;
    if (focus) return;
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

  const panTo = useCallback((park: Park) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const cardOffset = cardRef.current?.offsetHeight || PEEK_H;
    const pt = map.latLngToContainerPoint([park.lat, park.lng]);
    map.panTo(map.containerPointToLatLng(pt.add([0, cardOffset / 2])), { animate:true, duration:0.4 });
  }, []);

  useEffect(() => {
    if (!mapRef.current || !userChangedFilter.current) return;
    const bounds = REGION_BOUNDS[activeFilter];
    if (!bounds) return;
    const pad = cardState !== "hidden" ? PEEK_H + 16 : 24;
    mapRef.current.fitBounds(bounds, { animate:true, duration:0.6, paddingTopLeft:[24,24], paddingBottomRight:[24, pad] });
  }, [activeFilter, cardState]);

  const filteredParks = parks.filter(p => {
    const mF = activeFilter === "All" || p.location.includes(activeFilter) || p.borough.includes(activeFilter);
    const mS = p.name.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase());
    return mF && mS;
  });

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
    const idx = filteredParks.findIndex(p => p.id === park.id);
    setCarouselIdx(idx >= 0 ? idx : 0);
    setSelectedPark(park);
    setCardState("peek");
    panTo(park);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredParks, panTo]);

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

  // Attributes are not in the collapsed peek. Measured both ways at 390x844:
  // with them the sheet is 199px, without it is 172px — 16% taller for a line
  // that answers neither of the two questions the map is being asked ("where
  // is it", "what does it look like"). 27px of map is a poor trade for it, and
  // the expanded state shows them a tap away.
  const peekDensity = "standard" as const;

  const dismiss = useCallback(() => {
    setCardState("hidden");
    setSelectedPark(null);
  }, []);

  // A park picked on the map may be a park whose row is scrolled out of the
  // index. Bring it back into view so the two halves keep agreeing about what
  // is selected. `block: "nearest"` is what keeps this restrained: a row that
  // is already visible is not moved at all, so clicking rows never scrolls the
  // list under the pointer. Hover deliberately does not call this — an index
  // that chases the cursor is unusable.
  useEffect(() => {
    const row = selectedRowRef.current;
    if (!row || !selectedPark) return;
    row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedPark?.id]);

  // Selecting a different park always returns the sheet to its collapsed
  // state: the expanded sheet is a decision about one park, and carrying it
  // over would bury the next park's map position behind a tall panel.
  useEffect(() => { setCardState(s => (s === "hidden" ? s : "peek")); }, [selectedPark?.id]);

  const navigate = useCallback((dir: 1 | -1) => {
    const next = (carouselIdx + dir + filteredParks.length) % filteredParks.length;
    setSlideDir(dir === 1 ? "left" : "right");
    setCarouselIdx(next);
    setSelectedPark(filteredParks[next]);
    panTo(filteredParks[next]);
    setTimeout(() => setSlideDir(null), 280);
  }, [carouselIdx, filteredParks, panTo]);

  const nearMe = useCallback(() => {
    dismissLocateTip();
    setLocateError("");
    if (!navigator.geolocation || !mapRef.current) {
      setLocateError("Location isn't available in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 12, { animate: true, duration: 1 }),
      err => setLocateError(err.code === err.PERMISSION_DENIED ? "Location access denied" : "Couldn't get your location"),
      { timeout: 10000 }
    );
  }, [dismissLocateTip]);

  useEffect(() => {
    if (!locateError) return;
    const id = setTimeout(() => setLocateError(""), 4000);
    return () => clearTimeout(id);
  }, [locateError]);

  // ── Touch: up = expand, down = collapse then dismiss, left/right = next park ──
  const onCardTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchDir.current = null;
    didDragRef.current = false;
    if (cardRef.current) cardRef.current.style.transition = "none";
  };
  const onCardTouchMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
    if (Math.max(dx, dy) > 10) didDragRef.current = true;
    if (!touchDir.current && Math.max(dx, dy) > 10) {
      if (dx > dy * 1.8) touchDir.current = "h";
      else if (dy > dx * 1.8) touchDir.current = "v";
    }
    // Vertical swipe: give physical feedback by translating the card
    if (touchDir.current === "v" && cardRef.current) {
      const delta = e.touches[0].clientY - touchStart.current.y;
      // Allow drag in both directions — clamp upward drag to 20px so it hints but doesn't fly off
      const clamped = delta < 0 ? Math.max(delta * 0.4, -20) : delta * 0.55;
      cardRef.current.style.transform = `translateY(${clamped}px)`;
    }
  };
  const onCardTouchEnd = (e: React.TouchEvent) => {
    if (cardRef.current) { cardRef.current.style.transition = ""; cardRef.current.style.transform = ""; }
    const dy = touchStart.current.y - e.changedTouches[0].clientY; // +up, -down
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    const finalDir = absDx > absDy ? "h" : absDy > absDx ? "v" : touchDir.current;
    if (finalDir === "h") {
      if (dx < -50) navigate(1);
      else if (dx > 50) navigate(-1);
    } else if (finalDir === "v") {
      // Up opens the sheet rather than opening the park. Swiping up used to
      // navigate straight to the park page, which made the gesture a
      // commitment: there was no way to ask for more about a park without
      // leaving the map. VIEW PARK in the expanded sheet is that commitment
      // now, and it is a button rather than a gesture.
      if (dy > 40) setCardState("expanded");
      // Down steps back one state — expanded collapses to the peek, and the
      // peek dismisses. Dismissing straight from expanded would throw away
      // both the sheet and the selection on one gesture.
      if (dy < -40) {
        if (cardState === "expanded") setCardState("peek");
        else dismiss();
      }
    }
  };

  // ── Mobile: photographic peek, expanding to detail ────────────────────
  // Collapsed shows a shallow photographic strip over the identity block. The
  // photograph is not decoration here: on a map the two questions are "where
  // is it" and "what does it look like", and the terrain is how a reader
  // answers the second. The old sheet answered it with a 192px image that ate
  // 57% of the map; this answers it with an 80px crop that costs a quarter of
  // that. See PEEK_IMAGE_H.
  const expanded = cardState === "expanded";
  const floatingCard = selectedPark && (
    <div
      className={`pms-sheet pms-peek${shortView && !expanded ? " pms-peek--short" : ""}`}
      style={{ position:"absolute", left:0, right:0, bottom:0, zIndex:25, isolation:"isolate" }}
    >
      {filteredParks.length > 1 && (
        <div className="pms-dots">
          {getDotWindow(filteredParks.length, carouselIdx, DOT_WINDOW).map(i => (
            <span key={i} className={i === carouselIdx ? "pms-dot pms-dot-on" : "pms-dot"} />
          ))}
        </div>
      )}
      <div
        ref={cardRef}
        className="pms-peek-body"
        onClick={() => { if (didDragRef.current) return; if (!expanded) setCardState("expanded"); }}
        onTouchStart={onCardTouchStart}
        onTouchMove={onCardTouchMove}
        onTouchEnd={onCardTouchEnd}
        style={{
          animation: slideDir
            ? `fbs-slide-${slideDir === "left" ? "l" : "r"} 0.22s ease both`
            : "fbs-card-in 0.28s cubic-bezier(0.32,0.72,0,1) both",
        }}
      >
        <div className="pms-peek-grip" aria-hidden />

        {expanded ? (
          <>
            <div className="pms-peek-id">
              <ParkCard park={selectedPark} density="expanded" />
            </div>
            <ParkCardThumbnail park={selectedPark} variant="map" />
            <ParkCardCTA slug={selectedPark.slug} />
          </>
        ) : (
          <>
            {/* Photograph first, and flush to the sheet's edges — a strip
                across the top rather than a picture inside a card.
                Dropped on a landscape phone: there the map canvas is only
                ~175px, and an 80px strip plus the identity block was taller
                than the map it sits on. Geography stays; the photograph is
                what a reader can get by expanding. */}
            {!shortView && <ParkCardThumbnail park={selectedPark} variant="peek" />}
            <div className="pms-peek-id pms-peek-id--row">
              <ParkCard park={selectedPark} density={peekDensity} />
              <button
                type="button"
                className="pms-peek-expand"
                aria-label="Show more about this park"
                aria-expanded={false}
                onClick={e => { e.stopPropagation(); setCardState("expanded"); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 15l-6-6-6 6" /></svg>
              </button>
            </div>
          </>
        )}
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
    <div ref={cardRef} className={`pms-panel pms-strip${shortView ? " pms-strip--short" : ""}`}>
      <div className="pms-strip-id">
        <ParkCard park={selectedPark} density={shortView ? "standard" : "expanded"} />
      </div>
      {/* Secondary, and the first two things to go when the strip narrows —
          attributes, then the thumbnail. Name and geography never drop. */}
      {!shortView && (
        <div className="pms-strip-thumb">
          <ParkCardThumbnail
            park={selectedPark}
            variant="strip"
            onClick={() => router.push(`/parks/${selectedPark.slug}`)}
          />
        </div>
      )}
      <ParkCardCTA slug={selectedPark.slug} />
    </div>
  );

  return (
    <div data-parks-page style={{ height: "100%", ["--pms-edge" as string]: shortView ? "14px" : "28px" }}>
      <style>{`
        @keyframes fbs-spin      { to { transform:rotate(360deg); } }
        @keyframes fbs-fade-up   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fbs-card-in   { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes fbs-slide-l   { from { opacity:0; transform:translateX(28px);  } to { opacity:1; transform:translateX(0); } }
        @keyframes fbs-slide-r   { from { opacity:0; transform:translateX(-28px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fbs-strip-in  { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
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
        /* ── Card scale, declared by the layout ────────────────────────────
           The scale a park card is set at is a property of the box it has been
           put in, so each surface states its own. ParkCard carries the language
           and the defaults; these override only what differs. */
        .pms-sheet{ --pcard-title-size: clamp(18px, 4.5vw, 22px); }
        .pms-panel{
          --pcard-title-size: clamp(18px, 1.5vw, 22px);
          --pcard-place-size: 10px;
          --pcard-place-tracking: .1em;
          --pcard-mark-gap: 2px;
          --pcard-place-gap: 4px;
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
          display:flex; align-items:center; gap:clamp(16px, 2vw, 32px);
          padding:14px var(--pda-gutter, 24px);
          background:var(--pda-bg);
          border-top:1px solid var(--pda-line);
          animation:fbs-strip-in .28s cubic-bezier(0.32,0.72,0,1) both;
        }
        /* The identity block takes the room. flex:1 with min-width:0 is what
           stops the CTA and the thumbnail reserving width away from the park
           name — the failure the 280px card had, where VIEW PARK got 112px and
           the name got 76. Nothing here is flex-basis'd off content. */
        .pms-strip-id{ flex:1 1 auto; min-width:0; }
        /* The name wraps rather than ellipsises. A second line is honest; a
           truncated park name is not, and this is the one thing on the strip
           that must always be readable in full. */
        .pms-strip .pcard-name{ white-space:normal; overflow:visible; }
        .pms-strip-thumb{ flex:0 0 auto; height:72px; }
        .pms-strip .pcard-cta-row{ flex:0 0 auto; margin:0; }

        /* Drop order when the strip narrows: attributes first, then the
           thumbnail. Never the name, never the geography. Keyed to the
           viewport because the strip's own width is the map's, which is the
           viewport less the 356px index column. */
        @media (max-width: 1200px){ .pms-strip .pcard-tags{ display:none; } }
        @media (max-width: 1050px){ .pms-strip-thumb{ display:none; } }

        /* Short viewport — the same strip, tightened. Not a separate card:
           the 280px mini-card that used to appear here was a second layout to
           maintain and it truncated the name by 62%. */
        .pms-strip--short{ padding:10px var(--pda-gutter, 24px); }

        /* ── Mobile: photographic peek ─────────────────────────────────────
           Full-bleed to the screen edges and square-cornered, so the
           photograph reads as a strip across the sheet rather than a picture
           inside a floating card. */
        .pms-peek-body{
          background:var(--pda-bg);
          border-top:1px solid var(--pda-line);
          padding-bottom:env(safe-area-inset-bottom, 0px);
          cursor:pointer; user-select:none;
          transition:transform .3s cubic-bezier(0.32,0.72,0,1);
          --pcard-peek-image-h:${PEEK_IMAGE_H}px;
        }
        /* The grip. Overlaid on the photograph rather than given a row of its
           own — it is the swipe affordance and it should not cost 17px of map. */
        .pms-peek-grip{
          position:absolute; top:8px; left:50%; transform:translateX(-50%);
          width:32px; height:3px; border-radius:2px;
          background:rgba(255,255,255,.6); z-index:2; pointer-events:none;
        }
        .pms-peek-id{ padding:11px var(--pda-gutter, 16px) 13px; }
        /* Landscape phone: no photograph and a tighter block, so the sheet
           cannot end up taller than the map canvas behind it. */
        .pms-peek--short .pms-peek-id{ padding:8px var(--pda-gutter, 16px) 9px; }
        .pms-peek--short .pms-peek-grip{ background:var(--pda-line); }
        .pms-peek-id--row{ display:flex; align-items:center; gap:12px; }
        .pms-peek-id--row .pcard{ flex:1 1 auto; min-width:0; }
        .pms-peek-expand{
          flex:0 0 auto; width:32px; height:32px; padding:0;
          display:flex; align-items:center; justify-content:center;
          background:none; border:none; cursor:pointer; color:var(--pda-muted);
        }
        .pms-peek-expand svg{ width:14px; height:14px; }
        .pms-peek-expand:focus-visible{ outline:2px solid var(--pda-accent); outline-offset:-2px; }
        .pms-peek .pcard-cta-row{ margin:0 var(--pda-gutter, 16px) 16px; }
        .pms-peek .pcard-thumb-map{ margin:0 var(--pda-gutter, 16px); }

        /* Carousel dots sit above the sheet, on the map. */
        .pms-dots{ display:flex; justify-content:center; gap:5px; padding-bottom:8px; }
        .pms-dot{ width:5px; height:5px; border-radius:3px; background:rgba(255,255,255,.55); transition:width .15s ease; }
        .pms-dot-on{ width:14px; background:#fff; }

        @media (prefers-reduced-motion: reduce){
          .pms-strip, .pms-peek-body{ animation:none; transition:none; }
        }
        ::-webkit-scrollbar { display:none; }

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
                  ref={isSelected ? selectedRowRef : undefined}
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

        <div style={{ position:"relative", flex:1, height:"100%", minHeight:0, touchAction:"none" }}>
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
              <div style={{ position:"absolute", bottom: selectedPark ? (cardRef.current?.offsetHeight || PEEK_H) + 40 : 20, right:"var(--pda-gutter, 24px)", zIndex:21, transition:"bottom 0.3s" }}>
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
