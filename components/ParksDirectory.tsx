"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { useTheme } from "./ThemeProvider";

type Park = {
  id: string; slug: string; name: string; postcode: string;
  location: string; borough: string; lat: number; lng: number;
  type: string; is_covered: boolean; is_free: boolean;
  hero_image: string; brief: string;
};

const TYPE_FILTERS = ["All", "Street", "Transition", "Bowl", "Free", "Covered"];

// Repeating editorial card size pattern — [colSpan out of 12]
// Pairs: [5,7] then [7,5] then [4,4,4] then repeat
const COL_PATTERN = [5, 7, 7, 5, 4, 4, 4];

function getColSpan(idx: number): number {
  return COL_PATTERN[idx % COL_PATTERN.length];
}

const PEEK_H = 196;

export default function ParksDirectory() {
  const router = useRouter();
  const [parks,       setParks]       = useState<Park[]>([]);
  const [typeFilter,  setTypeFilter]  = useState("All");
  const [search,      setSearch]      = useState("");
  const [view,        setView]        = useState<"gallery" | "map">("gallery");
  const [isMobile,    setIsMobile]    = useState(true);
  const [mapStatus,   setMapStatus]   = useState<"loading" | "ready" | "error">("loading");
  const [mapError,    setMapError]    = useState("");
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);
  const [carouselIdx,  setCarouselIdx]  = useState(0);
  const [slideDir,     setSlideDir]     = useState<"left" | "right" | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRefs   = useRef<Record<string, any>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef      = useRef<HTMLDivElement>(null);
  const touchStart   = useRef({ x: 0, y: 0 });
  const touchDir     = useRef<"h" | "v" | null>(null);

  const { theme } = useTheme();

  // ── Responsive ────────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Fetch parks ───────────────────────────────────────────────────────────
  useEffect(() => {
    import("@supabase/supabase-js").then(({ createClient }) => {
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      db.from("parks")
        .select("id, slug, name, postcode, location, borough, lat, lng, type, is_covered, is_free, hero_image, brief")
        .eq("published", true)
        .order("sort_order", { ascending: true })
        .then(({ data }) => { if (data) setParks(data as Park[]); });
    });
  }, []);

  // ── Leaflet init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;
    let cancelled = false;
    import("leaflet").then(({ default: L }) => {
      if (cancelled) return;
      const el = containerRef.current;
      if (!el) { setMapStatus("error"); setMapError("Map container not found"); return; }
      try {
        const map = L.map(el, { center: [54.2, -3.5], zoom: 6, zoomControl: false });
        const mbToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        const tileUrl = theme === "light"
          ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          : `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${mbToken}`;
        const attribution = theme === "light"
          ? "© OpenStreetMap contributors © CARTO"
          : "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>";
        tileLayerRef.current = L.tileLayer(tileUrl, { attribution, subdomains: "abcd", maxZoom: 22 }).addTo(map);
        L.control.zoom({ position: "bottomright" }).addTo(map);
        mapRef.current = map;
        setMapStatus("ready");
      } catch (err) { setMapStatus("error"); setMapError(String(err)); }
    }).catch(err => { if (!cancelled) { setMapStatus("error"); setMapError(String(err)); } });
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add markers ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || parks.length === 0) return;
    import("leaflet").then(({ default: L }) => {
      parks.forEach(park => {
        if (markerRefs.current[park.id]) return;
        if (!park.lat || !park.lng) return;
        const dot = L.divIcon({
          className: "",
          html: `<div style="width:12px;height:12px;background:#888;border-radius:50%;border:2px solid rgba(136,136,136,0.3);transition:background .2s,transform .15s;"></div>`,
          iconSize: [12, 12], iconAnchor: [6, 6],
        });
        markerRefs.current[park.id] = L.marker([park.lat, park.lng], { icon: dot })
          .addTo(mapRef.current)
          .on("click", () => openPark(park));
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parks, mapStatus]);

  // ── Invalidate map size when switching to map view ────────────────────────
  useEffect(() => {
    if (view === "map" && mapRef.current) {
      setTimeout(() => mapRef.current?.invalidateSize(), 50);
    }
  }, [view]);

  // ── On map ready + parks loaded: zoom to London ───────────────────────────
  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || parks.length === 0) return;
    const londonParks = parks.filter(p => p.location?.includes("London"));
    if (!londonParks.length) return;
    const park = londonParks[Math.floor(Math.random() * londonParks.length)];
    mapRef.current.setView([park.lat, park.lng], 11, { animate: false });
    if (view === "map") openPark(park);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStatus, parks]);

  // ── Theme tile swap ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!tileLayerRef.current || !mapRef.current) return;
    const mbToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    tileLayerRef.current.setUrl(
      theme === "light"
        ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        : `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}@2x?access_token=${mbToken}`
    );
  }, [theme]);

  // ── Marker highlight ──────────────────────────────────────────────────────
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPark, parks, typeFilter, search]);

  // ── Filtered parks ────────────────────────────────────────────────────────
  const filteredParks = parks.filter(p => {
    const mT = typeFilter === "All"
      || p.type === typeFilter
      || (typeFilter === "Free"    && p.is_free)
      || (typeFilter === "Covered" && p.is_covered);
    const mS = !search
      || p.name.toLowerCase().includes(search.toLowerCase())
      || p.location.toLowerCase().includes(search.toLowerCase());
    return mT && mS;
  });

  // ── Map helpers ───────────────────────────────────────────────────────────
  const panTo = useCallback((park: Park) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (isMobile) {
      map.panTo([park.lat, park.lng], { animate: true, duration: 0.4 });
    } else {
      const pt = map.latLngToContainerPoint([park.lat, park.lng]);
      map.panTo(map.containerPointToLatLng(pt.add([-140, PEEK_H / 2])), { animate: true, duration: 0.4 });
    }
  }, [isMobile]);

  const openPark = useCallback((park: Park) => {
    const idx = filteredParks.findIndex(p => p.id === park.id);
    setCarouselIdx(idx >= 0 ? idx : 0);
    setSelectedPark(park);
    panTo(park);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredParks, panTo]);

  const dismiss = useCallback(() => setSelectedPark(null), []);

  const navigate = useCallback((dir: 1 | -1) => {
    const next = (carouselIdx + dir + filteredParks.length) % filteredParks.length;
    setSlideDir(dir === 1 ? "left" : "right");
    setCarouselIdx(next);
    setSelectedPark(filteredParks[next]);
    panTo(filteredParks[next]);
    setTimeout(() => setSlideDir(null), 280);
  }, [carouselIdx, filteredParks, panTo]);

  const nearMe = useCallback(() => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      pos => mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 12, { animate: true, duration: 1 }),
      () => {}
    );
  }, []);

  // ── Touch handlers (mobile map card) ─────────────────────────────────────
  const onCardTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchDir.current = null;
    if (cardRef.current) cardRef.current.style.transition = "none";
  };
  const onCardTouchMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
    if (!touchDir.current && Math.max(dx, dy) > 10) {
      if (dx > dy * 1.8) touchDir.current = "h";
      else if (dy > dx * 1.8) touchDir.current = "v";
    }
    if (touchDir.current === "v" && cardRef.current) {
      const delta = e.touches[0].clientY - touchStart.current.y;
      const clamped = delta < 0 ? Math.max(delta * 0.4, -20) : delta * 0.55;
      cardRef.current.style.transform = `translateY(${clamped}px)`;
    }
  };
  const onCardTouchEnd = (e: React.TouchEvent) => {
    if (cardRef.current) { cardRef.current.style.transition = ""; cardRef.current.style.transform = ""; }
    const dy = touchStart.current.y - e.changedTouches[0].clientY;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    const finalDir = absDx > absDy ? "h" : absDy > absDx ? "v" : touchDir.current;
    if (finalDir === "h") {
      if (dx < -50) navigate(1);
      else if (dx > 50) navigate(-1);
    } else if (finalDir === "v") {
      if (dy > 40 && selectedPark) router.push(`/parks/${selectedPark.slug}`);
      if (dy < -40) dismiss();
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const imgFilter = "grayscale(1) contrast(1.05) brightness(0.88)";

  function Badge({ label, accent }: { label: string; accent?: boolean }) {
    return (
      <span style={{
        fontSize: 9, fontWeight: "bold", textTransform: "uppercase",
        letterSpacing: "0.12em", padding: "3px 8px",
        background: accent ? "var(--accent)" : "rgba(0,0,0,0.55)",
        color: "#fff", backdropFilter: "blur(4px)",
        fontFamily: "var(--font-mono)",
      }}>{label}</span>
    );
  }

  // ── Gallery card ──────────────────────────────────────────────────────────
  function GalleryCard({ park, colSpan, idx }: { park: Park; colSpan: number; idx: number }) {
    const isLarge  = colSpan >= 7;
    const isSmall  = colSpan <= 4;
    const aspect   = isLarge ? "56.25%" : isSmall ? "133.33%" : "125%"; // 16:9 / 3:4 / 4:5
    const delay    = `${(idx % 6) * 60}ms`;

    return (
      <a
        href={`/parks/${park.slug}`}
        style={{
          gridColumn: `span ${colSpan}`,
          display: "block",
          textDecoration: "none",
          color: "inherit",
          position: "relative",
          overflow: "hidden",
          cursor: "pointer",
          animation: `fbs-fade-up 0.5s ease both`,
          animationDelay: delay,
        }}
      >
        {/* Image */}
        <div style={{ position: "relative", paddingBottom: aspect, overflow: "hidden", background: "var(--card)" }}>
          {park.hero_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={park.hero_image}
              alt={park.name}
              className="fbs-park-img"
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: "cover",
                filter: imgFilter,
                transition: "filter 0.3s ease",
              }}
            />
          )}
          <div className="fbs-park-overlay" />
          {/* Type badge — top left */}
          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 4 }}>
            <Badge label={park.type} accent />
            {park.is_free && <Badge label="Free" />}
            {park.is_covered && <Badge label="Covered" />}
          </div>
        </div>

        {/* Info — below image */}
        <div style={{ padding: isSmall ? "10px 12px 12px" : "14px 16px 16px", background: "var(--background)" }}>
          <p style={{
            fontFamily: "var(--font-heading)",
            fontSize: 18,
            fontWeight: 300, letterSpacing: "-0.02em",
            textTransform: "uppercase", lineHeight: 1.05,
            color: "var(--foreground)", marginBottom: 4,
          }}>{park.name}</p>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase",
            letterSpacing: "0.16em", color: "var(--muted)",
          }}>{park.location}</p>
          {!isSmall && park.brief && (
            <p style={{
              fontSize: 12, lineHeight: 1.6, color: "var(--muted)",
              marginTop: 8,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            } as React.CSSProperties}>{park.brief}</p>
          )}
        </div>
      </a>
    );
  }

  // ── Mobile gallery card (full width) ─────────────────────────────────────
  function MobileCard({ park, idx }: { park: Park; idx: number }) {
    return (
      <a
        href={`/parks/${park.slug}`}
        style={{
          display: "block", textDecoration: "none", color: "inherit",
          borderBottom: "1px solid var(--border)",
          animation: `fbs-fade-up 0.4s ease both`,
          animationDelay: `${idx * 50}ms`,
        }}
      >
        <div style={{ position: "relative", paddingBottom: "75%", overflow: "hidden", background: "var(--card)" }}>
          {park.hero_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={park.hero_image} alt={park.name}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: imgFilter }}
            />
          )}
          <div className="fbs-park-overlay" />
          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 4 }}>
            <Badge label={park.type} accent />
            {park.is_free && <Badge label="Free" />}
          </div>
        </div>
        <div style={{ padding: "12px 16px 14px", background: "var(--background)" }}>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 300, letterSpacing: "-0.02em", textTransform: "uppercase", lineHeight: 1.05, color: "var(--foreground)", marginBottom: 3 }}>{park.name}</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)" }}>{park.location}</p>
        </div>
      </a>
    );
  }

  // ── Toolbar ───────────────────────────────────────────────────────────────
  function Toolbar() {
    return (
      <div style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "var(--background)",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center",
        gap: 0, height: 44,
      }}>
        {/* Search */}
        <div style={{ position: "relative", flexShrink: 0, borderRight: "1px solid var(--border)" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--muted)", pointerEvents: "none" }}>⌕</span>
          <input
            type="text" placeholder={isMobile ? "Search…" : "Search parks or areas…"} value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: isMobile ? 120 : 220, height: 44, padding: "0 12px 0 34px",
              fontSize: 12, background: "transparent",
              border: "none", color: "var(--foreground)",
              outline: "none", fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
            }}
          />
        </div>

        {/* Type filter pills — scrollable */}
        <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none", flex: 1 }}>
          {TYPE_FILTERS.map(f => (
            <button key={f} onClick={() => setTypeFilter(f === typeFilter ? "All" : f)} style={{
              flexShrink: 0, height: 44, padding: "0 14px",
              fontSize: 10, fontWeight: "bold", fontFamily: "var(--font-mono)",
              textTransform: "uppercase", letterSpacing: "0.1em",
              cursor: "pointer",
              background: typeFilter === f ? "var(--accent)" : "transparent",
              color: typeFilter === f ? "#fff" : "var(--muted)",
              border: "none", borderRight: "1px solid var(--border)",
              transition: "background 0.15s, color 0.15s",
            }}>{f}</button>
          ))}
        </div>

        {/* Gallery / Map toggle */}
        <div style={{ display: "flex", flexShrink: 0, borderLeft: "1px solid var(--border)" }}>
          {(["gallery", "map"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              height: 44, padding: "0 16px",
              fontSize: 10, fontWeight: "bold", fontFamily: "var(--font-mono)",
              textTransform: "uppercase", letterSpacing: "0.1em",
              cursor: "pointer",
              background: view === v ? "var(--foreground)" : "transparent",
              color: view === v ? "var(--background)" : "var(--muted)",
              border: "none", borderLeft: v === "map" ? "1px solid var(--border)" : "none",
              transition: "background 0.15s, color 0.15s",
            }}>
              {v === "gallery"
                ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="6" height="10"/><rect x="8" y="0" width="8" height="6"/><rect x="8" y="8" width="8" height="8"/></svg>
                    {!isMobile && "Gallery"}
                  </span>
                : <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="5" r="2"/><circle cx="11" cy="11" r="2"/><circle cx="11" cy="4" r="2"/><path d="M5 7v4M11 6v3"/></svg>
                    {!isMobile && "Map"}
                  </span>
              }
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div data-parks-page>
      <style>{`
        @keyframes fbs-spin    { to { transform: rotate(360deg); } }
        @keyframes fbs-fade-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fbs-card-in { from { transform:translateY(220px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes fbs-slide-l { from { opacity:0; transform:translateX(28px);  } to { opacity:1; transform:translateX(0); } }
        @keyframes fbs-slide-r { from { opacity:0; transform:translateX(-28px); } to { opacity:1; transform:translateX(0); } }
        .leaflet-container { background:var(--background) !important; }
        .leaflet-control-attribution { font-size:9px !important; background:rgba(0,0,0,0.4) !important; color:#888 !important; }
        .leaflet-control-attribution a { color:#aaa !important; }
        ::-webkit-scrollbar { display:none; }
        .fbs-card { transition: transform 0.3s cubic-bezier(0.32,0.72,0,1); }
        .fbs-park-overlay { position:absolute; inset:0; background:var(--accent); opacity:0; transition:opacity 0.3s ease; pointer-events:none; }
        a:hover .fbs-park-overlay { opacity:0.28; }
        a:active .fbs-park-overlay { opacity:0.28; }
      `}</style>

      <Toolbar />

      {/* ── Leaflet container — always mounted ──────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          position: view === "map" ? "relative" : "absolute",
          // Keep in DOM but invisible when in gallery view
          width: "100%",
          height: view === "map" ? "calc(100dvh - 48px - 44px)" : 0,
          opacity: view === "map" ? 1 : 0,
          pointerEvents: view === "map" ? "auto" : "none",
          zIndex: view === "map" ? 1 : -1,
          overflow: "hidden",
        }}
      />

      {/* ── Map: status overlays ─────────────────────────────────────────── */}
      {view === "map" && mapStatus === "loading" && (
        <div style={{ position: "fixed", inset: 0, top: 92, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 5, background: "var(--background)", pointerEvents: "none" }}>
          <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "fbs-spin 0.8s linear infinite" }} />
          <p style={{ marginTop: 12, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Loading map…</p>
        </div>
      )}
      {view === "map" && mapStatus === "error" && (
        <div style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: "bold", color: "var(--accent)", marginBottom: 10 }}>Map failed to load</p>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>{mapError}</p>
        </div>
      )}

      {/* ── Map: desktop sidebar + preview bar ──────────────────────────── */}
      {view === "map" && !isMobile && (
        <>
          {/* Sidebar */}
          <div style={{ position: "fixed", top: 92, left: "clamp(16px, 4vw, 56px)", bottom: 0, width: 300, background: "var(--background)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", zIndex: 10, overflowY: "auto" }}>
            {filteredParks.map(park => {
              const sel = selectedPark?.id === park.id;
              return (
                <button key={park.id} onClick={() => openPark(park)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: sel ? "var(--card)" : "none", cursor: "pointer", textAlign: "left", border: "none", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: sel ? "var(--accent)" : "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textTransform: "uppercase", letterSpacing: "-0.01em" }}>{park.name}</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>{park.location}</p>
                    <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, padding: "2px 6px", background: "var(--accent)", color: "#fff", letterSpacing: "0.08em", textTransform: "uppercase" }}>{park.type}</span>
                      {park.is_free    && <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, padding: "2px 6px", border: "1px solid var(--border)", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Free</span>}
                      {park.is_covered && <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, padding: "2px 6px", border: "1px solid var(--border)", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Covered</span>}
                    </div>
                  </div>
                  {/* Postcode badge */}
                  <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: "50%", background: sel ? "var(--accent)" : "var(--card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: 9, fontWeight: 300, color: sel ? "#fff" : "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center", lineHeight: 1.1 }}>
                      {park.postcode.split(" ")[0]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preview bar */}
          {selectedPark && (
            <div style={{ position: "fixed", bottom: 0, left: "calc(clamp(16px, 4vw, 56px) + 300px)", right: "clamp(16px, 4vw, 56px)", height: PEEK_H, background: "var(--background)", borderTop: "1px solid var(--border)", zIndex: 11, display: "flex", alignItems: "stretch", animation: "fbs-card-in 0.28s cubic-bezier(0.32,0.72,0,1) both" }}>
              {selectedPark.hero_image && (
                <div style={{ width: 200, flexShrink: 0, overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedPark.hero_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: imgFilter }} />
                </div>
              )}
              <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "center", borderLeft: "1px solid var(--border)", minWidth: 0, gap: 4 }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(20px,2.2vw,30px)", fontWeight: 300, letterSpacing: "-0.02em", textTransform: "uppercase", lineHeight: 1, color: "var(--foreground)" }}>{selectedPark.name}</h3>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginTop: 4 }}>{selectedPark.location}</p>
                <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, padding: "2px 7px", background: "var(--accent)", color: "#fff", letterSpacing: "0.08em", textTransform: "uppercase" }}>{selectedPark.type}</span>
                  {selectedPark.is_free    && <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, padding: "2px 7px", border: "1px solid var(--border)", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Free</span>}
                  {selectedPark.is_covered && <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, padding: "2px 7px", border: "1px solid var(--border)", color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Covered</span>}
                </div>
              </div>
              <div style={{ flexShrink: 0, padding: "16px 20px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 8, borderLeft: "1px solid var(--border)" }}>
                <button onClick={dismiss} style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--muted)", fontSize: 14 }}>✕</button>
                <button onClick={() => router.push(`/parks/${selectedPark.slug}`)} style={{ padding: "11px 20px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", whiteSpace: "nowrap" }}>
                  View Park →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Map: mobile floating card ────────────────────────────────────── */}
      {view === "map" && isMobile && selectedPark && (
        <div
          ref={cardRef}
          className="fbs-card"
          onClick={() => router.push(`/parks/${selectedPark.slug}`)}
          onTouchStart={onCardTouchStart}
          onTouchMove={onCardTouchMove}
          onTouchEnd={onCardTouchEnd}
          style={{
            position: "fixed", bottom: 20, left: 16, right: 16, zIndex: 25,
            background: theme === "dark" ? "rgba(22,22,22,0.97)" : "rgba(248,246,242,0.97)",
            backdropFilter: "blur(16px)", borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
            cursor: "pointer", userSelect: "none",
            animation: slideDir ? `fbs-slide-${slideDir === "left" ? "l" : "r"} 0.22s ease both` : "fbs-card-in 0.28s cubic-bezier(0.32,0.72,0,1) both",
          }}
        >
          {/* Thumbnail */}
          {selectedPark.hero_image && (
            <div style={{ position: "relative", height: 130, overflow: "hidden", background: "var(--card)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPark.hero_image}
                alt=""
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: imgFilter }}
              />
              {/* Badge overlay */}
              <div style={{ position: "absolute", top: 10, left: 14, display: "flex", gap: 4 }}>
                <Badge label={selectedPark.type} accent />
                {selectedPark.is_free    && <Badge label="Free" />}
                {selectedPark.is_covered && <Badge label="Covered" />}
              </div>
            </div>
          )}

          {/* Text content */}
          <div style={{ padding: "14px 16px 16px" }}>
            {/* Drag handle */}
            <div style={{ width: 32, height: 3, background: "var(--border)", borderRadius: 2, margin: "0 auto 12px" }} />
            {/* Badges (shown only if no image) */}
            {!selectedPark.hero_image && (
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em", padding: "3px 10px", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{selectedPark.type}</span>
                {selectedPark.is_free    && <span style={{ fontSize: 10, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em", padding: "3px 10px", border: "1px solid var(--accent)", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>Free</span>}
                {selectedPark.is_covered && <span style={{ fontSize: 10, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em", padding: "3px 10px", border: "1px solid var(--accent)", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>Covered</span>}
              </div>
            )}
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1.05, color: "var(--foreground)", marginBottom: 4, textTransform: "uppercase" }}>{selectedPark.name}</h3>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--muted)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>{selectedPark.location}</p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{selectedPark.brief}</p>
          </div>
        </div>
      )}

      {/* ── Map: mobile near me button ───────────────────────────────────── */}
      {view === "map" && isMobile && (
        <button onClick={nearMe} style={{ position: "fixed", bottom: selectedPark ? 240 : 20, right: 16, zIndex: 24, width: 44, height: 44, borderRadius: "50%", background: "var(--background)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.2)", transition: "bottom 0.3s" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
        </button>
      )}

      {/* ── Gallery view ─────────────────────────────────────────────────── */}
      {view === "gallery" && (
        <>
          {/* Desktop: 12-col grid */}
          {!isMobile && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: 1,
              background: "var(--border)",
              padding: 0,
            }}>
              {filteredParks.map((park, idx) => (
                <GalleryCard key={park.id} park={park} colSpan={getColSpan(idx)} idx={idx} />
              ))}
              {filteredParks.length === 0 && (
                <div style={{ gridColumn: "span 12", padding: "80px 24px", textAlign: "center", color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", background: "var(--background)" }}>
                  No parks match your filters
                </div>
              )}
            </div>
          )}

          {/* Mobile: single column */}
          {isMobile && (
            <div>
              {filteredParks.map((park, idx) => (
                <MobileCard key={park.id} park={park} idx={idx} />
              ))}
              {filteredParks.length === 0 && (
                <div style={{ padding: "80px 24px", textAlign: "center", color: "var(--muted)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  No parks match your filters
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
