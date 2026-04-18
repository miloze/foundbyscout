"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { useTheme } from "./ThemeProvider";

const PARKS = [
  { id:"1",  slug:"crystal-palace",   name:"Crystal Palace Skatepark",  location:"South London",      borough:"Bromley",        lat:51.4156, lng:-0.0719, type:"Bowl",    is_covered:false, is_free:true,  opened:"March 2018",  builder:"Canvas Skateparks",          brief:"A 100m curved concrete band with a world-class cloverleaf pool — the first tile-and-coping pool built in London in 40 years.", description:"A landmark south London park on the site of the UK's first national skateboarding competition in 1977. Designed by Canvas Skateparks in collaboration with Kinnear Landscape Architects and local riders, the park is arranged in three distinct zones catering to every skill level. The cloverleaf pool at one end is genuinely world-class — unlike anything else in London.", facts:["Cloverleaf pool — 8.5ft deep","L-shaped bowl — 5.5ft to 7ft","Mellow street section","1,100 sq m total area","Free / daylight hours only","Opened March 2018"], scout:"The pool is the headline feature — genuinely world-class and unlike anything else in London. The mellow entry section makes it accessible for beginners. Historic site that carries real weight for UK skateboarding." },
  { id:"2",  slug:"stockwell",         name:"Stockwell Skatepark",        location:"South London",      borough:"Lambeth",        lat:51.4671, lng:-0.1157, type:"Bowl",    is_covered:false, is_free:true,  opened:"1978",        builder:"Lorne Edwards",              brief:"One of the oldest surviving skateparks in the UK. A flowing snake run and organic concrete landscape, recently restored to its iconic red surface.", description:"Arguably the most culturally significant skatepark in London. Built in 1978 by Lorne Edwards — who also built the UK's first skatepark in Portland, Dorset — Stockwell is an organic, free-flowing concrete landscape unlike any standardised modern park. Renovated by Betongpark in 2023/24, restoring its iconic red surface.", facts:["Built 1978 — Lorne Edwards","Long snake run — the defining feature","Open 24/7 — unsupervised","Restored red surface 2023/24","Free entry","Behind Brixton Academy"], scout:"Pilgrimage-worthy. Not about tricks — it's about speed, flow and lines. You could spend an entire day here. Go on a Sunday afternoon for the full Stockwell experience." },
  { id:"3",  slug:"cantelowes",        name:"Cantelowes Skatepark",       location:"North London",      borough:"Camden",         lat:51.5493, lng:-0.1127, type:"Bowl",    is_covered:false, is_free:true,  opened:"2007",        builder:"Wheelscape",                brief:"North London's premier outdoor concrete park. The three-section clover bowl — reaching 8ft with a 9ft over-vert inversion — is one of the best in London.", description:"North London's premier outdoor concrete park, tucked into Cantelowes Gardens in Camden. A community-driven 2007 rebuild designed by local skaters and professionals who volunteered under the banner of the 'Cantelocals.' Built by Wheelscape with Sport England funding.", facts:["Clover bowl — 5ft / 6.5ft / 8ft","9ft over-vert cradle / inversion","Street course wrapping the bowl","Open 11am–9pm daily","Free entry","Camden Town 5 min walk"], scout:"The bowl is one of the best in London — technically challenging with enough variety to keep any level busy. The 9ft inversion is gnarly. Friendly, community atmosphere." },
  { id:"4",  slug:"hackney-bumps",     name:"Hackney Bumps",              location:"East London",       borough:"Hackney",        lat:51.5488, lng:-0.0399, type:"Historic",is_covered:false, is_free:true,  opened:"1986",        builder:"GLC / Community",           brief:"A flowing sea of concrete moguls, some 2m tall, built for BMX in 1986 and resurrected by the community from 2019. Unlike anywhere else in London.", description:"An east London concrete anomaly — built in 1986 for BMX riders, left dormant for decades, then resurrected through a remarkable grassroots community effort from 2019. Community-built additions include quarter pipes, a flatbank hip to wallride, a ledge and a flat rail.", facts:["Mogul field — up to 2m tall","Built 1986, restored 2019–","Community-built additions","Vans Checkerboard Fund backed","Open 24/7 — outdoor, ungated","Free entry"], scout:"Unlike anywhere else in London. The bumps demand you skate differently — no lines are given to you, you have to find them. An incredible community spirit." },
  { id:"5",  slug:"long-grove",        name:"Long Grove Skatepark",       location:"Epsom, Surrey",     borough:"Epsom & Ewell",  lat:51.3546, lng:-0.2653, type:"Mixed",   is_covered:false, is_free:true,  opened:"2013",        builder:"Wheelscape",                brief:"A well-built Wheelscape park south of London — smooth concrete, a solid bowl, and rarely rammed. Worth the journey.", description:"A clean combination of street and transition elements in a green park setting on the edge of Epsom. Designed and built by Wheelscape in 2013, the bowl is the main draw — smooth, large, and varied.", facts:["Two-section bowl","Super smooth Wheelscape concrete","Street run: ledge, rail, banks","Built 2013","Free entry","Epsom station — 20 min from London"], scout:"Worth the journey out of London. Smooth concrete, well-designed, and rarely rammed. The bowl hits above its weight for a suburban park." },
  { id:"6",  slug:"meanwhile-gardens", name:"Meanwhile Gardens",          location:"West London",       borough:"Westminster",    lat:51.5208, lng:-0.2041, type:"Bowl",    is_covered:false, is_free:true,  opened:"1970s",       builder:"Community",                 brief:"A community-built gem alongside the Grand Union Canal. Raw concrete, great locals, real west London skate culture.", description:"A community-built gem tucked alongside the Grand Union Canal. Raw concrete, great locals, and a real west London skate culture that's been here for decades.", facts:["Community-built","Canal-side location","Street + bowl mix","Free forever"], scout:"A proper neighbourhood park. The kind of place you return to every week without thinking about it." },
  { id:"7",  slug:"kelvingrove",       name:"Kelvingrove Skatepark",      location:"Glasgow",           borough:"Glasgow City",   lat:55.8677, lng:-4.2913, type:"Mixed",   is_covered:false, is_free:true,  opened:"2021",        builder:"Maverick",                  brief:"Right next to the museum. Smooth concrete, strong local scene — Glasgow's most central and most-sessioned spot.", description:"Right next to Kelvingrove Art Gallery and Museum. Smooth concrete, strong local scene, always busy on a dry day. Glasgow's most central spot and arguably the heart of the city's skate scene.", facts:["City centre location","Kelvingrove Museum adjacent","Strong local scene","Free entry"], scout:"Always busy, always worth a visit. The surroundings make it — skating in front of one of Scotland's great buildings never gets old." },
  { id:"8",  slug:"ponds-forge",       name:"Sheffield Ponds Forge",      location:"Sheffield",         borough:"Sheffield",      lat:53.3791, lng:-1.4617, type:"Indoor",  is_covered:true,  is_free:false, opened:"2008",        builder:"Unknown",                   brief:"Competition-grade indoor park in the heart of Sheffield. Hosts major UK contests. One of the best facilities in the north.", description:"Competition-grade indoor park in the heart of Sheffield. Hosts major UK contests and one of the best facilities in the north — world-class obstacles in a city-centre location.", facts:["Competition grade","Major UK contest venue","City centre Sheffield","Pay per session"], scout:"If you're in Sheffield, this is non-negotiable. The quality of the facility is hard to match outside of London." },
  { id:"9",  slug:"the-house",         name:"The House Skatepark",        location:"Bristol",           borough:"Bristol",        lat:51.4558, lng:-2.5960, type:"Indoor",  is_covered:true,  is_free:false, opened:"2009",        builder:"Unknown",                   brief:"Bristol's legendary indoor park. Massive space, great street section, the kind of local energy that makes sessions feel special.", description:"Bristol's legendary indoor park. Massive space, great street section, and the kind of local energy that makes sessions feel special every single time. A genuine institution.", facts:["Massive indoor space","Street + transition","Bristol institution","Pay per session"], scout:"Bristol has one of the strongest skate scenes in the UK and The House is its hub. Sessions here have a different energy." },
  { id:"10", slug:"livingston",        name:"Livingston Skatepark",       location:"Livingston, Scotland", borough:"West Lothian", lat:55.8841, lng:-3.5163, type:"Historic",is_covered:false, is_free:true,  opened:"1981",        builder:"Livingston Dev Corp",       brief:"Built in 1981 and never touched. Original concrete immortalised in countless clips and contests across four decades.", description:"Built in 1981 and never touched. Livingston is a pilgrimage — raw, original concrete that's been immortalised in countless clips and contests across four decades of UK skateboarding.", facts:["Built 1981 — original concrete","Skate pilgrimage site","4 decades of contest history","Free entry"], scout:"You feel the history the moment you drop in. Every serious UK skater has a Livingston story." },
  { id:"11", slug:"southbank",         name:"Southbank Undercroft",       location:"South London",      borough:"Southwark",      lat:51.5064, lng:-0.1153, type:"Historic",is_covered:true,  is_free:true,  opened:"1973",        builder:"Community",                 brief:"The most culturally significant skate spot on earth. Fifty-plus years under Waterloo Bridge — graffiti, grinds, and the heartbeat of UK skate culture.", description:"The undercroft beneath the Southbank Centre has been a skate spot since the early 1970s. Fought off redevelopment in 2014 with a huge community campaign, it remains the spiritual home of British street skating. Rough concrete, low ceilings, always busy.", facts:["Est. ~1973","Saved from redevelopment 2014","Covered — rideable in all weather","Free, 24/7","Waterloo / Embankment tube","Heart of UK skate culture"], scout:"Non-negotiable. Even if you don't skate a single thing, standing here and watching for an hour tells you everything about what skateboarding means." },
  { id:"12", slug:"rom-skatepark",     name:"Rom Skatepark",              location:"East London",       borough:"Havering",       lat:51.5614, lng: 0.1710, type:"Historic",is_covered:false, is_free:true,  opened:"1978",        builder:"GLC",                       brief:"Built in 1978 from waste rubble — one of the oldest skateparks in the world, and it still rips. Snake run, pools, banks. A true pilgrimage.", description:"Arguably Europe's oldest surviving concrete skatepark — built by the Greater London Council in 1978 on reclaimed rubble alongside the River Rom. Listed as an Asset of Community Value in 2014, it's been in constant use for nearly 50 years. Everything here is original.", facts:["Built 1978 — GLC","Original waste rubble construction","Snake run + kidney bowls","Listed community asset 2014","Free / daylight hours","Romford station 15 min walk"], scout:"Everything at Rom is original 1978 concrete. The snake run is one of the great natural flows in UK skateboarding. Come in the morning before it fills up." },
  { id:"13", slug:"bay-66",            name:"Bay 66 Skatepark",           location:"West London",       borough:"Hammersmith & Fulham", lat:51.5121, lng:-0.2195, type:"Mixed", is_covered:true,  is_free:false, opened:"1998",        builder:"Unknown",                   brief:"West London's legendary indoor park. A maze of street obstacles, mini ramps and a big bowl — Bay 66 has been a fixture of the London scene since the late nineties.", description:"West London's longest-running indoor park, tucked under the Westway near Latimer Road. A proper skater-run space with a big bowl, street section, and mini ramps. Rough around the edges in the best possible way.", facts:["Indoor — all weather","Bowl + street + mini ramp","Pay per session","Latimer Rd tube 5 min","Skater-run since 1998","Drop-in sessions daily"], scout:"Gritty, real, and full of good skaters. Bay 66 has soul that no brand-new park can replicate. The bowl sessions on a weekend are legendary." },
  { id:"14", slug:"alexandra-palace",  name:"Alexandra Palace Skatepark", location:"North London",      borough:"Haringey",       lat:51.5952, lng:-0.1288, type:"Mixed",   is_covered:false, is_free:true,  opened:"2015",        builder:"Maverick",                  brief:"High on the hill above north London with a jaw-dropping view. A solid Maverick concrete park with bowl, street course, and a location unlike any other.", description:"Perched on the hill at Alexandra Palace, this Maverick-designed park offers panoramic views across London alongside a well-built concrete park. A bowl, clam shell and a street course make it one of north London's most complete outdoor spots.", facts:["Panoramic London views","Concrete bowl + street","Built by Maverick","Free entry","Wood Green tube 20 min walk","Nearby the famous palace"], scout:"The setting makes it special — skating with the whole of north London laid out in front of you. The park itself is solid; the location is unforgettable." },
  { id:"15", slug:"harrow-skatepark",  name:"Harrow Skatepark",           location:"North London",      borough:"Harrow",         lat:51.5793, lng:-0.3355, type:"Mixed",   is_covered:false, is_free:true,  opened:"2010",        builder:"Maverick",                  brief:"A generous concrete park in northwest London — wide open spaces, a deep bowl and a big street section. One of the best council-built parks in outer London.", description:"A well-built outdoor park in the northwestern reaches of London. The bowl is deep and flows well; the street section is large enough to never feel crowded. A good local spot that punches above its weight for a suburban park.", facts:["Deep bowl","Large street section","Free entry","Harrow-on-the-Hill tube","Open daily / daylight hours","Rarely overcrowded"], scout:"Worth making the journey to the end of the Metropolitan Line. More space, better concrete, fewer crowds than you'd expect." },
  { id:"16", slug:"kennington",        name:"Kennington Skatepark",       location:"South London",      borough:"Lambeth",        lat:51.4882, lng:-0.1073, type:"Mixed",   is_covered:false, is_free:true,  opened:"2017",        builder:"Wheelscape",                brief:"A sleek modern Wheelscape park in the shadow of the Oval. Smooth concrete, a tight bowl and a street plaza — a reliable south London session.", description:"A modern Wheelscape-designed park right next to the Oval cricket ground. Clean lines, smooth concrete and a compact design make it an efficient session spot — everything within easy reach of everything else.", facts:["Built by Wheelscape","Bowl + street plaza","Smooth concrete","Free entry","Oval tube 3 min","Open daylight hours"], scout:"A tight, efficient park. Nothing is wasted — every section leads naturally to the next. Good for warming up, great for after-work sessions." },
  { id:"17", slug:"clapham-skatepark", name:"Clapham Skatepark",          location:"South London",      borough:"Lambeth",        lat:51.4600, lng:-0.1382, type:"Mixed",   is_covered:false, is_free:true,  opened:"2012",        builder:"Wheelscape",                brief:"A solid south London park hidden beneath Clapham's railway arches — flat bars, ledges, a bank section and a small bowl.", description:"Tucked beneath the railway arches in Clapham, this Wheelscape park is a reliable south London session spot. A mix of street and transition, sheltered enough to skate when it's lightly raining.", facts:["Semi-sheltered arches","Street + transition mix","Free entry","Clapham North 5 min","Built by Wheelscape","Good beginner park"], scout:"The arches give it character. Not the flashiest park in London but it serves its community well — always something going on here." },
  { id:"18", slug:"somerford-grove",   name:"Somerford Grove Skatepark",  location:"North London",      borough:"Haringey",       lat:51.5843, lng:-0.0730, type:"Mixed",   is_covered:false, is_free:true,  opened:"2014",        builder:"Wheelscape",                brief:"A large open concrete park in Tottenham — big street section, a bowl and a wall of roll-ins. One of north London's most underrated spots.", description:"A sprawling outdoor park in Tottenham, designed and built by Wheelscape. The street section is one of the biggest in north London — ledges, banks, rails and a substantial bowl.", facts:["Large street section","Wheelscape concrete","Free entry","Bruce Grove station nearby","Bowl + banks + rails","Often uncrowded"], scout:"North London's hidden gem. The street section is huge — more room than Cantelowes, better concrete than Hackney Bumps. Criminally underrated." },
  { id:"19", slug:"scate-barking",     name:"Scate Skatepark",            location:"East London",       borough:"Barking & Dagenham", lat:51.5358, lng: 0.0756, type:"Indoor", is_covered:true,  is_free:false, opened:"2008",        builder:"Unknown",                   brief:"East London's most complete indoor facility — a full-sized bowl, park area and private coaching space. The go-to when it rains.", description:"The go-to indoor facility for east London skaters. Scate offers a full bowl, a large park area and coaching sessions — well-run and well-maintained.", facts:["Full indoor facility","Bowl + park area","Coaching available","Pay per session","Barking station 10 min","All weather"], scout:"The east London indoor answer to Bay 66. If it's raining and you're east of the City, there's no better option." },
  { id:"20", slug:"leyton-skatepark",  name:"Leyton Skatepark",           location:"East London",       borough:"Waltham Forest",  lat:51.5640, lng:-0.0080, type:"Mixed",  is_covered:false, is_free:true,  opened:"2009",        builder:"Maverick",                  brief:"A well-built Maverick park in east London — deep bowl, solid street section and a strong local scene that keeps it lively.", description:"Leyton's concrete park is one of the better-maintained outdoor spots in east London. A deep Maverick bowl sits alongside a decent street course — simple layout, good concrete, active local scene.", facts:["Deep Maverick bowl","Street section","Free entry","Leyton tube 5 min","Good local scene","Regularly maintained"], scout:"Quiet on weekdays, buzzing on weekends. One of those parks where the local scene makes it feel bigger than it is." },
  { id:"21", slug:"peckham-pulse",     name:"Peckham Skatepark",          location:"South London",      borough:"Southwark",       lat:51.4726, lng:-0.0697, type:"Mixed",  is_covered:false, is_free:true,  opened:"2011",        builder:"Wheelscape",                brief:"A popular south London park in the heart of Peckham — street obstacles, a bowl and the energy of one of London's most creative neighbourhoods.", description:"Right in the heart of Peckham, this Wheelscape park benefits from the neighbourhood's energy. A mix of street and transition, it's busy at weekends and has a character all of its own.", facts:["Street + bowl","Wheelscape build","Free entry","Peckham Rye station nearby","Busy weekend sessions","South London institution"], scout:"Peckham's creative energy spills into the park. Sessions here feel alive — the crowd is always interesting." },
];

const REGIONS = ["All","London","South East","South West","Midlands","North West","North East","Scotland","Wales"];
const TYPE_FILTERS = ["All","Bowl","Street","Mixed","Indoor","Historic"];

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
type CardState = "hidden" | "peek" | "expanded";

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
  const touchStart   = useRef({ x:0, y:0 });
  const touchDir     = useRef<"h"|"v"|null>(null);
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
    mapRef.current.setView([park.lat, park.lng], 13, { animate: false });
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
    if (!mapRef.current) return;
    const bounds = REGION_BOUNDS[activeFilter];
    if (!bounds) return;
    const pad = cardState !== "hidden" ? PEEK_H + 16 : 24;
    mapRef.current.fitBounds(bounds, { animate:true, duration:0.6, paddingTopLeft:[24,24], paddingBottomRight:[24, pad] });
  }, [activeFilter, cardState]);

  const filteredParks = PARKS.filter(p => {
    const mF = activeFilter === "All" || p.location.includes(activeFilter) || p.borough.includes(activeFilter);
    const mT = typeFilter === "All" || p.type === typeFilter;
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
    // Swipe down: give physical feedback by translating the card
    if (touchDir.current === "v" && cardRef.current) {
      const delta = e.touches[0].clientY - touchStart.current.y;
      if (delta > 0) cardRef.current.style.transform = `translateY(${delta * 0.55}px)`;
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
    } else if (finalDir === "v" && dy < -40) {
      dismiss();
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
        @keyframes fbs-expand-up { from { transform:translateY(100%); } to { transform:translateY(0); } }
        .leaflet-container { background:var(--background) !important; }
        .leaflet-control-attribution { font-size:9px !important; background:rgba(0,0,0,0.4) !important; color:#888 !important; }
        .leaflet-control-attribution a { color:#aaa !important; }
        ::-webkit-scrollbar { display:none; }
        .fbs-card { transition: transform 0.3s cubic-bezier(0.32,0.72,0,1); }
      `}</style>

      {/* ══ MOBILE ══ */}
      {isMobile && (
        <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 120px)" }}>

          {/* ── Map (top half) ── */}
          <div style={{ flex:"0 0 52%", position:"relative", overflow:"hidden" }}>
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
          </div>

          {/* ── Park panel (bottom half) ── */}
          <div style={{ flex:1, borderTop:"1px solid var(--border)", overflow:"hidden", background:"var(--background)" }}>
            {!selectedPark ? (
              /* Empty state */
              <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, padding:"0 24px" }}>
                <p style={{ fontSize:11,textTransform:"uppercase",letterSpacing:"0.15em",color:"var(--muted)" }}>
                  {filteredParks.length} park{filteredParks.length !== 1 ? "s" : ""}
                </p>
                <p style={{ fontSize:13, color:"var(--muted)", textAlign:"center" }}>Tap a marker to explore</p>
              </div>
            ) : (
              /* Park card — tap to expand */
              <div
                onClick={() => setCardState("expanded")}
                style={{ height:"100%", display:"flex", flexDirection:"column", cursor:"pointer", userSelect:"none" }}
              >
                {/* Gradient header */}
                <div style={{
                  flexShrink:0, flex:"0 0 42%",
                  background:GRADIENTS[gradIdx(selectedPark)],
                  display:"flex", alignItems:"flex-end", justifyContent:"space-between",
                  padding:"0 16px 12px",
                  animation: slideDir ? `fbs-slide-${slideDir === "left" ? "l" : "r"} 0.25s ease both` : undefined,
                }}>
                  <div>
                    <p style={{ fontSize:9,textTransform:"uppercase",letterSpacing:"0.15em",color:"var(--accent)",marginBottom:3 }}>{selectedPark.location}</p>
                    <h3 style={{ fontSize:18,fontWeight:900,letterSpacing:"-0.02em",lineHeight:1.1,color:"#f0f0eb" }}>{selectedPark.name}</h3>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); dismiss(); }}
                    style={{ background:"rgba(0,0,0,0.4)",border:"none",color:"#fff",width:28,height:28,borderRadius:"50%",fontSize:12,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}
                  >✕</button>
                </div>

                {/* Info row */}
                <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px", gap:8, minHeight:0 }}>
                  <div style={{ display:"flex", gap:5, alignItems:"center", flexWrap:"wrap" }}>
                    <span style={{ fontSize:10,padding:"2px 8px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--muted)" }}>{selectedPark.type}</span>
                    {selectedPark.is_free
                      ? <span style={{ fontSize:10,padding:"2px 8px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--accent)" }}>Free</span>
                      : <span style={{ fontSize:10,padding:"2px 8px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--muted)" }}>Paid</span>
                    }
                    {selectedPark.is_covered && <span style={{ fontSize:10,padding:"2px 8px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--accent)" }}>Covered</span>}
                  </div>
                  {/* Carousel nav */}
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                    <button onClick={e => { e.stopPropagation(); navigate(-1); }} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,padding:"0 2px",lineHeight:1 }}>‹</button>
                    <span style={{ fontSize:10,color:"var(--muted)",fontFamily:"var(--font-mono)",whiteSpace:"nowrap" }}>{carouselIdx + 1}/{filteredParks.length}</span>
                    <button onClick={e => { e.stopPropagation(); navigate(1); }}  style={{ background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:20,padding:"0 2px",lineHeight:1 }}>›</button>
                  </div>
                </div>

                {/* Tap hint */}
                <div style={{ flexShrink:0, padding:"0 16px 10px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <p style={{ fontSize:11,color:"var(--muted)",fontStyle:"italic" }}>{selectedPark.brief.slice(0, 60)}…</p>
                  <span style={{ fontSize:11,color:"var(--accent)",fontWeight:"bold",whiteSpace:"nowrap",marginLeft:8 }}>More →</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Expanded full-screen card ── */}
          {cardState === "expanded" && selectedPark && (
            <div style={{
              position:"fixed", inset:0, zIndex:200,
              background:"var(--background)",
              display:"flex", flexDirection:"column",
              animation:"fbs-expand-up 0.35s cubic-bezier(0.32,0.72,0,1) both",
              overflowY:"auto",
            }}>
              {/* Top bar */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 16px 0", flexShrink:0 }}>
                <button
                  onClick={() => setCardState("peek")}
                  style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--foreground)",fontSize:13,padding:0 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                  Map
                </button>
                <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                  <button onClick={() => toggleSave(selectedPark)} style={{ background:"none",border:"none",cursor:"pointer",color: savedIds.includes(selectedPark.id) ? "var(--accent)" : "var(--muted)",padding:0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={savedIds.includes(selectedPark.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button onClick={() => sharePark(selectedPark)} style={{ background:"none",border:"none",cursor:"pointer",color: copied ? "var(--accent)" : "var(--muted)",padding:0 }}>
                    {copied
                      ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    }
                  </button>
                </div>
              </div>

              {/* Gradient hero */}
              <div style={{ flexShrink:0, height:160, background:GRADIENTS[gradIdx(selectedPark)], display:"flex", alignItems:"flex-end", padding:"0 20px 18px", margin:"16px 0 0" }}>
                <div>
                  <p style={{ fontSize:9,textTransform:"uppercase",letterSpacing:"0.2em",color:"var(--accent)",marginBottom:4 }}>{selectedPark.location} · {selectedPark.borough}</p>
                  <h2 style={{ fontSize:"clamp(1.6rem,6vw,2.4rem)",fontWeight:900,letterSpacing:"-0.03em",lineHeight:1,color:"#f0f0eb" }}>{selectedPark.name}</h2>
                </div>
              </div>

              {/* Scrollable content */}
              <div style={{ padding:"20px 20px 40px", display:"flex", flexDirection:"column", gap:20 }}>
                {/* Badges */}
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  <span style={{ fontSize:10,padding:"3px 10px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--muted)" }}>{selectedPark.type}</span>
                  {selectedPark.is_free    && <span style={{ fontSize:10,padding:"3px 10px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--accent)" }}>Free</span>}
                  {selectedPark.is_covered && <span style={{ fontSize:10,padding:"3px 10px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--accent)" }}>Covered</span>}
                  {!selectedPark.is_free   && <span style={{ fontSize:10,padding:"3px 10px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--muted)" }}>Paid</span>}
                  {selectedPark.opened && <span style={{ fontSize:10,padding:"3px 10px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--muted)" }}>Est. {selectedPark.opened}</span>}
                </div>

                {/* Brief */}
                <p style={{ fontSize:14,lineHeight:1.7,color:"var(--foreground)" }}>{selectedPark.brief}</p>

                {/* Scout note */}
                {selectedPark.scout && (
                  <div style={{ borderLeft:"2px solid var(--accent)",paddingLeft:14 }}>
                    <p style={{ fontSize:11,textTransform:"uppercase",letterSpacing:"0.12em",color:"var(--accent)",marginBottom:6 }}>Scout says</p>
                    <p style={{ fontSize:13,lineHeight:1.65,color:"var(--muted)",fontStyle:"italic" }}>{selectedPark.scout}</p>
                  </div>
                )}

                {/* Key facts */}
                {selectedPark.facts && selectedPark.facts.length > 0 && (
                  <div>
                    <p style={{ fontSize:11,textTransform:"uppercase",letterSpacing:"0.12em",color:"var(--accent)",marginBottom:10 }}>Key facts</p>
                    <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                      {selectedPark.facts.map((f,i) => (
                        <div key={i} style={{ display:"flex",gap:8,alignItems:"flex-start" }}>
                          <span style={{ color:"var(--accent)",fontSize:10,marginTop:2,flexShrink:0 }}>—</span>
                          <span style={{ fontSize:13,color:"var(--muted)",lineHeight:1.5 }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <button
                  onClick={() => router.push(`/parks/${selectedPark.slug}`)}
                  style={{ padding:"14px",fontSize:13,fontWeight:"bold",textTransform:"uppercase",letterSpacing:"0.1em",background:"var(--accent)",color:"#fff",border:"none",cursor:"pointer",width:"100%" }}
                >
                  View Full Park Page →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ DESKTOP ══ */}
      {!isMobile && (
        <div style={{ position:"relative", height:"calc(100vh - 120px)" }}>
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
          <div style={{ position:"absolute",top:0,left:0,bottom:0,width:280,background:"var(--background)",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",zIndex:10 }}>
            <div style={{ padding:12,borderBottom:"1px solid var(--border)" }}>
              <input type="text" placeholder="Search parks…" value={search} onChange={e=>setSearch(e.target.value)}
                style={{ width:"100%",padding:"9px 13px",fontSize:13,background:"var(--card)",border:"1px solid var(--border)",color:"var(--foreground)",outline:"none",boxSizing:"border-box" }} />
            </div>
            <div style={{ display:"flex",gap:4,padding:"8px 12px",borderBottom:"1px solid var(--border)",overflowX:"auto",flexWrap:"wrap" }}>
              {REGIONS.map(f=><button key={f} onClick={()=>setActiveFilter(f)} style={S.desktopFilterBtn(activeFilter===f)}>{f}</button>)}
            </div>
            <div style={{ display:"flex",gap:4,padding:"8px 12px",borderBottom:"1px solid var(--border)",overflowX:"auto",alignItems:"center" }}>
              {TYPE_FILTERS.map(f=><button key={f} onClick={()=>setTypeFilter(f)} style={S.desktopFilterBtn(typeFilter===f)}>{f}</button>)}
              <button onClick={nearMe} style={{ ...S.desktopFilterBtn(false), marginLeft:"auto", display:"flex", alignItems:"center", gap:4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
                Near me
              </button>
            </div>
            <div style={{ overflowY:"auto",flex:1 }}>
              {filteredParks.map(park=>(
                <button key={park.id} onClick={()=>openPark(park)}
                  style={{ width:"100%",textAlign:"left",padding:0,borderBottom:"1px solid var(--border)",cursor:"pointer",background:selectedPark?.id===park.id?"var(--card)":"transparent",display:"flex",alignItems:"stretch" }}>
                  <div style={{ width:3,flexShrink:0,background:GRADIENTS[gradIdx(park)] }} />
                  <div style={{ padding:"11px 13px",flex:1 }}>
                    <p style={{ fontSize:13,fontWeight:"bold",color:selectedPark?.id===park.id?"var(--accent)":"var(--foreground)" }}>{park.name}</p>
                    <p style={{ fontSize:11,marginTop:2,color:"var(--muted)" }}>{park.location}</p>
                  </div>
                  {selectedPark?.id===park.id && <div style={{ display:"flex",alignItems:"center",paddingRight:12,color:"var(--accent)",fontSize:12 }}>→</div>}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop preview bar */}
          {selectedPark && (
            <div style={{ position:"absolute",bottom:0,left:280,right:0,height:PEEK_H,background:"var(--background)",borderTop:"1px solid var(--border)",zIndex:11,display:"flex",alignItems:"stretch",animation:"fbs-card-in 0.28s cubic-bezier(0.32,0.72,0,1) both" }}>
              {/* Gradient panel */}
              <div style={{ width:220,flexShrink:0,background:GRADIENTS[gradIdx(selectedPark)],position:"relative",display:"flex",alignItems:"flex-end" }}>
                <div style={{ padding:"0 18px 16px" }}>
                  <p style={{ fontSize:9,textTransform:"uppercase",letterSpacing:"0.15em",color:"var(--accent)",marginBottom:3 }}>{selectedPark.location}</p>
                  <p style={{ fontSize:16,fontWeight:900,letterSpacing:"-0.02em",lineHeight:1.1,color:"#f0f0eb" }}>{selectedPark.name}</p>
                </div>
              </div>
              {/* Info panel */}
              <div style={{ flex:1,padding:"16px 22px",display:"flex",flexDirection:"column",justifyContent:"center",borderLeft:"1px solid var(--border)",overflow:"hidden" }}>
                <div style={{ display:"flex",gap:7,marginBottom:9 }}>
                  <span style={{ fontSize:10,padding:"2px 8px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--muted)" }}>{selectedPark.type}</span>
                  {selectedPark.is_free    && <span style={{ fontSize:10,padding:"2px 8px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--accent)" }}>Free</span>}
                  {selectedPark.is_covered && <span style={{ fontSize:10,padding:"2px 8px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--accent)" }}>Covered</span>}
                  {!selectedPark.is_free   && <span style={{ fontSize:10,padding:"2px 8px",background:"var(--card)",border:"1px solid var(--border)",color:"var(--muted)" }}>Paid</span>}
                </div>
                <p style={{ fontSize:13,lineHeight:1.65,color:"var(--muted)",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden" } as React.CSSProperties}>{selectedPark.brief}</p>
              </div>
              {/* Actions panel */}
              <div style={{ flexShrink:0,padding:"16px 20px",display:"flex",flexDirection:"column",justifyContent:"center",gap:10,borderLeft:"1px solid var(--border)",alignItems:"center",minWidth:160 }}>
                <button
                  onClick={() => router.push(`/parks/${selectedPark.slug}`)}
                  style={{ padding:"10px 20px",fontSize:12,fontWeight:"bold",textTransform:"uppercase",letterSpacing:"0.1em",background:"var(--accent)",color:"#fff",border:"none",cursor:"pointer",whiteSpace:"nowrap",width:"100%" }}
                >
                  View Park →
                </button>
                <div style={{ display:"flex",gap:16,alignItems:"center" }}>
                  <button onClick={() => toggleSave(selectedPark)} style={{ background:"none",border:"none",cursor:"pointer",color: isSaved ? "var(--accent)" : "var(--muted)",padding:0,display:"flex",alignItems:"center" }} title={isSaved ? "Saved" : "Save"}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button onClick={() => sharePark(selectedPark)} style={{ background:"none",border:"none",cursor:"pointer",color: copied ? "var(--accent)" : "var(--muted)",padding:0,display:"flex",alignItems:"center" }} title="Share">
                    {copied
                      ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    }
                  </button>
                  <button onClick={dismiss} style={{ fontSize:11,color:"var(--muted)",background:"none",border:"none",cursor:"pointer" }}>✕</button>
                </div>
              </div>
            </div>
          )}
          </>
        </div>
      )}
    </div>
  );
}
