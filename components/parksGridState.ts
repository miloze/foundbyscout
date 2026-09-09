"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

// ── Explore/Grid mode + density state ────────────────────────────────────
// Held in the URL rather than component state so a Grid view at a given
// density is shareable and bookmarkable, and so returning from a park page
// lands back in the same view.

export type ExploreMode = "explore" | "grid";
export type GridDensity = "large" | "medium";

// Two modes, not three. Large is "looking at parks", Medium is "scanning
// them"; the old Small was neither — at 7 columns the photograph stopped being
// recognisable at about the same width the name stopped being readable, so
// there was no width at which it was the right tool. See coerceDensity for
// what happens to the links and sessions that still name it.
export const DENSITIES: GridDensity[] = ["large", "medium"];

const MODE_PARAM = "mode";
const DENSITY_PARAM = "density";
const STORE_KEY = "fbs-parks-explore";

// useLayoutEffect on the server logs a warning and does nothing. We need the
// layout timing on the client — mode has to resolve before first paint so the
// map never mounts for a frame on ?mode=grid — so swap by environment.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Where a park page was opened from, and which park it was.
 *
 *  The slug is the whole point of storing it. Recording only "you were last in
 *  Map" makes every park page claim you came from the map — including one
 *  reached from the home page an hour later in the same tab — and a "Back to
 *  map" that lies about where you have been is worse than not offering one.
 *  Matching the slug means the control appears exactly when this park was the
 *  one opened from the directory, and falls back to "View on map" otherwise. */
export type DirectoryOrigin = { mode: ExploreMode; slug: string };

/** Enough of the map to put a reader back where they were looking.
 *  `selectedSlug` rather than the row id: ids are database keys and the store
 *  outlives a deploy, whereas a slug is the same thing the URL is made of. */
export type MapSnapshot = {
  lat: number; lng: number; zoom: number;
  selectedSlug: string | null;
  listScroll: number;
};

type Stored = {
  mode?: ExploreMode; density?: GridDensity; scrollY?: number; reveal?: number;
  search?: string; map?: MapSnapshot; origin?: DirectoryOrigin;
};

function readStore(): Stored {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch { return {}; }
}

function writeStore(patch: Stored) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ ...readStore(), ...patch }));
  } catch { /* private mode / quota — state degrades to URL only */ }
}

// ── Returning from a park page ───────────────────────────────────────────
// All of this rides in the same session record as mode/density/scroll, so
// there is one key to reason about and one thing to clear.

/** Called as a park link in the directory is followed. */
export function rememberDirectoryOrigin(mode: ExploreMode, slug: string) {
  writeStore({ origin: { mode, slug } });
}

/** The origin, but only if it is about `slug`. Anything else is treated as no
 *  origin at all — see DirectoryOrigin. */
export function readDirectoryOrigin(slug: string): DirectoryOrigin | null {
  const o = readStore().origin;
  return o && o.slug === slug && isMode(o.mode) ? o : null;
}

/**
 * Carry a park's entry context onto the park being stepped to.
 *
 * The park page has its own previous/next, and without this the return control
 * changed meaning as you used it: you arrive from the map on Bloblands and get
 * "Back to map", step once, and the origin's slug no longer matches so the
 * control silently becomes "View on map" — a different label pointing at a
 * different kind of destination, for a reader who has not left the chain of
 * pages the map started.
 *
 * Only carried when there is something to carry. A park reached directly, then
 * stepped away from, still has no directory behind it and still gets the
 * labelled fallback — which is the whole reason the slug match exists.
 */
export function carryDirectoryOrigin(fromSlug: string, toSlug: string) {
  const o = readDirectoryOrigin(fromSlug);
  if (o) writeStore({ origin: { mode: o.mode, slug: toSlug } });
}

export function saveMapSnapshot(map: MapSnapshot) { writeStore({ map }); }

/** The stored map view, or null. Guards every field: this is JSON from a
 *  previous build's session, and a half-written record must not be able to
 *  send Leaflet to NaN. */
export function readMapSnapshot(): MapSnapshot | null {
  const m = readStore().map;
  if (!m) return null;
  const ok = [m.lat, m.lng, m.zoom].every(n => typeof n === "number" && Number.isFinite(n));
  if (!ok) return null;
  return {
    lat: m.lat, lng: m.lng, zoom: m.zoom,
    selectedSlug: typeof m.selectedSlug === "string" ? m.selectedSlug : null,
    listScroll: typeof m.listScroll === "number" && m.listScroll >= 0 ? m.listScroll : 0,
  };
}

export function saveSearch(search: string) { writeStore({ search }); }
export function readSearch(): string {
  const q = readStore().search;
  return typeof q === "string" ? q : "";
}

function isMode(v: string | null): v is ExploreMode {
  return v === "explore" || v === "grid";
}
/**
 * A density from an untrusted source — a URL someone shared, or a session
 * written by an older build.
 *
 * "small" was the third density until Phase 6B removed it. Rather than
 * rejecting it (which would silently drop the reader back to the default) or
 * erroring, it resolves to medium: it was the denser of the two survivors, so
 * a link that asked for "as much as possible" still gets the denser sheet.
 * Anything else unrecognised returns null and lets the caller fall back.
 */
function coerceDensity(v: string | null | undefined): GridDensity | null {
  if (v === "large" || v === "medium") return v;
  if (v === "small") return "medium";
  return null;
}

function readUrl(): { mode: ExploreMode | null; density: GridDensity | null } {
  const q = new URLSearchParams(window.location.search);
  const raw = q.get(MODE_PARAM);
  // ?grid=1 is the original flag gate from the handover, kept as an alias so
  // links written before ?mode=grid existed still open the Grid.
  const mode = isMode(raw) ? raw : q.get("grid") === "1" ? "grid" : null;
  const d = q.get(DENSITY_PARAM);
  return { mode, density: coerceDensity(d) };
}

// history.replaceState rather than router.replace: this only ever changes how
// the same route displays itself, and going through the router would re-render
// the route tree (remounting the map or the grid) on every density tap.
function writeUrl(mode: ExploreMode, density: GridDensity) {
  const url = new URL(window.location.href);
  url.searchParams.delete("grid");
  if (mode === "explore") url.searchParams.delete(MODE_PARAM);
  else url.searchParams.set(MODE_PARAM, mode);
  // Written whenever it is off the default, in either mode. Keeping it on an
  // Explore URL costs nothing and means a link back into Grid — or into the
  // preview harness, which has no mode — arrives at the density it was shared
  // at rather than resetting to medium.
  if (density !== "medium") url.searchParams.set(DENSITY_PARAM, density);
  else url.searchParams.delete(DENSITY_PARAM);
  window.history.replaceState(window.history.state, "", url);
}

/**
 * Resolved view state for the Parks page.
 *
 * `mode` is null until the first client layout pass has read the URL — server
 * render and client hydration must agree, and neither can see the URL params
 * during render. Callers should render neither view while it is null; because
 * this resolves in a layout effect the blank commit never reaches the screen.
 */
export function useExploreState() {
  const [mode, setModeState] = useState<ExploreMode | null>(null);
  const [density, setDensityState] = useState<GridDensity>("medium");
  // The setters have to write the *pair* to the URL, so each needs to read the
  // other's current value. Held in refs rather than read through a state
  // updater: an updater that also writes to history and sessionStorage is a
  // side effect in a function React is free to call more than once.
  const modeRef = useRef<ExploreMode>("explore");
  const densityRef = useRef<GridDensity>("medium");

  useIsoLayoutEffect(() => {
    const url = readUrl();
    const stored = readStore();
    // URL wins over the session — an explicit link should never be overridden
    // by what this tab was last looking at.
    const nextMode = url.mode ?? stored.mode ?? "explore";
    // The stored value goes through the same coercion as the URL: sessionStorage
    // is JSON, so its `density` is only typed by assertion and a session
    // written before 6B still says "small".
    const nextDensity = url.density ?? coerceDensity(stored.density) ?? "medium";
    modeRef.current = nextMode;
    densityRef.current = nextDensity;
    setModeState(nextMode);
    setDensityState(nextDensity);
  }, []);

  // Back/forward within the same route (including our own replaceState entries)
  // must re-read, or the view and the address bar drift apart.
  useEffect(() => {
    const onPop = () => {
      const url = readUrl();
      const nextMode = url.mode ?? "explore";
      modeRef.current = nextMode;
      setModeState(nextMode);
      if (url.density) {
        densityRef.current = url.density;
        setDensityState(url.density);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setMode = useCallback((next: ExploreMode) => {
    modeRef.current = next;
    setModeState(next);
    writeUrl(next, densityRef.current);
    // scrollY resets with the mode: the saved offset belongs to the view being
    // left, and restoring it into the other one lands nowhere meaningful.
    writeStore({ mode: next, density: densityRef.current, scrollY: 0 });
    window.scrollTo(0, 0);
  }, []);

  const setDensity = useCallback((next: GridDensity) => {
    densityRef.current = next;
    setDensityState(next);
    writeUrl(modeRef.current, next);
    writeStore({ density: next });
  }, []);

  return { mode, density, setMode, setDensity };
}

/**
 * Scroll position across a park-page visit.
 *
 * The handover's preferred fix is to keep Grid mounted behind an intercepting
 * route so scroll survives for free. That would mean restructuring app/parks
 * routing, which is shared with List and Map, so this is the documented
 * fallback: persist scrollY and put it back on remount.
 */
export function useGridScrollRestore(
  active: boolean,
  ready: boolean,
  reveal: number,
  onReveal: (n: number) => void,
) {
  const restored = useRef(false);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        // mode is written here too, not only by the toggle: someone who arrives
        // on a /parks?mode=grid link and never touches the control still has to
        // come back from a park page where they left off.
        writeStore({ mode: "grid", scrollY: window.scrollY });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [active]);

  // How far the sheet had been revealed is saved alongside the offset. Without
  // it, coming back to a deep position in a large archive scrolls against a
  // sheet only one page tall and clamps to the bottom of it.
  useEffect(() => {
    if (active) writeStore({ reveal });
  }, [active, reveal]);

  // Waits on `ready` — restoring before the tiles exist would scroll against a
  // page that is still one viewport tall.
  useIsoLayoutEffect(() => {
    if (!active || !ready || restored.current) return;
    restored.current = true;
    const { scrollY, reveal: savedReveal, mode } = readStore();
    if (mode !== "grid" || typeof scrollY !== "number" || scrollY <= 0) return;
    // flushSync so the taller sheet is committed before the scroll lands,
    // rather than a frame after it.
    if (typeof savedReveal === "number" && savedReveal > reveal) {
      flushSync(() => onReveal(savedReveal));
    }
    window.scrollTo(0, scrollY);
    // `reveal` and `onReveal` are deliberately not dependencies: this runs once
    // per mount, and re-running it as the sheet grows would yank the reader
    // back to the saved offset every time another page of tiles loads.
  }, [active, ready]);
}

// ── URL params as a read source ──────────────────────────────────────────
// A plain useState initialiser cannot read the query string: these pages are
// prerendered, so the server render and the hydrating client render have to
// agree. useSyncExternalStore is the supported way round it — React renders the
// server snapshot, then reconciles to the client one before paint.
function subscribeToLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

export function useUrlParam(name: string): string | null {
  return useSyncExternalStore(
    subscribeToLocation,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}
