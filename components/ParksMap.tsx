"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { useTheme } from "./ThemeProvider";

const PARKS = [
  { id:"1",  slug:"crystal-palace", name:"Crystal Palace Skatepark", postcode:"SE19", location:"South London", borough:"Bromley",  lat:51.4156, lng:-0.0719, type:"Bowl",    is_covered:false, is_free:true, opened:"March 2018", builder:"Canvas Skateparks", heroImage:"/images/parks/crystal-palace/gallery-01.webp", brief:"A 100m curved concrete band with a world-class cloverleaf pool — the first tile-and-coping pool built in London in 40 years.", facts:["Cloverleaf pool — 8.5ft deep","L-shaped bowl — 5.5ft to 7ft","Mellow street section","1,100 sq m total area","Free / daylight hours only","Opened March 2018"], scout:"The pool is the headline feature — genuinely world-class and unlike anything else in London. The mellow entry section makes it accessible for beginners. Historic site that carries real weight for UK skateboarding." },
  { id:"2",  slug:"stockwell",      name:"Stockwell Skatepark",      postcode:"SW9",  location:"South London", borough:"Lambeth",  lat:51.4671, lng:-0.1157, type:"Bowl",    is_covered:false, is_free:true, opened:"1978",       builder:"Lorne Edwards",    heroImage:"/images/parks/stockwell/gallery-01.webp",        brief:"One of the oldest surviving skateparks in the UK. A flowing snake run and organic concrete landscape, recently restored to its iconic red surface.", facts:["Built 1978 — Lorne Edwards","Long snake run — the defining feature","Open 24/7 — unsupervised","Restored red surface 2023/24","Free entry","Behind Brixton Academy"], scout:"Pilgrimage-worthy. Not about tricks — it's about speed, flow and lines. You could spend an entire day here. Go on a Sunday afternoon for the full Stockwell experience." },
  { id:"3",  slug:"southbank",      name:"Southbank Undercroft",     postcode:"SE1",  location:"South London", borough:"Southwark", lat:51.5064, lng:-0.1153, type:"Historic", is_covered:true, is_free:true, opened:"1973",       builder:"Community",        heroImage:"/images/parks/southbank/gallery-01.webp",        brief:"The most culturally significant skate spot on earth. Fifty-plus years under Waterloo Bridge — graffiti, grinds, and the heartbeat of UK skate culture.", facts:["Est. ~1973","Saved from redevelopment 2014","Covered — rideable in all weather","Free, 24/7","Waterloo / Embankment tube","Heart of UK skate culture"], scout:"Non-negotiable. Even if you don't skate a single thing, standing here and watching for an hour tells you everything about what skateboarding means." },
];

const REGIONS = ["All","London"];
const TYPE_FILTERS = ["All","Bowl","Historic","Free","Covered"];

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

const GRADIENTS = [
  "linear-gradient(160deg,#1a1a1a 0%,#2d1f1a 60%,#3d2415 100%)",
  "linear-gradient(160deg,#1a1a1a 0%,#1a1a2e 60%,#0f2040 100%)",
  "linear-gradient(160deg,#1a1a1a 0%,#1f2d1a 60%,#243d15 100%)",
  "linear-gradient(160deg,#1a1a1a 0%,#2a1a1a 60%,#3d1010 100%)",
  "linear-gradient(160deg,#1a1a1a 0%,#1a2a2a 60%,#103535 100%)",
  "linear-gradient(160deg,#1a1a1a 0%,#2a1a2a 60%,#3a0a3a 100%)",
  "linear-gradient(160deg,#1a1a1a 0%,#2a2010 60%,#4a3010 100%)",
  "linear-gradient(160deg,#1a1a1a 0%,#101a2a 60%,#051525 100%)",
  "linear-gradient(160deg,#1a1a1a 0%,#1a2a1a 60%,#153015 100%)",
  "linear-gradient(160deg,#1a1a1a 0%,#2e1a10 60%,#3d2000 100%)",
];

type Park = typeof PARKS[0];
type CardState = "hidden" | "peek";

const PEEK_H = 196;

export default function ParksMap() {
  const router = useRouter();

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
  const [copied, setCopied] = useState(false);

  const { theme } = useTheme();

  const [activeFilter, setActiveFilter] = useState("All");
  const [typeFilter,   setTypeFilter]   = useState("All");
  const [search,       setSearch]       = useState("");
  const [isMobile,     setIsMobile]     = useState(true);
  const [mapStatus,    setMapStatus]    = useState<"loading"|"ready"|"error">("loading");
  const [mapError,     setMapError]     = useState("");
  const [selectedPark, setSelectedPark] = useState<Park|null>(null);
  const [carouselIdx,  setCarouselIdx]  = useState(0);
  const [cardState,    setCardState]    = useState<CardState>("hidden");
  const [savedIds,     setSavedIds]     = useState<string[]>([]);
  const [slideDir,     setSlideDir]     = useState<"left"|"right"|null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("fbs-saved") || "[]");
    setSavedIds(saved);
  }, []);

  // ── Leaflet ──
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
        L.control.zoom({ position:"bottomright" }).addTo(map);
        PARKS.forEach(park => {
          const dot = L.divIcon({ className:"", html:`<div style="width:12px;height:12px;background:#888;border-radius:50%;border:2px solid rgba(136,136,136,0.3);transition:background .2s,transform .15s;"></div>`, iconSize:[12,12], iconAnchor:[6,6] });
          markerRefs.current[park.id] = L.marker([park.lat,park.lng],{ icon:dot }).addTo(map).on("click",()=>openPark(park));
        });
        mapRef.current = map;
        setMapStatus("ready");
      } catch(err) { setMapStatus("error"); setMapError(String(err)); }
    }).catch(err => { if (!cancelled) { setMapStatus("error"); setMapError(String(err)); } });
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mapRef.current) setTimeout(() => mapRef.current?.invalidateSize(), 50);
  }, [isMobile]);

  // On load: pick a random London park, zoom to it and select it
  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current) return;
    const londonParks = PARKS.filter(p => p.location.includes("London"));
    const park = londonParks[Math.floor(Math.random() * londonParks.length)];
    mapRef.current.setView([park.lat, park.lng], 14, { animate: false });
    openPark(park);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStatus]);

  useEffect(() => {
    if (!tileLayerRef.current) return;
    tileLayerRef.current.setUrl(theme === "light"
      ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png");
  }, [theme]);

  const panTo = useCallback((park: Park) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (isMobile) {
      map.panTo([park.lat, park.lng], { animate:true, duration:0.4 });
    } else {
      const pt = map.latLngToContainerPoint([park.lat, park.lng]);
      map.panTo(map.containerPointToLatLng(pt.add([-140, PEEK_H / 2])), { animate:true, duration:0.4 });
    }
  }, [isMobile]);

  useEffect(() => {
    if (!mapRef.current || !userChangedFilter.current) return;
    const bounds = REGION_BOUNDS[activeFilter];
    if (!bounds) return;
    const pad = cardState !== "hidden" ? PEEK_H + 16 : 24;
    mapRef.current.fitBounds(bounds, { animate:true, duration:0.6, paddingTopLeft:[24,24], paddingBottomRight:[24, pad] });
  }, [activeFilter, cardState]);

  const filteredParks = PARKS.filter(p => {
    const mF = activeFilter === "All" || p.location.includes(activeFilter) || p.borough.includes(activeFilter);
    const mT = typeFilter === "All"
      || p.type === typeFilter
      || (typeFilter === "Free"    && p.is_free)
      || (typeFilter === "Covered" && p.is_covered);
    const mS = p.name.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase());
    return mF && mT && mS;
  });

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

  const toggleSave = useCallback((park: Park) => {
    setSavedIds(prev => {
      const next = prev.includes(park.id) ? prev.filter(id => id !== park.id) : [...prev, park.id];
      localStorage.setItem("fbs-saved", JSON.stringify(next));
      return next;
    });
  }, []);

  const sharePark = useCallback(async (park: Park) => {
    const url = `${window.location.origin}/parks/${park.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: park.name, text: park.brief, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const nearMe = useCallback(() => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      pos => mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 12, { animate: true, duration: 1 }),
      () => {}
    );
  }, []);

  // ── Touch: swipe down = dismiss, left/right = navigate between parks ──
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

  const gradIdx = (park: Park) => PARKS.findIndex(p => p.id === park.id) % GRADIENTS.length;
  const isSaved = selectedPark ? savedIds.includes(selectedPark.id) : false;

  const S = {
    pill: (active: boolean): React.CSSProperties => ({
      padding:"6px 14px", fontSize:11, fontWeight:"bold",
      textTransform:"uppercase", letterSpacing:"0.1em", cursor:"pointer",
      background: active ? "var(--accent)" : theme === "dark" ? "rgba(26,26,26,0.92)" : "rgba(70,67,62,0.88)",
      color: active ? "#fff" : theme === "dark" ? "var(--foreground)" : "#f0f0eb",
      border:`1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      flexShrink:0, WebkitAppearance:"none", borderRadius:0,
      backdropFilter:"blur(8px)",
    }),
    desktopFilterBtn: (active: boolean): React.CSSProperties => ({
      padding:"4px 10px", fontSize:10, fontWeight:"bold",
      textTransform:"uppercase", letterSpacing:"0.1em", cursor:"pointer",
      background: active ? "var(--accent)" : "var(--card)",
      color: active ? "#fff" : "var(--foreground)",
      border:"1px solid var(--border)", flexShrink:0,
    }),
  };

  return (
    <div data-parks-page>
      <style>{`
        @keyframes fbs-spin      { to { transform:rotate(360deg); } }
        @keyframes fbs-fade-up   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fbs-card-in   { from { transform:translateY(${PEEK_H + 20}px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes fbs-slide-l   { from { opacity:0; transform:translateX(28px);  } to { opacity:1; transform:translateX(0); } }
        @keyframes fbs-slide-r   { from { opacity:0; transform:translateX(-28px); } to { opacity:1; transform:translateX(0); } }
        .leaflet-container { background:var(--background) !important; }
        .leaflet-control-attribution { font-size:9px !important; background:rgba(0,0,0,0.4) !important; color:#888 !important; }
        .leaflet-control-attribution a { color:#aaa !important; }
        ::-webkit-scrollbar { display:none; }
        .fbs-card { transition: transform 0.3s cubic-bezier(0.32,0.72,0,1); }
      `}</style>

      {/* ══ MOBILE ══ */}
      {isMobile && (
        <div style={{ position:"relative", height:"calc(100dvh - 48px)" }}>

          {/* Full-height map */}
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

          {/* Floating search */}
          <div style={{ position:"absolute",top:12,left:12,right:12,zIndex:20 }}>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"var(--muted)",pointerEvents:"none" }}>⌕</span>
              <input
                type="text" placeholder="Search parks or areas…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width:"100%",padding:"11px 14px 11px 36px",fontSize:15,background: theme === "dark" ? "rgba(26,26,26,0.92)" : "rgba(244,242,238,0.96)",border:"1px solid var(--border)",color:"var(--foreground)",outline:"none",boxSizing:"border-box",backdropFilter:"blur(12px)",WebkitAppearance:"none" }}
              />
            </div>
          </div>

          {/* Type filters + Near Me */}
          <div style={{ position:"absolute",top:60,left:0,right:0,zIndex:20,display:"flex",gap:0,overflowX:"auto",padding:"0 12px",scrollbarWidth:"none" }}>
            {TYPE_FILTERS.map(f => (
              <button key={f} onClick={() => setTypeFilter(f)} style={S.pill(typeFilter === f)}>{f}</button>
            ))}
            <button onClick={nearMe} style={{ ...S.pill(false), marginLeft:8, display:"flex", alignItems:"center", gap:5 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
              Near me
            </button>
          </div>

          {/* ── Floating park card ── */}
          {selectedPark && (
            <div
              ref={cardRef}
              className="fbs-card"
              onClick={() => selectedPark && router.push(`/parks/${selectedPark.slug}`)}
              onTouchStart={onCardTouchStart}
              onTouchMove={onCardTouchMove}
              onTouchEnd={onCardTouchEnd}
              style={{
                position:"absolute", bottom:20, left:16, right:16, zIndex:25,
                background: theme === "dark" ? "rgba(22,22,22,0.97)" : "rgba(248,246,242,0.97)",
                backdropFilter:"blur(16px)",
                borderRadius:12,
                padding:"16px 18px 18px",
                boxShadow:"0 8px 32px rgba(0,0,0,0.28)",
                cursor:"pointer", userSelect:"none",
                animation: slideDir ? `fbs-slide-${slideDir === "left" ? "l" : "r"} 0.22s ease both` : "fbs-card-in 0.28s cubic-bezier(0.32,0.72,0,1) both",
              }}
            >
              {/* Swipe handle */}
              <div style={{ width:32,height:3,background:"var(--border)",borderRadius:2,margin:"0 auto 14px" }} />

              {/* Badges row */}
              <div style={{ display:"flex", gap:6, marginBottom:12 }}>
                <span style={{ fontSize:10,fontWeight:"bold",textTransform:"uppercase",letterSpacing:"0.1em",padding:"3px 10px",border:"1px solid var(--border)",color:"var(--muted)" }}>{selectedPark.type}</span>
                {selectedPark.is_free
                  ? <span style={{ fontSize:10,fontWeight:"bold",textTransform:"uppercase",letterSpacing:"0.1em",padding:"3px 10px",border:"1px solid var(--accent)",color:"var(--accent)" }}>Free</span>
                  : <span style={{ fontSize:10,fontWeight:"bold",textTransform:"uppercase",letterSpacing:"0.1em",padding:"3px 10px",border:"1px solid var(--border)",color:"var(--muted)" }}>Paid</span>
                }
                {selectedPark.is_covered && <span style={{ fontSize:10,fontWeight:"bold",textTransform:"uppercase",letterSpacing:"0.1em",padding:"3px 10px",border:"1px solid var(--accent)",color:"var(--accent)" }}>Covered</span>}
              </div>

              {/* Location + Name */}
              <p style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.18em",color:"var(--muted)",marginBottom:4 }}>{selectedPark.location}</p>
              <h3 style={{ fontSize:20,fontWeight:900,letterSpacing:"-0.02em",lineHeight:1.05,color:"var(--foreground)",marginBottom:10,textTransform:"uppercase" }}>{selectedPark.name}</h3>

              {/* Description */}
              <p style={{ fontSize:13,lineHeight:1.65,color:"var(--muted)" }}>{selectedPark.brief}</p>
            </div>
          )}

        </div>
      )}

      {/* ══ DESKTOP ══ */}
      {!isMobile && (
        <div style={{ position:"relative", height:"calc(100dvh - 48px)" }}>
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

          <>
          {/* Sidebar */}
          <div style={{ position:"absolute",top:0,left:0,bottom:0,width:320,background:"var(--background)",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",zIndex:10 }}>
            {/* Search */}
            <div style={{ padding:16,borderBottom:"1px solid var(--border)",flexShrink:0 }}>
              <p style={{ fontFamily:"var(--font-mono)",fontSize:9,textTransform:"uppercase",letterSpacing:"0.15em",color:"var(--muted)",marginBottom:10 }}>Skateparks</p>
              <input type="text" placeholder="Search parks or areas…" value={search} onChange={e=>setSearch(e.target.value)}
                style={{ width:"100%",background:"var(--card)",border:"1px solid var(--border)",color:"var(--foreground)",fontFamily:"var(--font-mono)",fontSize:12,padding:"9px 12px",outline:"none",boxSizing:"border-box",letterSpacing:"0.04em" }} />
            </div>
            {/* Filters */}
            <div style={{ padding:"10px 16px",borderBottom:"1px solid var(--border)",display:"flex",gap:6,flexWrap:"wrap",flexShrink:0 }}>
              {TYPE_FILTERS.filter(f=>f!=="All").map(f=>(
                <button key={f} onClick={()=>setTypeFilter(typeFilter===f?"All":f)}
                  style={{ fontFamily:"var(--font-mono)",fontSize:9,padding:"4px 10px",border:`1px solid ${typeFilter===f?"var(--accent)":"var(--border)"}`,color:typeFilter===f?"var(--accent)":"var(--muted)",background:typeFilter===f?"color-mix(in srgb,var(--accent) 8%,transparent)":"none",cursor:"pointer",letterSpacing:"0.1em",textTransform:"uppercase" as const }}>
                  {f}
                </button>
              ))}
            </div>
            {/* Park list */}
            <div style={{ overflowY:"auto",flex:1 }}>
              {filteredParks.map(park=>{
                const sel = selectedPark?.id===park.id;
                const tags = [park.type, park.is_free?"Free":null, park.is_covered?"Covered":null].filter(Boolean) as string[];
                const postcodeLetters = park.postcode.replace(/[0-9]/g,"");
                return (
                  <button key={park.id} onClick={()=>openPark(park)}
                    style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"14px 16px",borderBottom:"1px solid var(--border)",background:sel?"var(--card)":"none",cursor:"pointer",textAlign:"left",border:"none",borderBottom:"1px solid var(--border)" }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ fontSize:13,fontWeight:600,color:sel?"var(--accent)":"var(--foreground)",letterSpacing:"0.01em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{park.name}</p>
                      <p style={{ fontFamily:"var(--font-mono)",fontSize:9,color:"var(--muted)",letterSpacing:"0.08em",textTransform:"uppercase",marginTop:3 }}>{park.postcode} · {park.location}</p>
                      <div style={{ display:"flex",gap:4,marginTop:6 }}>
                        {tags.map(t=><span key={t} style={{ fontFamily:"var(--font-mono)",fontSize:8,padding:"2px 6px",border:"1px solid var(--border)",color:"var(--muted)",letterSpacing:"0.08em",textTransform:"uppercase" as const }}>{t}</span>)}
                      </div>
                    </div>
                    <div style={{ width:36,height:36,borderRadius:"50%",background:sel?"var(--accent)":"var(--card)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background 0.2s" }}>
                      <span style={{ fontFamily:"var(--font-heading)",fontSize:10,fontWeight:300,color:sel?"#fff":"var(--muted)",letterSpacing:"0.03em" }}>{postcodeLetters}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop preview bar */}
          {selectedPark && (
            <div style={{ position:"absolute",bottom:0,left:320,right:0,height:PEEK_H,background:"var(--background)",borderTop:"1px solid var(--border)",zIndex:11,display:"flex",alignItems:"stretch",animation:"fbs-card-in 0.28s cubic-bezier(0.32,0.72,0,1) both" }}>
              {/* Park photo */}
              {selectedPark.heroImage && (
                <div style={{ width:220,flexShrink:0,overflow:"hidden",position:"relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedPark.heroImage} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",filter:"grayscale(1) contrast(1.05)" }} />
                </div>
              )}
              {/* Info panel */}
              <div style={{ flex:1,padding:"20px 24px",display:"flex",flexDirection:"column",justifyContent:"space-between",borderLeft:"1px solid var(--border)",overflow:"hidden",minWidth:0 }}>
                <div>
                  {/* Postcode row */}
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                    <div style={{ width:32,height:32,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <span style={{ fontFamily:"var(--font-heading)",fontSize:10,fontWeight:300,color:"#fff",letterSpacing:"0.03em" }}>{selectedPark.postcode.replace(/[0-9]/g,"")}</span>
                    </div>
                    <p style={{ fontFamily:"var(--font-mono)",fontSize:9,color:"var(--muted)",letterSpacing:"0.1em",textTransform:"uppercase" }}>{selectedPark.postcode} · {selectedPark.location}</p>
                    <div style={{ display:"flex",gap:4,marginLeft:4 }}>
                      {[selectedPark.type, selectedPark.is_free?"Free":null, selectedPark.is_covered?"Covered":null].filter(Boolean).map(t=>(
                        <span key={t as string} style={{ fontFamily:"var(--font-mono)",fontSize:8,padding:"2px 7px",border:"1px solid var(--border)",color:"var(--muted)",letterSpacing:"0.08em",textTransform:"uppercase" as const }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  {/* Name */}
                  <h3 style={{ fontFamily:"var(--font-heading)",fontSize:"clamp(18px,2vw,26px)",fontWeight:300,letterSpacing:"-0.02em",textTransform:"uppercase",lineHeight:1,marginBottom:8 }}>{selectedPark.name}</h3>
                  {/* Brief */}
                  <p style={{ fontSize:13,lineHeight:1.6,color:"var(--muted)",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" } as React.CSSProperties}>{selectedPark.brief}</p>
                </div>
              </div>
              {/* Actions panel */}
              <div style={{ flexShrink:0,padding:"16px 20px",display:"flex",flexDirection:"column",justifyContent:"space-between",gap:8,borderLeft:"1px solid var(--border)" }}>
                <div style={{ display:"flex",gap:6 }}>
                  <button onClick={() => toggleSave(selectedPark)} title={isSaved?"Saved":"Save"} style={{ width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",background:"var(--card)",border:"1px solid var(--border)",cursor:"pointer",color:isSaved?"var(--accent)":"var(--muted)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved?"currentColor":"none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button onClick={() => sharePark(selectedPark)} title="Share" style={{ width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",background:"var(--card)",border:"1px solid var(--border)",cursor:"pointer",color:copied?"var(--accent)":"var(--muted)" }}>
                    {copied
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    }
                  </button>
                  <button onClick={dismiss} title="Close" style={{ width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",background:"var(--card)",border:"1px solid var(--border)",cursor:"pointer",color:"var(--muted)",fontSize:14 }}>✕</button>
                </div>
                <button onClick={() => router.push(`/parks/${selectedPark.slug}`)}
                  style={{ padding:"11px 20px",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.12em",background:"var(--accent)",color:"#fff",border:"none",cursor:"pointer",fontFamily:"var(--font-body)",whiteSpace:"nowrap" }}>
                  View Park →
                </button>
              </div>
            </div>
          )}
          </>
        </div>
      )}
    </div>
  );
}
