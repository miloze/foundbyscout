"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { useTheme } from "./ThemeProvider";
import { ParkCard, ParkCardThumbnail } from "./ParkCard";
import { type SortMode, sortParks } from "./parkSort";

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


type CardState = "hidden" | "peek";

const PEEK_H = 196;
const DOT_WINDOW = 7;

// Sliding window of dot indices centred on `active`, capped at `max` — real
// data can run into the hundreds of parks, unlike the mockup's 3-dot example.
function getDotWindow(total: number, active: number, max: number): number[] {
  if (total <= max) return Array.from({ length: total }, (_, i) => i);
  const start = Math.max(0, Math.min(active - Math.floor(max / 2), total - max));
  return Array.from({ length: max }, (_, i) => start + i);
}

export default function ParksMap({
  search, onSearchChange, onBackToList, sortMode, userCoords,
}: {
  search: string;
  onSearchChange?: (v: string) => void;
  onBackToList?: () => void;
  sortMode?: SortMode;
  userCoords?: { lat: number; lng: number } | null;
}) {
  const router = useRouter();
  const [parks, setParks] = useState<Park[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRefs   = useRef<Record<string,any>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
  const [carouselIdx,  setCarouselIdx]  = useState(0);
  const [cardState,    setCardState]    = useState<CardState>("hidden");
  const [slideDir,     setSlideDir]     = useState<"left"|"right"|null>(null);
  const [searchOpen,   setSearchOpen]   = useState(() => search.length > 0);
  const [locateTip,    setLocateTip]    = useState(false);
  const [locateError,  setLocateError]  = useState("");
  const didDragRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const zoomControlRef = useRef<any>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
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
        tileLayerRef.current = L.tileLayer(
          theme === "light"
            ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          { attribution:"© OpenStreetMap contributors © CARTO", subdomains:"abcd", maxZoom:19 }
        ).addTo(map);
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
        const dot = L.divIcon({ className:"", html:`<div style="width:12px;height:12px;background:#888;border-radius:50%;border:2px solid rgba(136,136,136,0.3);transition:background .2s,transform .15s;"></div>`, iconSize:[12,12], iconAnchor:[6,6] });
        markerRefs.current[park.id] = L.marker([park.lat,park.lng],{ icon:dot }).addTo(mapRef.current).on("click",()=>openPark(park));
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
    const ro = new ResizeObserver(() => { mapRef.current?.invalidateSize(); });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mapStatus]);

  useEffect(() => {
    if (!mapRef.current) return;
    const id = setTimeout(() => mapRef.current?.invalidateSize(), 60);
    return () => clearTimeout(id);
  }, [isMobile]);

  // On load: pick a random London park, zoom to it and select it
  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || parks.length === 0) return;
    const londonParks = parks.filter(p => p.location?.includes("London") && p.lat != null && p.lng != null);
    if (!londonParks.length) return;
    const park = londonParks[Math.floor(Math.random() * londonParks.length)];
    mapRef.current.setView([park.lat, park.lng], 14, { animate: false });
    openPark(park);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStatus, parks]);

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then(({ default: L }) => {
      if (tileLayerRef.current) { tileLayerRef.current.remove(); tileLayerRef.current = null; }
      if (satellite) {
        tileLayerRef.current = L.tileLayer(
          `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_TOKEN}`,
          { attribution: "© Mapbox © OpenStreetMap", maxZoom: 19 }
        ).addTo(mapRef.current);
      } else {
        tileLayerRef.current = L.tileLayer(
          theme === "light"
            ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          { attribution: "© OpenStreetMap contributors © CARTO", subdomains: "abcd", maxZoom: 19 }
        ).addTo(mapRef.current);
      }
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

  const filteredParks = sortParks(
    parks.filter(p => {
      const mF = activeFilter === "All" || p.location.includes(activeFilter) || p.borough.includes(activeFilter);
      const mS = p.name.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase());
      return mF && mS;
    }),
    sortMode ?? "az",
    userCoords ?? null
  );

  useEffect(() => {
    Object.entries(markerRefs.current).forEach(([id, marker]) => {
      const visible = filteredParks.some(p => p.id === id);
      const el = marker.getElement?.()?.querySelector("div");
      if (!el) return;
      const sel = selectedPark?.id === id;
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff5841";
      el.style.background    = sel ? accent : "#888";
      el.style.transform     = sel ? "scale(1.8)" : "scale(1)";
      el.style.boxShadow     = sel ? `0 0 0 5px ${accent}44` : "none";
      el.style.opacity       = visible ? "1" : "0.15";
      el.style.pointerEvents = visible ? "auto" : "none";
    });
  }, [selectedPark, filteredParks]);

  const openPark = useCallback((park: Park) => {
    const idx = filteredParks.findIndex(p => p.id === park.id);
    setCarouselIdx(idx >= 0 ? idx : 0);
    setSelectedPark(park);
    setCardState("peek");
    panTo(park);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredParks, panTo]);

  const dismiss = useCallback(() => {
    setCardState("hidden");
    setSelectedPark(null);
  }, []);

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

  // ── Touch: swipe down = dismiss, left/right = navigate between parks ──
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
      if (dy > 40 && selectedPark) router.push(`/parks/${selectedPark.slug}`); // swipe up → park page
      if (dy < -40) dismiss();                                                  // swipe down → dismiss
    }
  };

  // Shared bottom sheet — same content model and markup at every breakpoint,
  // so mobile and desktop can't drift into two maintained card layouts.
  const floatingCard = selectedPark && (
    <div style={{ position:"absolute", bottom:"calc(20px + env(safe-area-inset-bottom, 0px))", left:16, right:16, zIndex:25, display:"flex", flexDirection:"column", gap:8, isolation:"isolate" }}>
      {filteredParks.length > 1 && (
        <div style={{ display:"flex", justifyContent:"center", gap:5 }}>
          {getDotWindow(filteredParks.length, carouselIdx, DOT_WINDOW).map(i => (
            <span key={i} style={{
              width: i === carouselIdx ? 14 : 5, height:5, borderRadius:3,
              background: i === carouselIdx ? "#fff" : "rgba(255,255,255,0.55)",
              boxShadow:"0 1px 3px rgba(0,0,0,0.4)",
              transition:"width 0.15s ease",
            }} />
          ))}
        </div>
      )}
      <div
        ref={cardRef}
        className="fbs-card"
        onClick={() => { if (didDragRef.current) return; if (selectedPark) router.push(`/parks/${selectedPark.slug}`); }}
        onTouchStart={onCardTouchStart}
        onTouchMove={onCardTouchMove}
        onTouchEnd={onCardTouchEnd}
        style={{
          background: theme === "dark" ? "rgba(22,22,22,0.97)" : "rgba(248,246,242,0.97)",
          WebkitBackdropFilter:"blur(16px)",
          backdropFilter:"blur(16px)",
          transform:"translateZ(0)",
          WebkitTransform:"translateZ(0)",
          borderRadius:12,
          padding:"16px 18px 18px",
          boxShadow:"0 8px 32px rgba(0,0,0,0.28)",
          cursor:"pointer", userSelect:"none",
          animation: slideDir ? `fbs-slide-${slideDir === "left" ? "l" : "r"} 0.22s ease both` : "fbs-card-in 0.28s cubic-bezier(0.32,0.72,0,1) both",
        }}
      >
        {/* Swipe handle */}
        <div style={{ width:32,height:3,background:"var(--border)",borderRadius:2,margin:"0 auto 14px" }} />

        <ParkCard park={selectedPark} idx={carouselIdx} variant="map" showLocation={false} showAddress />
        <ParkCardThumbnail park={selectedPark} variant="map" />
      </div>
    </div>
  );

  // Desktop split view — compact card anchored bottom-left of the map panel,
  // synced with the list column instead of a swipeable full-width bottom sheet.
  const splitCard = selectedPark && (
    <div
      ref={cardRef}
      onClick={() => router.push(`/parks/${selectedPark.slug}`)}
      style={{
        position:"absolute", left:12, bottom:12, zIndex:25,
        width:"26%", minWidth:140,
        background: theme === "dark" ? "rgba(22,22,22,0.97)" : "rgba(248,246,242,0.97)",
        WebkitBackdropFilter:"blur(16px)",
        backdropFilter:"blur(16px)",
        borderRadius:12,
        padding:"14px 14px 16px",
        boxShadow:"0 8px 32px rgba(0,0,0,0.28)",
        cursor:"pointer", userSelect:"none",
        animation:"fbs-split-in 0.32s cubic-bezier(0.32,0.72,0,1) both",
      }}
    >
      <ParkCard park={selectedPark} idx={carouselIdx} variant="map" showLocation={false} showAddress />
      <ParkCardThumbnail park={selectedPark} variant="map" />
    </div>
  );

  return (
    <div data-parks-page style={{ height: "100%" }}>
      <style>{`
        @keyframes fbs-spin      { to { transform:rotate(360deg); } }
        @keyframes fbs-fade-up   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fbs-card-in   { from { transform:translateY(${PEEK_H + 20}px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes fbs-slide-l   { from { opacity:0; transform:translateX(28px);  } to { opacity:1; transform:translateX(0); } }
        @keyframes fbs-slide-r   { from { opacity:0; transform:translateX(-28px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fbs-split-in  { from { transform:translateY(232px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        .leaflet-container { background:var(--background) !important; }
        .leaflet-control-attribution { font-size:9px !important; background:rgba(0,0,0,0.4) !important; color:#888 !important; }
        .leaflet-control-attribution a { color:#aaa !important; }
        ::-webkit-scrollbar { display:none; }
        .fbs-card { transition: transform 0.3s cubic-bezier(0.32,0.72,0,1); }

        /* Desktop split view — list column stays synced with the map beside it */
        .pms-index-list{ width:280px; flex-shrink:0; min-height:0; height:100%; overflow-y:auto; border-right:1px solid var(--pda-line); }
        .pms-index-row{ display:block; width:100%; text-align:left; background:none; border:none; padding:0; cursor:pointer; box-shadow:0 1px 0 var(--pda-line); transition:background .15s var(--pda-ease); }
        .pms-index-row:hover{ background:var(--pda-panel); }
        .pms-index-row.pms-active{ background:var(--pda-panel); }
        .pms-index-row.pms-active .pcard-id{ background:var(--pda-accent); color:var(--pda-ink); }
        .pms-index-row.pms-active .pcard-name{ color:var(--pda-accent); }
      `}</style>

      {/* List column and map canvas are always both mounted — only the
          overlay chrome around the map differs by breakpoint. The map
          canvas must never unmount/remount across the mobile/desktop
          switch, or the Leaflet instance orphans against a detached
          container and markers stop tracking real positions. */}
      <div style={{ display:"flex", height:"100%", minHeight:0, overflow:"hidden" }}>
        {!isMobile && (
          <div className="pms-index-list">
            {filteredParks.map((park, idx) => (
              <button
                key={park.id}
                type="button"
                className={`pms-index-row${selectedPark?.id === park.id ? " pms-active" : ""}`}
                onClick={() => { if (park.lat && park.lng) openPark(park); }}
              >
                <ParkCard park={park} idx={idx} variant="index" showTags={false} showLocation showAddress={false} />
              </button>
            ))}
          </div>
        )}

        <div style={{ position:"relative", flex:1, height:"100%", minHeight:0 }}>
          <div ref={containerRef} style={{ position:"absolute", inset:0, zIndex:0 }} />

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
              {/* List / Map strip — thin, translucent, always visible */}
              <div style={{ position:"absolute", top:60, left:0, right:0, zIndex:22, height:34, display:"flex", alignItems:"center", justifyContent:"center", background: theme === "dark" ? "rgba(20,20,20,0.55)" : "rgba(255,255,255,0.55)", WebkitBackdropFilter:"blur(8px)", backdropFilter:"blur(8px)" }}>
                <div style={{ display:"flex", border:"1px solid var(--border)", borderRadius:14, overflow:"hidden" }}>
                  <button onClick={onBackToList} style={{ padding:"4px 14px", fontSize:10, fontWeight:"bold", fontFamily:"var(--font-mono)", textTransform:"uppercase", letterSpacing:"0.1em", background:"transparent", color:"var(--foreground)", border:"none", cursor:"pointer" }}>List</button>
                  <button style={{ padding:"4px 14px", fontSize:10, fontWeight:"bold", fontFamily:"var(--font-mono)", textTransform:"uppercase", letterSpacing:"0.1em", background:"var(--accent)", color:"#fff", border:"none", cursor:"default" }}>Map</button>
                </div>
              </div>

              {/* Search — collapsible icon */}
              <div style={{
                position:"absolute", top:104, left:16, zIndex:21, display:"flex", alignItems:"center",
                height:44, borderRadius:22, overflow:"hidden",
                background: theme === "dark" ? "rgba(30,30,30,0.95)" : "#fff",
                boxShadow:"0 4px 14px rgba(0,0,0,0.15)",
                width: searchOpen ? 230 : 44,
                transition:"width 0.25s cubic-bezier(0.32,0.72,0,1)",
              }}>
                <button onClick={() => setSearchOpen(v => !v)} style={{ width:44, height:44, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:"none", border:"none", cursor:"pointer", color: theme === "dark" ? "#fff" : "#141414" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </button>
                {searchOpen && (
                  <input
                    autoFocus
                    type="text" placeholder="Search…" value={search}
                    onChange={e => onSearchChange?.(e.target.value)}
                    style={{ flex:1, minWidth:0, height:44, border:"none", outline:"none", background:"transparent", fontFamily:"var(--font-mono)", fontSize:12, letterSpacing:"0.04em", color:"var(--foreground)", paddingRight:14 }}
                  />
                )}
              </div>

              {/* Satellite — its own spot, no longer stacked with locate */}
              <div style={{ position:"absolute", top:104, right:16, zIndex:21 }}>
                <button onClick={() => setSatellite(v => !v)} title="Satellite" style={{ width:44, height:44, borderRadius:"50%", background: satellite ? "#141414" : (theme === "dark" ? "rgba(30,30,30,0.95)" : "#fff"), border:"none", boxShadow:"0 4px 14px rgba(0,0,0,0.15)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color: satellite ? "#fff" : (theme === "dark" ? "#fff" : "#141414") }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                </button>
              </div>

              {/* Locate — floating, bottom-right of the map canvas, clear of the card */}
              <div style={{ position:"absolute", bottom: selectedPark ? (cardRef.current?.offsetHeight || PEEK_H) + 40 : 20, right:16, zIndex:21, transition:"bottom 0.3s" }}>
                {(locateTip || locateError) && (
                  <div style={{ position:"absolute", bottom:"calc(100% + 8px)", right:0, background: locateError ? "var(--accent, #ff5841)" : "#141414", color:"#fff", fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.04em", padding:"6px 10px", borderRadius:6, whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(0,0,0,0.35)" }}>
                    {locateError || "Recenter map"}
                  </div>
                )}
                <button onClick={nearMe} title="Recenter map" style={{ width:44, height:44, borderRadius:"50%", background: theme === "dark" ? "rgba(30,30,30,0.95)" : "#fff", border:"none", boxShadow:"0 4px 14px rgba(0,0,0,0.15)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color: theme === "dark" ? "#fff" : "#141414" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
                </button>
              </div>

              {floatingCard}
            </>
          ) : (
            <>
              {/* Satellite + Locate — floating side by side, top-right of the map canvas */}
              <div style={{ position:"absolute", top:20, right:20, zIndex:12, display:"flex", gap:8 }}>
                <button onClick={()=>setSatellite(v=>!v)} title="Satellite"
                  style={{ width:38, height:38, borderRadius:4, background: satellite ? "var(--accent)" : "var(--card)", border:`1px solid ${satellite ? "var(--accent)" : "var(--border)"}`, boxShadow:"0 2px 8px rgba(0,0,0,0.2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color: satellite ? "#fff" : "var(--foreground)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                </button>
                <div style={{ position:"relative" }}>
                  {(locateTip || locateError) && (
                    <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, background: locateError ? "var(--accent, #ff5841)" : "#141414", color:"#fff", fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.04em", padding:"6px 10px", borderRadius:6, whiteSpace:"nowrap", boxShadow:"0 4px 12px rgba(0,0,0,0.35)" }}>
                      {locateError || "Recenter map"}
                    </div>
                  )}
                  <button onClick={nearMe} title="Recenter map" style={{ width:38, height:38, borderRadius:4, background:"var(--card)", border:"1px solid var(--border)", boxShadow:"0 2px 8px rgba(0,0,0,0.2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--foreground)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
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
