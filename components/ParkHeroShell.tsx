"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import HeroNavOverlay from "./HeroNavOverlay";
import ParkHeroViewer from "./ParkHeroViewer";
import { ParkGlanceHeroOverlay, type ParkGlance } from "./ParkFacts";
import ParkWeather from "./ParkWeather";
import ParkViewerModal from "./ParkViewerModal";
import ParkHeroDetails from "./ParkHeroDetails";
import {
  BwIcon, ArIcon, ExitIcon, PrevIcon, NextIcon,
  ViewerControlBar, ViewerCluster, ViewerClusterButton, ViewerClusterDivider, ViewerReadout,
  VIEWER_CONTROLS_CSS,
} from "./ViewerControls";
import { markParkNavDirection } from "@/lib/view-transitions";
import { catalogueIndexLabel } from "@/lib/catalogue";
import { lockPageScroll } from "@/lib/scrollLock";
import CTAButton from "./CTAButton";

// Session-scoped, deliberately: the instructions should feel learned within a
// visit, not taught from scratch on every open, but nothing here is worth
// remembering across visits.
const INSTRUCTIONS_SEEN_KEY = "fbs-hero-viewer-instructed";

// While the viewer is behind a review flag, the session memory is off.
// sessionStorage survives reloads, so one drag anywhere in the tab silently
// suppressed the instructions for the rest of it — reviewing the entrance then
// meant remembering to clear a key by hand, which is not a thing anyone should
// have to know. Both flags disappear at rollout, and the memory comes back
// with them.
function reviewMode(): boolean {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get("debug") === "1" || p.get("scroll") === "1";
  } catch { return false; }
}
function seenInstructions(): boolean {
  if (reviewMode()) return false;
  try { return sessionStorage.getItem(INSTRUCTIONS_SEEN_KEY) === "1"; } catch { return false; }
}
function markInstructionsSeen() {
  if (reviewMode()) return;
  try { sessionStorage.setItem(INSTRUCTIONS_SEEN_KEY, "1"); } catch { /* ignore */ }
}

type Props = {
  // Viewer
  modelFile: string | null;
  heroImage?: string;
  preloadImageUrl?: string;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  pingPong?: [[number, number, number], [number, number, number]];
  autoRotate?: boolean;
  debug?: boolean;
  /** see the gate in app/parks/[slug]/page.tsx */
  /** Opt-in desktop click-to-expand overlay. Off everywhere unless the page
   *  turns it on — see the gate in app/parks/[slug]/page.tsx. */
  viewerOverlay?: boolean;
  ambientIntensity?: number;
  directionalIntensity?: number;
  environmentPreset?: string;
  environmentIntensity?: number;
  // Meta
  /** Needed only to derive the shared view-transition names — see
      lib/view-transitions.ts. The home hero scopes its names by the same
      slug, which is what pairs the two heroes' elements. */
  slug: string;
  catalogueId?: string;
  /** Size of the published catalogue — the "/11" of the prev/index/next
   *  cluster below, and nothing else. That cluster is the one place on the
   *  site where a park is genuinely a position in a traversable sequence;
   *  everything that merely names the park takes catalogueMark. */
  catalogueTotal?: number;
  /** The parks either side of this one in catalogue order. Hero only — the
   *  3D viewer does not carry them, so there is no second copy to navigate
   *  from. */
  prevPark?: { slug: string; name: string };
  nextPark?: { slug: string; name: string };
  name: string;
  address?: string[];
  location?: string;
  postcode?: string;
  lat?: number;
  lng?: number;
  opened?: string;
  scanned?: string;
  /** At a Glance, for the hero-overlay placement. The overlay renders nothing
   *  while GLANCE_PLACEMENT is "sidebar", so this is inert until the flag in
   *  ParkFacts is flipped. */
  glance?: ParkGlance;
};

export default function ParkHeroShell({
  modelFile, heroImage, preloadImageUrl,
  cameraPos, cameraTarget, modelRotation, pingPong, autoRotate, debug, viewerOverlay,
  ambientIntensity, directionalIntensity, environmentPreset, environmentIntensity,
  slug, catalogueId, catalogueTotal, prevPark, nextPark, name, address, location, postcode, lat, lng, opened, scanned,
  glance,
}: Props) {
  const [bw, setBw] = useState(true);
  const [open3D, setOpen3D] = useState(false);
  // Viewer mode, in place. The hero does not hand off to another screen: it
  // gains a state. The metadata block is a sibling of the visual layer and
  // takes no transform from this, which is what makes "never moves" literal
  // rather than approximate.
  const [viewerActive, setViewerActive] = useState(false);
  // The entrance and exit are staged rather than switched, so each of these
  // is granted or withdrawn at its own moment — see openViewer/closeViewer.
  const [spinning, setSpinning] = useState(true);
  const [canRotate, setCanRotate] = useState(false);
  const [canZoom, setCanZoom] = useState(false);
  const [controlsShown, setControlsShown] = useState(false);
  // The centered instructions. They no longer collapse to a quieter state —
  // once the visitor has moved the model they go entirely.
  const [instructionsShown, setInstructionsShown] = useState(false);
  // Guards the entrance against a second click landing mid-sequence.
  const [busy, setBusy] = useState(false);
  // Pointer capability, which is a different question from viewport width and
  // was never asked before. The entry affordance was gated on a 300ms hover
  // dwell, so on a touch tablet — which gets the live model, not the still —
  // it never appeared: the whole hero was a button with nothing saying so.
  // Resolved after mount for the same reason isMobile is; the server has no
  // pointer, and rendering a different tree on the first client pass would be
  // a hydration mismatch.
  const [coarse, setCoarse] = useState(false);
  // What the scan is actually doing, reported by the viewer itself rather than
  // assumed. The entry affordance used to promise "Click to explore" from the
  // first paint, while the GLB was still downloading — so a reader could be
  // invited into a viewer that had nothing in it yet, and on a failed scan the
  // invitation never withdrew at all.
  const [scanState, setScanState] = useState<"loading" | "ready" | "failed">("loading");
  const onScanReady = useCallback(() => setScanState("ready"), []);
  const onScanFailed = useCallback(() => setScanState("failed"), []);
  // The hover prompt is dwell-gated, and leaves at two different speeds: a
  // click is an acknowledgement, a pointer-leave is just the end of a hover.
  const [promptShown, setPromptShown] = useState(false);
  const [promptExit, setPromptExit] = useState<"hover" | "click">("hover");
  // Keeps the prompt in the tree just past the click so its acknowledgement
  // fade can actually play. Unmounting on activation deleted it instantly, so
  // the two exit speeds were a distinction with nothing to show for it.
  const [promptLingering, setPromptLingering] = useState(false);
  const dwellRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const collapseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactedRef = useRef(false);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  // ── Entrance ──────────────────────────────────────────────────────────
  // Staged, not simultaneous. The rotation settles first, colour comes up
  // over the tail of that settle rather than after it, drag arrives with the
  // colour so the model answers the moment it starts looking live, and the
  // controls follow — they report what the model is already doing rather than
  // announcing it. Zoom is last, so the first gesture is the forgiving one.
  //
  // Colour is part of what entering means, not a separate control to find.
  const openViewer = useCallback(() => {
    if (busy || viewerActive) return;   // a second click mid-sequence is a no-op
    // Nothing to explore until the model is on screen. This is the guard, not
    // just the label: the whole hero is the click target, so without it a tap
    // anywhere would start the entrance over an empty scene.
    if (scanState !== "ready") return;
    setBusy(true);
    clearTimers();
    if (dwellRef.current) clearTimeout(dwellRef.current);
    setPromptExit("click");
    setPromptShown(false);
    setPromptLingering(true);
    after(160, () => setPromptLingering(false));
    interactedRef.current = false;

    setViewerActive(true);
    setSpinning(false);                 // eases to a stop over ~350ms

    after(150, () => { setBw(false); setCanRotate(true); });
    // Straight after the prompt's click fade, so the instructions rise out of
    // the space it just vacated. Skipped outright on a repeat activation this
    // session: with nothing left in a reduced state there is nothing to leave
    // showing, and a visitor who has already moved the model does not need
    // telling again.
    after(150, () => { if (!seenInstructions()) setInstructionsShown(true); });
    after(450, () => setControlsShown(true));
    after(700, () => setCanZoom(true));
    after(900, () => setBusy(false));
  }, [busy, viewerActive, scanState, clearTimers, after]);

  // ── Exit ──────────────────────────────────────────────────────────────
  // Interaction is withdrawn at once so there is no half-live window, then
  // colour and the idle spin come back over the top of the zoom-out. Nothing
  // re-homes the camera: the scan stays at the angle it was left at, and the
  // ambient rotation picks up from there.
  const closeViewer = useCallback(() => {
    clearTimers();
    if (collapseRef.current) clearTimeout(collapseRef.current);
    setCanRotate(false);
    setCanZoom(false);
    setControlsShown(false);
    setInstructionsShown(false);
    setViewerActive(false);
    setBusy(false);

    after(100, () => setBw(true));
    after(350, () => setSpinning(true));
    after(700, () => setInstructionsShown(false));
  }, [clearTimers, after]);

  // ── Hover prompt ──────────────────────────────────────────────────────
  const armPrompt = useCallback(() => {
    if (viewerActive || promptShown) return;   // no re-pulse while hovering
    if (scanState !== "ready") return;        // nothing to invite anyone into yet
    // On a coarse pointer the prompt is already up and stays up until the
    // scan is entered — there is no dwell to wait for, and a pointerenter
    // fired by a tap would just restart a timer the tap has already beaten.
    if (dwellRef.current) clearTimeout(dwellRef.current);
    if (coarse) return;
    dwellRef.current = setTimeout(() => {
      setPromptExit("hover");
      setPromptShown(true);
    }, 300);
  }, [viewerActive, promptShown, coarse, scanState]);
  const disarmPrompt = useCallback(() => {
    if (coarse) return;               // nothing to leave; the prompt is resident
    if (dwellRef.current) clearTimeout(dwellRef.current);
    setPromptExit("hover");
    setPromptShown(false);
  }, [coarse]);

  // ── First gesture stands the instructions down ────────────────────────
  const handleInteract = useCallback(() => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    markInstructionsSeen();
    collapseRef.current = setTimeout(() => setInstructionsShown(false), 600);
  }, []);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    if (dwellRef.current) clearTimeout(dwellRef.current);
    if (collapseRef.current) clearTimeout(collapseRef.current);
  }, []);
  const frameRef = useRef<HTMLDivElement>(null);

  // Is the pointer outside the viewer window? Geometric on purpose, and shared
  // by both dismissals so they cannot drift: the canvas covers the whole hero
  // and keeps rendering behind the wash, so closest("canvas") is true
  // everywhere in the hero and cannot tell the window from the page around it.
  // The frame rect is the window.
  const outsideFrame = useCallback((x: number, y: number) => {
    const r = frameRef.current?.getBoundingClientRect();
    if (!r) return false;   // no frame yet: never dismiss on a guess
    return x < r.left || x > r.right || y < r.top || y > r.bottom;
  }, []);
  const [isMobile, setIsMobile] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!viewerActive) return;
    // The hero is in the page, not over it — see lockPageScroll.
    const unlock = lockPageScroll({ reclaimScrollbar: false });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeViewer(); };

    // ── Scrolling away exits ──────────────────────────────────────────
    // Two listeners, because the lock above does not actually stop the page:
    // it sets overflow:hidden on the body, but the site also sets
    // overflow-x:clip there, and a body whose overflow is already not
    // `visible` no longer propagates to the viewport. The page still scrolls.
    // So a wheel is not the only way out — a scrollbar drag moves the page and
    // fires `scroll` without ever firing `wheel`.
    //
    // Both defer to the same question: was the pointer over the viewer window?
    // Over the window a wheel is the zoom gesture and must be left completely
    // alone. A scroll carries no coordinates of its own, so it reads the last
    // pointer position — which is what makes a scrollbar drag (pointer far to
    // the right, outside the frame) dismiss, while a wheel over the scan that
    // happens to reach the page does not.
    //
    // Passive: this must never add latency to the zoom, and there is nothing
    // here worth preventing.
    const pointer = { x: -1, y: -1, known: false };
    const track = (e: { clientX: number; clientY: number }) => {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.known = true;
    };

    const onWheel = (e: WheelEvent) => {
      track(e);
      if (outsideFrame(e.clientX, e.clientY)) closeViewer();
    };
    // Only a real movement counts. Applying the lock can settle the scroll
    // position by a pixel, and that must not read as the visitor leaving.
    const startY = window.scrollY;
    const onScroll = () => {
      if (window.scrollY === startY) return;
      if (!pointer.known || outsideFrame(pointer.x, pointer.y)) closeViewer();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", track, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", track);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      unlock();
    };
  }, [viewerActive, closeViewer, outsideFrame]);


  const hasCoords = lat != null && lng != null;
  // Same helper the hero metadata and the homepage hero use, so all three
  // read the same. The duplicate with the badge below the title is deliberate.
  const indexLabel = catalogueIndexLabel(catalogueId, catalogueTotal);
  // Whether the top-right cluster exists at all. It carries the colour toggle,
  // so wherever it is absent the toggle has to fall back to the pill by the
  // metadata — otherwise turning the scan to colour becomes unreachable.
  const topCluster = !!(viewerOverlay && modelFile && !isMobile);
  // Fine pointers earn the prompt by dwelling; coarse pointers get it outright
  // and keep it until the scan is entered. Same element, same plate, same
  // motion — only what decides it differs.
  // Loading and failure states are shown outright on every pointer type: they
  // are status, not an invitation, and hiding a failure behind a hover would
  // leave a dead scan looking like a photograph. Only the invitation itself
  // keeps the dwell behaviour on a fine pointer.
  const ctaShown = scanState !== "ready" ? !viewerActive : (coarse ? !viewerActive : promptShown);

  return (
    <>
    {open3D && modelFile && (
      <ParkViewerModal
        modelFile={modelFile}
        parkName={name}
        onClose={() => setOpen3D(false)}
        // Always the mobile full-screen treatment now. Desktop no longer hands
        // off to a separate screen at all — the hero becomes the viewer in
        // place, so the only thing that still opens this is the mobile
        // "explore in 3D" button. The modal's "takeover" variant is left in
        // the component but is no longer reachable from here.
        variant="fullscreen"
        catalogueId={catalogueId}
        address={address}
        postcode={postcode}
        lat={lat}
        lng={lng}
        scanned={scanned}
        preloadImageUrl={preloadImageUrl}
        cameraPos={cameraPos}
        cameraTarget={cameraTarget}
        modelRotation={modelRotation}
        pingPong={pingPong}
        autoRotate={autoRotate}
        ambientIntensity={ambientIntensity}
        directionalIntensity={directionalIntensity}
        environmentPreset={environmentPreset}
        environmentIntensity={environmentIntensity}
      />
    )}
    {/* Positioning context for anything that must escape the hero's
        `overflow: hidden` — the holographic sticker overhangs the bottom edge,
        and the hero has to keep clipping for the viewer and the scrim. The
        wrapper carries no border or padding, so the hero's -44px top margin
        still collapses through it and the pull-up under the nav is unchanged. */}
    <div style={{ position: "relative" }} data-hero-root>
    <div
      ref={heroRef}
      className={`full-bleed${viewerActive ? " viewer-active" : ""}`}
      onClick={viewerActive ? (e) => {
        // Clicking out of the window exits. The controls run their own
        // actions and are never a dismissal.
        if ((e.target as Element).closest?.("[data-hero-chrome]")) return;
        if (outsideFrame(e.clientX, e.clientY)) closeViewer();
      } : undefined}
      style={{
        position: "relative",
        height: "78vh",
        minHeight: 340,
        overflow: "hidden",
        // Follows the theme in every state, viewer mode included. This briefly
        // forced a dark stage while active, to hide the page ground showing
        // through the transparent canvas under the light theme — but the edges
        // that actually prompted that were the scrollbar strip and the
        // nav-height gap, both since fixed at source. Switching the ground out
        // from under a visitor who chose light mode is not a fix, it is a
        // second bug.
        background: "var(--background)",
        // The shell pads its top by var(--nav-height, 44px); this has to pull
        // back by the same amount or the difference shows as a band of page
        // background above the hero. It was hardcoded to -44px — the var's
        // *fallback*, not its value — so with the nav measuring 52px the hero
        // sat 8px low. Invisible while the hero and the page shared a
        // background, obvious the moment the viewer gave the hero a dark one.
        marginTop: "calc(var(--nav-height, 44px) * -1)",
      }}
    >
      {/* The hero already pulls itself up under the nav (marginTop -44px), so
          it was written expecting a transparent bar. This supplies it, and it
          is also what keeps the logo scrim off while the hero is behind the
          nav — the mark sits on the image, as on the home page. */}
      <HeroNavOverlay />
      {/* Viewer — grayscale prop controls ParkModel's filter directly */}
      {modelFile ? (
        // Explicit z-index rather than relying on DOM order: the WebGL canvas
        // is always its own composited layer, so leaving this at `auto` lets
        // paint order fall out of compositing rather than the stacking rules.
        // Floor it here, scrim at 2, hero copy at 5.
        <div className="fbs-hero-media" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          {/* Separate from .fbs-hero-media on purpose: the hover lift and the
              push-in are both transforms on the visual layer but want very
              different durations (.25s vs 1.1s), and one element cannot hold
              two. Nesting gives each its own. */}
          <div className="fbs-hero-zoom">
          <ParkHeroViewer
            modelFile={modelFile}
                heroImage={heroImage}
            preloadImageUrl={preloadImageUrl}
            cameraPos={cameraPos}
            cameraTarget={cameraTarget}
            modelRotation={modelRotation}
            pingPong={pingPong}
            autoRotate={autoRotate}
            debug={debug}
            ambientIntensity={ambientIntensity}
            directionalIntensity={directionalIntensity}
            environmentPreset={environmentPreset}
            environmentIntensity={environmentIntensity}
            grayscale={bw}
            spinning={spinning}
            allowRotate={canRotate}
            allowZoom={canZoom}
            onInteract={handleInteract}
            onReady={onScanReady}
            onFailed={onScanFailed}
          />
          </div>
        </div>
      ) : (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.025) 59px, rgba(255,255,255,0.025) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.025) 59px, rgba(255,255,255,0.025) 60px)",
        }} />
      )}

      {/* ── Click-to-expand shield ──────────────────────────────────────
          A transparent button laid over the canvas. It is the entire inline
          interaction, and it is also what makes the scroll fix free:
          OrbitControls binds its wheel and pointer listeners to the canvas
          element itself, and events landing on this layer never reach it, so
          the inline view stops zooming and orbiting without a single
          conditional inside ParkModel. Nothing here listens for `wheel`, so
          the browser scrolls the page exactly as it would over an image.

          z-index 3 puts it over the scrim (2) and under the hero copy (5) —
          the control cluster up there re-enables its own pointer events and
          keeps working, while the pointer-transparent name and meta fall
          through to this and expand the model, which is where a click over
          the scan should go anyway. */}
      {viewerOverlay && modelFile && !isMobile && (!viewerActive || promptLingering) && (
        <div
          // Inert the moment the viewer is live: it is still on screen for the
          // length of the fade, and it sits over the canvas, so it must stop
          // taking events before the model starts needing them.
          className={`fbs-expand${viewerActive ? " is-inert" : ""}${scanState !== "ready" ? " is-waiting" : ""}`}
          onClick={openViewer}
          onPointerEnter={armPrompt}
          onPointerLeave={disarmPrompt}
        >
          {/* The shared CTA, quiet variant. Not a bespoke chip: this is the
              same component as VIEW SCAN and EXPLORE, so the glyph, the
              hover invert and the caret nudge are the site's, not this
              hero's. The wrapper is what takes the click, so anywhere on the
              scan activates — the button is the visible affordance, not the
              only target. */}
          <span className={`fbs-expand-cta${ctaShown ? " is-shown" : ""}`} data-exit={promptExit}>
            {/* The eyebrow is coarse-pointer only. On a touch tablet the model
                is live but stationary and there is no hover to discover it
                with, so the affordance has to say what the thing IS before it
                says what to do with it — a still frame of a skatepark and a
                stationary scan look identical. On a mouse the idle rotation
                already answers "is this live?", the dwell answers "can I touch
                it?", and an eyebrow would only be restating both. */}
            {/* One box, three labels. The states must read as the SAME object
                changing its text, not as one element leaving and another
                arriving somewhere else — so the passive states reproduce
                CTAButton's internal structure exactly rather than approximating
                it: the same .fbs-cta plate, the same .fbs-cta__label, and the
                same caret occupying the same space with its ink turned off.
                Only the characters differ between states.

                There was an "INTERACTIVE 3D SCAN" eyebrow above this on coarse
                pointers. It was the main source of the jump — present only when
                ready, so the pill dropped by its height plus the gap the moment
                the model arrived — and with "LOADING 3D SCAN…" naming the object
                a moment earlier, it was saying it twice. */}
            {scanState === "ready" ? (
              /* One label on every device. "Click to explore" / "Drag to
                 explore" described the input rather than the offer, and split
                 one state into two vocabularies for no functional reason. The
                 CTA says what you get; the instructions after entry say how to
                 work it on this device, which is where the pointer type
                 genuinely matters. */
              <CTAButton label="Explore 3D" variant="ghost" onClick={openViewer} />
            ) : (
              <span className="fbs-cta fbs-cta--ghost fbs-cta--status">
                <span className="fbs-cta__label">
                  {scanState === "loading" ? "Loading 3D scan…" : "3D scan unavailable"}
                </span>
                {/* Reserves the caret's slot so the plate's metrics are identical
                    in all three states. Not decoration — it is never drawn. */}
                <svg className="fbs-cta__arrow" width="9" height="9" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  style={{ visibility: "hidden" }}>
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </span>
            )}
          </span>
        </div>
      )}

      {/* ── Viewer-mode window ─────────────────────────────────────────────
          Present in both states and only faded, so activating does not insert
          a new box mid-motion. The wash floods everything outside it rather
          than drawing an edge line — an edge made the last version read as a
          card. Sits under the hero copy (5) so the retained metadata stays on
          top of it. */}
      {viewerOverlay && modelFile && !isMobile && (
        <div ref={frameRef} aria-hidden className="fbs-hero-frame" />
      )}

      {/* ── Control bar ────────────────────────────────────────────────────
          One positioned box, two laid-out clusters.

          NAVIGATION (prev / index / next) moves you to another park.
          TOOLS (colour, exit) change how you are looking at this one.

          They were already independent in the code — navigation renders
          whether or not the park has a scan, viewer chrome only when it does —
          and they are now independent in the layout too. A wider gap between
          the groups than inside either one is the whole statement of the
          split: no box, no rule, no heading.

          What this replaces: three separately positioned elements, each
          computing its `right` as a running sum of the widths to its right
          (`--content-padding + 34 + 8 + 34 + 8`). A fifth control meant
          editing three expressions. The bar now owns the single offset and
          flex owns everything else, so SCALE / FLOW / FEATURES will be
          elements added to the tools cluster and nothing else. */}
      {(prevPark || nextPark || topCluster) && (
        <ViewerControlBar className="fbs-hero-bar">
          {(prevPark || nextPark) && (
            <ViewerCluster variant="joined" label="Catalogue navigation" className="fbs-hero-navgroup">
              {prevPark && (
                <ViewerClusterButton
                  href={`/parks/${prevPark.slug}`}
                  label={`Previous park: ${prevPark.name}`}
                  icon={<PrevIcon />}
                  onClick={() => markParkNavDirection("prev")}
                />
              )}
              {indexLabel && (
                <ViewerReadout label={`Park ${indexLabel.replace(/[()]/g, "")} in the catalogue`}>
                  {indexLabel}
                </ViewerReadout>
              )}
              {nextPark && (
                <ViewerClusterButton
                  href={`/parks/${nextPark.slug}`}
                  label={`Next park: ${nextPark.name}`}
                  icon={<NextIcon />}
                  onClick={() => markParkNavDirection("next")}
                />
              )}
            </ViewerCluster>
          )}

          {topCluster && (
            <ViewerCluster variant="spaced" label="Scan controls">
              {/* The icon reports state, the label reports the action. Both are
                  deliberate: a half-filled circle says "colour is on", and a
                  control's accessible name has to say what pressing it does.
                  `active` draws the accent — the one place the brand colour is
                  allowed in this chrome besides a focus ring. */}
              <ViewerClusterButton
                label={bw ? "Show the scan in colour" : "Show the scan in black and white"}
                icon={<BwIcon filled={!bw} />}
                active={!bw}
                onClick={() => setBw(b => !b)}
              />
              {/* Exit keeps its slot whether or not it is showing, so the
                  controls beside it do not shift when it fades in — the same
                  reason the old colour toggle reserved this space by hand.
                  `inert` takes it out of the tab order and the a11y tree while
                  it is invisible, which the fade alone would not.

                  Never `active`: exit must stay outside the accent vocabulary
                  the interpretive tools will use for their on-state, or it
                  reads as one more layer you can switch. */}
              <span className={`fbs-hero-exit${controlsShown ? " is-shown" : ""}`} inert={!controlsShown}>
                <ViewerClusterButton
                  label="Exit 3D view"
                  icon={<ExitIcon />}
                  onClick={closeViewer}
                />
              </span>
            </ViewerCluster>
          )}
        </ViewerControlBar>
      )}


      {/* ── Centered instructions ──────────────────────────────────────────
          They take over the spot the hover prompt just left, rising the same
          way it rose, so the two read as one thought continuing rather than a
          second element arriving. Plain text, deliberately: the prompt was an
          invitation and earned a plate, this is only describing what the
          model already does. */}
      {topCluster && (
        <div className={`fbs-hero-instructions${instructionsShown ? " is-shown" : ""}`} aria-hidden={!instructionsShown}>
          {/* The CTA's own classes, not a copy of its values: same plate,
              border, blur, radius and type as "Click to explore" by
              construction, so the two cannot drift. No arrow and no hover
              state — the wrapper is pointer-transparent, so this reads as the
              same object settling into a passive role rather than a second
              button appearing. */}
          <span className="fbs-cta fbs-cta--ghost">
            {coarse ? "Drag to rotate · Pinch to zoom" : "Drag to rotate · Scroll to zoom"}
          </span>
        </div>
      )}

      {/* At a Glance, overlaid on the scan. Null under the sidebar placement —
          see GLANCE_PLACEMENT in ParkFacts for why both exist. */}
      {glance && <ParkGlanceHeroOverlay glance={glance} />}

      {/* Hero content — bottom anchored. Sits above the canvas, so it has to be
          transparent to the pointer or it swallows orbit drags across the whole
          bottom band of the viewer; the pills, links and cluster opt back in
          via .fbs-hero-content below. */}
      {/* .contained so the park name, location chain and control cluster line
          up with the editorial column below, rather than with the hero's own
          edge. paddingBlock only — the horizontal inset comes from
          .contained's padding-inline, and a `padding` shorthand here would
          override it. */}
      <div className="fbs-hero-content contained" style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        // Off the shared margin, so the metadata sits inside the frame at
        // every viewport rather than at the sizes that happened to be tested.
        paddingBlock: "calc(var(--frame-inset) + 14px)",
        zIndex: 5,
        color: "#fff",
        pointerEvents: "none",
      }}>
        {/* Park name — same identity as the home hero's title. It arrives by
            travelling from the homepage's position and size into this one, so
            it must not be remounted; the shared name is what tells the browser
            these two are one element. */}
        <ParkHeroDetails
          name={name}
          catalogueId={catalogueId}
          address={address}
          postcode={postcode}
          lat={lat}
          lng={lng}
          scanned={scanned}
          slug={slug}
          rightSlot={<>
            {hasCoords && (
              <div className="fbs-cond-mobile">
                <ParkWeather lat={lat!} lng={lng!} />
              </div>
            )}

            {/* Only the fallback now. The colour toggle lives in the corner
                wherever that corner exists; this pill carries it for the cases
                that have no corner cluster — mobile, and any park without the
                viewer gated on — so colour never becomes unreachable. */}
            {(!topCluster || (isMobile && modelFile)) && (
              <ViewerCluster variant="joined" label="Scan controls">
                {!topCluster && (
                  <ViewerClusterButton
                    label={bw ? "Show the scan in colour" : "Show the scan in black and white"}
                    icon={<BwIcon filled={!bw} />}
                    active={!bw}
                    onClick={() => setBw(b => !b)}
                  />
                )}
                {isMobile && modelFile && (
                  <>
                    {!topCluster && <ViewerClusterDivider />}
                    {/* Labelled, not a bare glyph. This is the only way into
                        the scan on a phone — the hero there is a still, and
                        the still has no handler — and the audit found it as an
                        unlabelled 44px cube sitting among the metadata chips,
                        with nothing on the page saying a 3D scan existed at
                        all. The icon stays; the words are what make it an
                        entry point rather than a fourth chip. */}
                    <ViewerClusterButton
                      label="Explore 3D"
                      icon={<ArIcon />}
                      showLabel
                      onClick={() => setOpen3D(true)}
                    />
                  </>
                )}
              </ViewerCluster>
            )}
          </>}
        />
      </div>

      <style>{`
        ${VIEWER_CONTROLS_CSS}
        /* ── Click-to-expand shield ─────────────────────────────────── */
        /* ── Viewer mode ───────────────────────────────────────────────
           Inset and curve of the window. Clamped rather than raw vw: a
           percentage inset eats a far bigger share of a 13" laptop than of a
           27" monitor, at which point it stops reading as a margin and starts
           reading as a border. */
        /* One margin, referenced everywhere it is needed. The frame, the
           viewer controls and the metadata block all sit against it, so they
           cannot drift apart at a viewport size nobody tested — which is how
           the controls previously ended up outside the frame's boundary.
           Separate x and y because the hero is much wider than it is tall. */
        /* One inset on all four sides. It was split into an x from vw and a y
           from vh, which is not an even border: at 1440x900 that is 32px down
           the sides against 16px top and bottom, and the window read as a
           letterbox rather than a mount. A single value tracks width — the
           dimension the hero actually varies in — and clamps at both ends. */
        [data-hero-root]{ --frame-inset: clamp(14px, 2vw, 32px); }
        /* Geometry only — deliberately invisible.
           This carried a translucent wash and a vignette, framing the scan in
           a darkened border. The colour coming up is a strong enough signal
           that the viewer is live, and the wash was competing with it: two
           announcements of the same state change. The element stays because it
           is what "clicking outside the model" is measured against — the
           canvas covers the whole hero, so an element hit test cannot tell
           inside from outside on its own. */
        /* Geometry only — deliberately invisible.
           This carried a translucent wash and a vignette. The colour coming up
           is a strong enough signal that the viewer is live, and the wash was
           competing with it: two announcements of the same state change. The
           element stays because it is what "clicking outside the model" is
           measured against — the canvas covers the whole hero, so an element
           hit test cannot tell inside from outside on its own. */
        .fbs-hero-frame{
          position:absolute; inset:var(--frame-inset); z-index:3;
          pointer-events:none;
        }

        /* The push-in. Same transition in both directions, so exiting reverses
           rather than snapping. */
        .fbs-hero-zoom{
          position:absolute; inset:0;
          transition:transform 1.1s cubic-bezier(.16,.9,.2,1);
        }
        .viewer-active .fbs-hero-zoom{ transform:scale(1.09); }

        /* Revealed by React at the 450ms mark, not by the active class, so the
           controls arrive after the model is already moving and already
           answering a drag. They follow its lead rather than announcing it. */
        /* ── Close ─────────────────────────────────────────────────────
           Alone in the corner, clear of the nav band — it used to sit inside
           the nav's 52px and read as part of that row. Icon only: with the
           instructions moved to the centre there is nothing left for a label
           to pair with, and a lone word beside an × was saying it twice. */
        /* ── Control bar placement ─────────────────────────────────────
           ONE offset for the whole system. Everything inside is flex.

           This replaces four hand-derived expressions — the nav cluster's
           right was content-padding + 34 + 8 + 34 + 8, the colour toggle's
           + 34 + 8, close's content-padding, and each depended on the
           pixel widths of the controls to its right. Adding a control meant
           re-deriving the ones beside it; that is what the tools roadmap could
           not survive. The buttons' own look now comes from
           VIEWER_CONTROLS_CSS, so the hero no longer restates the primitive's
           border, radius, fill, blur, colour or timing. */
        .fbs-hero-bar{
          position:absolute;
          /* TRIAL — moved from top:nav+24 to the bottom band, so the scan is
             bracketed by one row rather than orbited by two groups at
             unrelated corners: notation on the left edge, controls on the
             right, both on the same baseline.

             Carries .contained's geometry rather than a plain right offset.
             The metadata is inside a 1400px max-width container, so past that
             width its right edge stops travelling while a viewport-relative
             offset keeps going — measured at 1440, right:var(--content-padding)
             put the bar 12px outside the edge it is supposed to share.
             Mirroring the container is what makes the two agree at every width
             instead of at the one that happened to be tested.

             Stretched full width and flex-end rather than right-anchored,
             which is why it must not take pointer events: the empty half lies
             over the scan and the viewer is drag-to-rotate. The clusters take
             them back. .fbs-hero-content does the same thing for the same
             reason. */
          bottom:calc(var(--frame-inset) + 14px);
          left:0; right:0;
          max-width:var(--content-max-width);
          margin-inline:auto;
          padding-inline:var(--content-padding);
          justify-content:flex-end;
          pointer-events:none;
          z-index:6;
        }
        .fbs-hero-bar .vc-cluster{ pointer-events:auto; }
        /* Below the breakpoint the header is already logo + nav + toggle, and
           Miles has flagged crowding as a real risk. Desktop and tablet only
           until the phone treatment is designed — deliberately not a guess.
           Hiding the group rather than the bar leaves the scan controls in
           place, which is what the phone actually needs. */
        @media (max-width: 767px){
          .fbs-hero-navgroup{ display:none; }
        }

        /* Exit occupies its slot in BOTH states. It is always laid out; only
           its ink changes. That is what keeps the catalogue nav and the colour
           toggle physically still when the viewer is entered — the cluster is
           an anchored instrument whose available functions change, not a
           toolbar that grows.

           Opacity only. The 6px rise this used to have was a positional
           animation on a control that must not appear to move, and it read as
           the cluster settling rather than a function becoming available.
           inert (on the element itself) keeps it out of the tab order and the
           accessibility tree while it is invisible, so reserving the space
           costs nothing to a keyboard or a screen reader. */
        .fbs-hero-exit{
          display:inline-flex;
          opacity:0;
          transition:opacity 140ms ease;
        }
        .fbs-hero-exit.is-shown{ opacity:1; }
        @media (prefers-reduced-motion: reduce){
          .fbs-hero-exit{ transition-duration:.01ms; }
        }

        /* ── Centered instructions ─────────────────────────────────────
           Same box as the hover prompt, so they occupy the spot it just left
           rather than appearing somewhere new; same upward entrance, so the
           handover reads as one movement. No plate — see the note in the JSX. */
        /* Positioning and motion only — the pill itself comes from .fbs-cta on
           the span inside. */
        .fbs-hero-instructions{
          position:absolute; inset:0; z-index:6; pointer-events:none;
          display:flex; align-items:center; justify-content:center;
          padding-bottom:14vh; white-space:nowrap;
          opacity:0; transform:translateY(6px);
          transition:opacity 180ms ease, transform 180ms ease;
        }
        .fbs-hero-instructions.is-shown{ opacity:1; transform:none; }
        @media (prefers-reduced-motion: reduce){
          .fbs-hero-instructions{ transition-duration:.01ms; }
        }

        .fbs-expand{
          box-sizing:border-box; cursor:pointer;
          position:absolute; inset:0; z-index:3;
          /* Centred on the scan, above the metadata band so the two never
             stack on top of each other. */
          display:flex; align-items:center; justify-content:center;
          padding-bottom:14vh;
        }
        /* Shown by a dwell timer, not by :hover — the prompt should answer a
           pointer that has come to rest, not one passing through. Two exit
           speeds, and they mean different things: leaving is 140ms, clicking
           is 110ms and reads as the input being taken rather than the hover
           ending. */
        .fbs-expand.is-inert{ pointer-events:none; }
        /* Still swallows the tap — a click on a scan that is not ready should do
           nothing, not fall through to whatever is underneath — but stops
           advertising itself as pressable. */
        .fbs-expand.is-waiting{ cursor:default; }
        .fbs-cta--status{ cursor:default; pointer-events:none; }
        /* One child in every state, so nothing here can move the plate
           vertically between them. The column layout and its 8px gap existed
           only for the eyebrow; both went with it. */
        .fbs-expand-cta{
          display:flex;
          opacity:0; transform:translateY(6px);
          transition:opacity 180ms ease, transform 180ms ease;
        }
        .fbs-expand-cta.is-shown{ opacity:1; transform:none; }
        .fbs-expand-cta[data-exit="hover"]:not(.is-shown){ transition-duration:140ms; }
        .fbs-expand-cta[data-exit="click"]:not(.is-shown){ transition-duration:110ms; }
        .fbs-expand:focus-within .fbs-expand-cta{ opacity:1; transform:none; }
        /* Keyboard focus keeps the accent ring. That is not the hover cue
           coming back: focus has to be visibly located, and there is no
           pointer under it to imply where it is. */
        .fbs-expand:focus-visible{ box-shadow:inset 0 0 0 2px var(--accent); }

        /* Hover lift. The cue is on the scan itself, not on a border drawn
           around it — an accent ring read as a validation state and put the
           one colour on the page somewhere nothing had happened yet.
           :has() because the shield follows the media in the DOM (it has to,
           to sit over the canvas) and CSS siblings only select forwards.
           No drop shadow: the handover pairs the lift with one, but this hero
           is full-bleed and clips to its own edges, so an outer shadow would
           have no gap to fall into and nothing to fall onto. The scale is the
           whole lift here. */
        [data-hero-root]:has(.fbs-expand:hover) .fbs-hero-media{ transform:scale(1.012); }
        .fbs-hero-media{ transition:transform .25s ease; }
        @media (prefers-reduced-motion: reduce){
          .fbs-hero-media, .fbs-hero-zoom, .fbs-hero-frame{ transition-duration:.01ms; }
          [data-hero-root]:has(.fbs-expand:hover) .fbs-hero-media{ transform:none; }
          /* The push-in is the interaction's whole motion, so it is reduced
             rather than removed — without it nothing marks the state change. */
          .viewer-active .fbs-hero-zoom{ transform:scale(1.02); }
        }

        /* Hover only — this is a discoverability cue, not a state. On touch
           there is no hover and the mobile button covers that path already. */


        @media (prefers-reduced-motion: reduce){
          .fbs-expand-cta{ transition-duration:.01ms; }
        }

        /* The content layer is pointer-transparent (see above) — only the
           things you can actually click take events back. Everything else
           lets the drag through to the canvas underneath. */
        .fbs-hero-content .fbs-field-tag,
        .fbs-hero-content .fbs-hm-right { pointer-events: auto; }
      `}</style>
    </div>

    </div>
    </>
  );
}
