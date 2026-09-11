"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import HeroNavOverlay from "./HeroNavOverlay";
import ParkHeroViewer from "./ParkHeroViewer";
import { ParkGlanceHeroOverlay, type ParkGlance } from "./ParkFacts";
import ParkWeather from "./ParkWeather";
import ParkViewerModal from "./ParkViewerModal";
import ParkHeroDetails from "./ParkHeroDetails";
import ParkReturnLink from "./ParkReturnLink";
import {
  BwIcon, ArIcon, ExitIcon, OrbitIcon, PrevIcon, NextIcon,
  ViewerControlBar, ViewerCluster, ViewerClusterButton, ViewerClusterDivider, ViewerReadout,
  VIEWER_CONTROLS_CSS,
} from "./ViewerControls";
import { markParkNavDirection } from "@/lib/view-transitions";
import { carryDirectoryOrigin } from "./parksGridState";
import { catalogueIndexLabel } from "@/lib/catalogue";
import { lockPageScroll } from "@/lib/scrollLock";
import CTAButton from "./CTAButton";
import type { CameraBounds } from "@/lib/heroCamera";

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
  autoRotate?: boolean;
  /** Per-park orbit window for an ENCLOSED park — Southbank's undercroft, and
   *  whatever interior is scanned next. Null/undefined outdoors, where nothing
   *  changes. One pair of numbers governs both the manual drag clamp and the
   *  range the automatic rotation plays within; see CameraBounds. */
  cameraBounds?: CameraBounds | null;
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
  /** See lib/parkArea. Threaded through to both the hero details row and the
   *  viewer modal so the two never disagree about where a park is. */
  area?: string | null;
  borough?: string | null;
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
  cameraPos, cameraTarget, modelRotation, autoRotate, debug, viewerOverlay, cameraBounds,
  ambientIntensity, directionalIntensity, environmentPreset, environmentIntensity,
  slug, catalogueId, catalogueTotal, prevPark, nextPark, name, address, area, borough, location, postcode, lat, lng, opened, scanned,
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
  //
  // FALSE, and it starts false for the whole life of the page until someone
  // activates the viewer. This used to be `true`, which is what made the scan
  // turn on its own the moment the GLB landed — before there was any way to
  // stop it, and whether or not the reader had asked for a live model. The
  // three things that are allowed to write this are: activation (openViewer),
  // the orbit toggle, and anything that stops it. Nothing starts it on a
  // timer, on load, or on exit.
  const [spinning, setSpinning] = useState(false);
  // Rotation is motion, and motion is opt-out. Same signal the rest of the
  // site reads (FoundObject, Reveal, RandomPark), watched live rather than
  // sampled once so a mid-visit change to the OS setting is honoured.
  const [reduced, setReduced] = useState(false);
  const [canRotate, setCanRotate] = useState(false);
  const [canZoom, setCanZoom] = useState(false);
  const [controlsShown, setControlsShown] = useState(false);
  // The centered instructions. They no longer collapse to a quieter state —
  // once the visitor has moved the model they go entirely.
  const [instructionsShown, setInstructionsShown] = useState(false);
  // Guards the entrance against a second click landing mid-sequence.
  const [busy, setBusy] = useState(false);
  // Pointer capability is no longer asked in JS. It existed to decide whether
  // the entry affordance was dwell-gated (fine) or resident (coarse); the
  // status/action area is resident on every pointer now, and the one place the
  // answer still matters — 44px targets on the viewer controls — is a
  // `(pointer: coarse)` media query in VIEWER_CONTROLS_CSS, which needs no
  // React state and cannot disagree with the layout it is sizing.
  // What the scan is actually doing, reported by the viewer itself rather than
  // assumed. The entry affordance used to promise "Click to explore" from the
  // first paint, while the GLB was still downloading — so a reader could be
  // invited into a viewer that had nothing in it yet, and on a failed scan the
  // invitation never withdrew at all.
  //
  // "Ready" is now reported when the scene AND its controls are live, not when
  // the download resolves — see ReadyGate in ParkModel. A failure never
  // reaches "ready", so the CTA cannot appear over a dead scan.
  const [scanState, setScanState] = useState<"loading" | "ready" | "failed">("loading");
  const onScanReady = useCallback(() => setScanState("ready"), []);
  const onScanFailed = useCallback(() => setScanState("failed"), []);
  // The dwell-gated hover prompt is gone. The status/action area is one box
  // holding one of three labels — LOADING PARK… / EXPLORE 3D / DRAG TO ROTATE
  // — and a box that reports two of its states outright and hides the third
  // behind a 300ms hover was not one object changing its text, it was a status
  // plate that blinked out and a button that had to be found. What the dwell
  // was protecting (a quiet hero) is now the treatment's job, not the
  // timer's.
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
    interactedRef.current = false;

    setViewerActive(true);
    // THE ONE PLACE ROTATION BEGINS. Not on load, not on a timer, not on exit
    // — as a direct consequence of this click, its keyboard equivalent, or the
    // orbit toggle, and nowhere else. Under reduced motion the viewer still
    // opens and everything still works; it simply opens paused, and the toggle
    // is there for anyone who wants it anyway.
    setSpinning(!reduced);

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
  }, [busy, viewerActive, scanState, reduced, clearTimers, after]);

  // ── Exit ──────────────────────────────────────────────────────────────
  // Interaction is withdrawn at once so there is no half-live window, then
  // colour comes back over the top of the zoom-out. Nothing re-homes the
  // camera: the scan stays at the angle it was left at.
  //
  // Rotation is stopped and stays stopped. It used to be handed back 350ms
  // after the exit, which meant leaving the viewer started the model turning
  // again — the same bug as starting it on load, at the other end of the
  // sequence. Exiting returns the hero to Ready, and Ready is still.
  const closeViewer = useCallback(() => {
    clearTimers();
    if (collapseRef.current) clearTimeout(collapseRef.current);
    setCanRotate(false);
    setCanZoom(false);
    setControlsShown(false);
    setInstructionsShown(false);
    setViewerActive(false);
    setBusy(false);
    setSpinning(false);
    interactedRef.current = false;

    after(100, () => setBw(true));
  }, [clearTimers, after]);

  // ── Contact stops the rotation; a drag stands the instruction down ────
  // Two different events, deliberately. Every contact — tap, drag, pinch,
  // wheel — takes the rotation off the visitor's hands and leaves it off; only
  // an actual rotation of the model retires the instruction that was asking
  // for one. A tap does the first and not the second.
  //
  // Nothing latches handleInteract: a second tap after a toggle press has to
  // stop the rotation again.
  const handleInteract = useCallback(() => {
    setSpinning(false);
  }, []);

  const handleDrag = useCallback(() => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    markInstructionsSeen();
    collapseRef.current = setTimeout(() => setInstructionsShown(false), 600);
  }, []);

  // The only way rotation ever starts again. Pressing it while paused starts
  // it under reduced motion too — the preference sets the default, it does not
  // withhold the control.
  const toggleSpin = useCallback(() => setSpinning(s => !s), []);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
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
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
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
  // What the status/action area is saying right now. One box, one label, and
  // this is the only thing that decides which — no pointer type, no dwell, no
  // timer. `coarse` no longer reaches the status area at all; it is still read
  // for the mobile branches below.
  const status: "loading" | "ready" | "active" | "failed" =
    viewerActive ? "active"
    : scanState === "ready" ? "ready"
    : scanState === "failed" ? "failed"
    : "loading";

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
        area={area}
        borough={borough}
        postcode={postcode}
        lat={lat}
        lng={lng}
        scanned={scanned}
        preloadImageUrl={preloadImageUrl}
        cameraPos={cameraPos}
        cameraTarget={cameraTarget}
        modelRotation={modelRotation}
        autoRotate={autoRotate}
        cameraBounds={cameraBounds}
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
        /* The homepage hero's frame, shared — see --frame-height. This was
           78vh, which sized the viewer off the window's height while the hero
           was sized off its width, so the two disagreed by 75px at 1453x941 and
           moved opposite ways as the window changed shape. The token is the
           hero's own rule, so the viewer now matches the frame you arrived
           from rather than the hero being enlarged to match the viewer.
           Fullscreen is untouched: that is the modal's own sizing.
           340px stays as this page's floor. */
        height: "var(--frame-height)",
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
            autoRotate={autoRotate}
            cameraBounds={cameraBounds}
            stopOnInteract
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
            onDrag={handleDrag}
            // The status plate below already says the scan is loading, in the
            // same box that becomes EXPLORE 3D. ParkModel's own preload note
            // was printing a second "LOADING SCAN..." a few hundred pixels
            // under it - one wait, two labels, two registers. The full-screen
            // viewer keeps its note; it has no plate of its own.
            showLoadingNote={false}
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
          A transparent layer over the canvas. It is what makes the scroll fix
          free: OrbitControls binds its wheel and pointer listeners to the
          canvas element itself, and events landing on this layer never reach
          it, so the inline view stops zooming and orbiting without a single
          conditional inside ParkModel. Nothing here listens for `wheel`, so
          the browser scrolls the page exactly as it would over an image.

          Empty now. The CTA used to live inside it; it has moved to the
          status/action area below, which is one box across all three states
          rather than a button in the shield and an instruction somewhere else.
          The shield is still the whole-hero click target — the status area
          sits over it and is pointer-transparent apart from the button itself,
          so a click anywhere on the scan still activates.

          Unmounted rather than made inert once the viewer is live: there is no
          fade left to wait for now that it carries nothing.

          z-index 3 puts it over the scrim (2) and under the hero copy (5). */}
      {viewerOverlay && modelFile && !isMobile && !viewerActive && (
        <div
          aria-hidden
          className={`fbs-expand${scanState !== "ready" ? " is-waiting" : ""}`}
          onClick={openViewer}
        />
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
                  // The way back travels with you — see carryDirectoryOrigin.
                  onClick={() => {
                    markParkNavDirection("prev");
                    carryDirectoryOrigin(slug, prevPark.slug);
                  }}
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
                  onClick={() => {
                    markParkNavDirection("next");
                    carryDirectoryOrigin(slug, nextPark.slug);
                  }}
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
              {/* ── Automatic rotation ──────────────────────────────────
                  A real toggle, not a readout: its state is the model's actual
                  rotation state, and it is the ONLY thing that can start the
                  rotation again once anything has stopped it. Touching the
                  model drops it to paused (handleInteract), and nothing —
                  release, timeout, pointer-leave — puts it back.

                  Here rather than in the status/action area because it is a
                  control over the view, which is what this cluster is for, and
                  it has to be reachable for as long as the viewer is live
                  rather than only while an instruction is showing.

                  Icon carries the state and the label carries the action, the
                  same split the colour toggle uses. The glyph changes shape
                  between states, so the accent `active` draws is confirmation
                  rather than the only difference. Target size and focus ring
                  come from .vc-btn — 44x44 on a coarse pointer, accent ring on
                  focus — so this control has both without asking for them. */}
              <span className={`fbs-hero-livetool${controlsShown ? " is-shown" : ""}`} inert={!controlsShown}>
                <ViewerClusterButton
                  label={spinning ? "Pause automatic rotation" : "Start automatic rotation"}
                  icon={<OrbitIcon rotating={spinning} />}
                  active={spinning}
                  onClick={toggleSpin}
                />
              </span>
              {/* Exit keeps its slot whether or not it is showing, so the
                  controls beside it do not shift when it fades in — the same
                  reason the old colour toggle reserved this space by hand.
                  `inert` takes it out of the tab order and the a11y tree while
                  it is invisible, which the fade alone would not.

                  Unchanged by this pass: same corner, same glyph, same action.
                  The orbit toggle is a control beside it, never a replacement
                  for it.

                  Never `active`: exit must stay outside the accent vocabulary
                  the interpretive tools will use for their on-state, or it
                  reads as one more layer you can switch. */}
              <span className={`fbs-hero-livetool${controlsShown ? " is-shown" : ""}`} inert={!controlsShown}>
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


      {/* ── Status / action area ───────────────────────────────────────────
          ONE box, four labels, one position. LOADING PARK… becomes EXPLORE 3D
          becomes DRAG TO ROTATE in place — the same plate changing its text,
          not a status disappearing and a button arriving somewhere else. It
          replaces two elements that happened to be centred at the same
          padding-bottom and were kept in step by hand.

          Pointer-transparent apart from the CTA, so once the viewer is live a
          drag across the middle of the hero reaches the model through it. */}
      {topCluster && (
        <div className="fbs-hero-status">
          <span className="fbs-hero-status__box">
            {/* Width reservation, never drawn. The labels are different
                lengths and the box is centred, so without this it would resize
                about its own centre at exactly the moments the eye is on it —
                the scan becoming ready, and the CTA becoming the instruction.
                This carries the longest label through every state and
                reproduces the plate's horizontal metrics around it (16px each
                side, the 7px gap and the 9px caret the CTA adds), so the box
                is sized by the widest state by construction rather than by a
                measured constant that goes stale the next time a label is
                reworded. */}
            <span className="fbs-hero-status__sizer" aria-hidden="true">3D scan unavailable</span>

            {status === "ready" && (
              /* The site's primary CTA, unmodified — same component as VIEW
                 SCAN and EXPLORE. No stroke and no blur: this is the one state
                 here that is an offer rather than a report, and it takes the
                 orange plate plainly. A <button>, so Enter and Space activate
                 it without anything being added here. */
              <CTAButton label="Explore 3D" variant="accent" onClick={openViewer} />
            )}

            {(status === "loading" || status === "failed") && (
              /* Quiet, and not focusable — a report, not a control. Flat
                 plate: no outline, no backdrop blur, no text shadow. */
              <span className="fbs-hero-status__plate is-shown" role="status">
                {status === "loading" ? "Loading park…" : "3D scan unavailable"}
              </span>
            )}

            {status === "active" && (
              /* One wording on every device. "Drag to rotate · Scroll to zoom"
                 / "· Pinch to zoom" split one state into two vocabularies and
                 spent the width saying what the second gesture does before
                 anyone has tried the first.

                 It stays up until the model is actually rotated — see
                 handleDrag, and ParkModel for what counts. A tap stops the
                 rotation without retiring the instruction, which is the point:
                 the instruction is still true. */
              <span
                className={`fbs-hero-status__plate${instructionsShown ? " is-shown" : ""}`}
                role="status"
                aria-hidden={!instructionsShown}
              >
                Drag to rotate
              </span>
            )}
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
      <div className="fbs-hero-scrim" aria-hidden />

      {/* ── Scan controls, top-right ──────────────────────────────────────
          Colour and Explore 3D as one group, because they are one subject:
          both change how the park's scan is presented. They were at the foot
          of the hero among the address and the scan date, which put an action
          in a row of statements and left the bottom-left group carrying two
          jobs.

          Only on the sheet-layout breakpoints. Desktop already has its corner
          cluster in the viewer bar (topCluster) and the brief for this pass is
          mobile — rearranging a desktop that nobody has reviewed would be
          changing something that is not being asked about. */}
      {isMobile && (!topCluster || modelFile) && (
        <div className="fbs-hero-scan">
          <ViewerCluster variant="joined" label="Scan controls">
            <ViewerClusterButton
              label={bw ? "Show the scan in colour" : "Show the scan in black and white"}
              icon={<BwIcon filled={!bw} />}
              active={!bw}
              onClick={() => setBw(b => !b)}
            />
            {modelFile && (
              <>
                <ViewerClusterDivider />
                {/* Labelled, not a bare glyph. This is the only way into the
                    scan on a phone — the hero there is a still, and the still
                    has no handler — and an audit once found it as an
                    unlabelled 44px cube sitting among the metadata chips, with
                    nothing on the page saying a 3D scan existed at all. */}
                <ViewerClusterButton
                  label="Explore 3D"
                  icon={<ArIcon />}
                  showLabel
                  onClick={() => setOpen3D(true)}
                />
              </>
            )}
          </ViewerCluster>
        </div>
      )}

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
          area={area}
          borough={borough}
          postcode={postcode}
          lat={lat}
          lng={lng}
          scanned={scanned}
          slug={slug}
          // The way back, in the park's own identity group rather than in a
          // row of its own above the hero. See ParkReturnLink for why it is
          // here at all and what decides its label.
          leadSlot={<ParkReturnLink slug={slug} hasCoords={hasCoords} />}
          rightSlot={<>
            {hasCoords && (
              <div className="fbs-cond-mobile">
                <ParkWeather lat={lat!} lng={lng!} />
              </div>
            )}

            {/* The scan controls used to sit here, among the metadata. They
                are image controls, not metadata, and they now live in the
                hero's top-right corner — see .fbs-hero-scan below. What is
                left in this slot is the weather, which is a fact about the
                park like the chips beside it. */}
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

        /* The live tools — automatic rotation, then exit — occupy their slots
           in BOTH states. They are always laid out; only their ink changes. That is what keeps the catalogue nav and the colour
           toggle physically still when the viewer is entered — the cluster is
           an anchored instrument whose available functions change, not a
           toolbar that grows.

           Opacity only. The 6px rise this used to have was a positional
           animation on a control that must not appear to move, and it read as
           the cluster settling rather than a function becoming available.
           inert (on the element itself) keeps it out of the tab order and the
           accessibility tree while it is invisible, so reserving the space
           costs nothing to a keyboard or a screen reader. */
        .fbs-hero-livetool{
          display:inline-flex;
          opacity:0;
          transition:opacity 140ms ease;
        }
        .fbs-hero-livetool.is-shown{ opacity:1; }
        @media (prefers-reduced-motion: reduce){
          .fbs-hero-livetool{ transition-duration:.01ms; }
        }

        .fbs-expand{
          box-sizing:border-box; cursor:pointer;
          position:absolute; inset:0; z-index:3;
        }
        /* Still swallows the tap — a click on a scan that is not ready should do
           nothing, not fall through to whatever is underneath — but stops
           advertising itself as pressable. */
        .fbs-expand.is-waiting{ cursor:default; }

        /* ── Status / action area ──────────────────────────────────────
           The one box that carries LOADING PARK… / EXPLORE 3D / DRAG TO
           ROTATE. Positioned exactly where the old prompt and instructions
           both sat, so nothing on screen has moved.

           Pointer-transparent. Only the CTA inside it takes events back, and
           only while it exists — everything else lets a drag through to the
           canvas underneath. */
        .fbs-hero-status{
          position:absolute; inset:0; z-index:6; pointer-events:none;
          display:flex; align-items:center; justify-content:center;
          padding-bottom:14vh; white-space:nowrap;
        }
        /* Grid rather than flex so the sizer and the live label occupy the
           SAME cell: the sizer sets the width, the label fills it, and neither
           is offset by the other. This is what holds the box still across
           every state. */
        .fbs-hero-status__box{
          display:grid; justify-items:center; align-items:center;
        }
        .fbs-hero-status__box > *{ grid-area:1/1; }
        /* Reproduces the CTA's horizontal box around the longest label. Hidden
           with visibility, not display, because a display:none element has no
           width to lend. */
        .fbs-hero-status__sizer{
          visibility:hidden; pointer-events:none;
          font-family:var(--font-mono); font-size:11px; font-weight:500;
          letter-spacing:.5px; text-transform:uppercase; line-height:1.5;
          white-space:nowrap;
          padding:7px 16px; border:1px solid transparent;
          /* The caret's slot and the gap before it. */
          padding-right:calc(16px + 7px + 9px);
        }
        /* Fills the width the sizer reserved, with the label centred in it. */
        .fbs-hero-status .fbs-cta{
          width:100%; justify-content:center; pointer-events:auto;
        }
        /* ── The passive states ────────────────────────────────────────
           Metrics copied from .fbs-cta exactly — same padding, size, weight,
           tracking and line-height — so the box cannot change height when the
           label changes. What is NOT copied is the ghost variant's 1px outline
           and 6px backdrop blur, which this used to borrow: a plate that is
           only reporting does not need a stroke to be read, the blur was the
           one piece of glass in a hero built out of flat surfaces, and the
           three states disagreeing about whether they had a border was the
           inconsistency. No text-shadow, per the standing rule in
           app/colors_and_type.css. */
        .fbs-hero-status__plate{
          display:inline-flex; align-items:center; justify-content:center;
          width:100%;
          padding:7px 16px;
          border:none; border-radius:3px;
          background:rgba(20,18,15,0.58);
          color:rgba(255,255,255,0.88);
          font-family:var(--font-mono); font-size:11px; font-weight:500;
          letter-spacing:.5px; text-transform:uppercase; line-height:1.5;
          white-space:nowrap;
          cursor:default; pointer-events:none;
          opacity:0; transition:opacity 180ms ease;
        }
        .fbs-hero-status__plate.is-shown{ opacity:1; }
        @media (prefers-reduced-motion: reduce){
          .fbs-hero-status__plate{ transition-duration:.01ms; }
        }

        /* Hover lift. The cue is on the scan itself, not on a border drawn
           around it — an accent ring read as a validation state and put the
           one colour on the page somewhere nothing had happened yet.
           :has() because the shield follows the media in the DOM (it has to,
           to sit over the canvas) and CSS siblings only select forwards.
           No drop shadow: the handover pairs the lift with one, but this hero
           is full-bleed and clips to its own edges, so an outer shadow would
           have no gap to fall into and nothing to fall onto. The scale is the
           whole lift here. */
        /* Two selectors, one cue. The CTA is no longer a child of the shield
           — it sits in the status area above it — so hovering the button is
           not a hover on .fbs-expand and the lift would drop out exactly where
           the pointer is most likely to be. */
        [data-hero-root]:has(.fbs-expand:hover) .fbs-hero-media,
        [data-hero-root]:has(.fbs-hero-status .fbs-cta:hover) .fbs-hero-media{ transform:scale(1.012); }
        .fbs-hero-media{ transition:transform .25s ease; }
        @media (prefers-reduced-motion: reduce){
          .fbs-hero-media, .fbs-hero-zoom, .fbs-hero-frame{ transition-duration:.01ms; }
          [data-hero-root]:has(.fbs-expand:hover) .fbs-hero-media,
          [data-hero-root]:has(.fbs-hero-status .fbs-cta:hover) .fbs-hero-media{ transform:none; }
          /* The push-in is the interaction's whole motion, so it is reduced
             rather than removed — without it nothing marks the state change. */
          .viewer-active .fbs-hero-zoom{ transform:scale(1.02); }
        }

        /* The content layer is pointer-transparent (see above) — only the
           things you can actually click take events back. Everything else
           lets the drag through to the canvas underneath. */
        .fbs-hero-content .fbs-field-tag,
        .fbs-hero-content .fbs-hero-lead,
        .fbs-hero-content .fbs-hm-right { pointer-events: auto; }

        /* ── Bottom scrim ──────────────────────────────────────────────────
           One gradient under the whole bottom-left group rather than a plate
           behind each part of it. The title carries itself on size and the
           metadata chips have their own dark backings, but the return link is
           11px of white on whatever this park's scan happens to be — and these
           scans are greyscale, several of them pale concrete corner to corner.
           A shadow alone left it sitting in the image rather than on it.

           Sized to the copy, not to the hero: it reaches 42% up, which is past
           the tallest the group gets, and it is transparent above that, so the
           scan itself is untouched in the part of the frame anyone is looking
           at. z-index 2 is the slot the hero's own comments already reserved
           for a scrim, between the media at 0 and the copy at 5. Pointer
           transparent, so drags still reach the model through it. */
        .fbs-hero-scrim{
          position:absolute; left:0; right:0; bottom:0; height:42%;
          z-index:2; pointer-events:none;
          background:linear-gradient(to top,
            rgba(0,0,0,.52) 0%, rgba(0,0,0,.30) 22%, rgba(0,0,0,0) 100%);
        }

        /* ── Scan controls, top-right ──────────────────────────────────────
           Cleared of the site header, not just of the hero's own frame. The
           hero is pulled up under the fixed nav, so its top is the nav's
           bottom — and the logo hangs *below* the bar, to --logo-bottom. The
           frame inset alone would have put this cluster under the mark. Same
           pair the return link and the directory bar measure from.

           Right edge on --frame-inset so it lines up with the hero's own
           margin rather than with the text column, which is where the eye
           reads a corner control against. */
        .fbs-hero-scan{
          position:absolute; z-index:5;
          /* Measured from the viewport's top, not from the nav's bottom: the
             hero is pulled all the way up so that its own top *is* y=0, and
             subtracting the nav height put this cluster at y=27 — inside the
             bar, under the PARKS link. --logo-bottom is the lowest the header
             reaches (the mark hangs below the bar), so clearing that clears
             both. */
          top:calc(var(--logo-bottom, 81px) + 14px);
          right:var(--frame-inset);
          /* The hero band it sits in is pointer-transparent; opt back in. */
          pointer-events:auto;
        }
        /* Never wider than half the hero, so a long label cannot reach across
           and sit over the park name on a narrow phone. */
        .fbs-hero-scan .vc-cluster{ max-width:min(62vw, 320px); }
      `}</style>
    </div>

    </div>
    </>
  );
}
