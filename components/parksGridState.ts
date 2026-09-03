"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

// ── Explore/Grid mode + density state ────────────────────────────────────
// Held in the URL rather than component state so a Grid view at a given
// density is shareable and bookmarkable, and so returning from a park page
// lands back in the same view.

export type ExploreMode = "explore" | "grid";
export type GridDensity = "large" | "medium" | "small";

export const DENSITIES: GridDensity[] = ["large", "medium", "small"];

const MODE_PARAM = "mode";
const DENSITY_PARAM = "density";
const STORE_KEY = "fbs-parks-explore";

// useLayoutEffect on the server logs a warning and does nothing. We need the
// layout timing on the client — mode has to resolve before first paint so the
// map never mounts for a frame on ?mode=grid — so swap by environment.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Stored = { mode?: ExploreMode; density?: GridDensity; scrollY?: number; reveal?: number };

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

function isMode(v: string | null): v is ExploreMode {
  return v === "explore" || v === "grid";
}
function isDensity(v: string | null): v is GridDensity {
  return v === "large" || v === "medium" || v === "small";
}

function readUrl(): { mode: ExploreMode | null; density: GridDensity | null } {
  const q = new URLSearchParams(window.location.search);
  const raw = q.get(MODE_PARAM);
  // ?grid=1 is the original flag gate from the handover, kept as an alias so
  // links written before ?mode=grid existed still open the Grid.
  const mode = isMode(raw) ? raw : q.get("grid") === "1" ? "grid" : null;
  const d = q.get(DENSITY_PARAM);
  return { mode, density: isDensity(d) ? d : null };
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
    const nextDensity = url.density ?? stored.density ?? "medium";
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
