"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import HeroNavOverlay from "./HeroNavOverlay";
import ParkHeroViewer from "./ParkHeroViewer";
import { ParkGlanceHeroOverlay, type ParkGlance } from "./ParkFacts";
import ParkWeather from "./ParkWeather";
import ParkViewerModal from "./ParkViewerModal";
import ParkHeroDetails from "./ParkHeroDetails";
import { BwIcon, ArIcon, ViewerCluster, ViewerClusterDivider, ViewerClusterButton } from "./ViewerControls";
import Link from "next/link";
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
  modelFileLow?: string;
  modelFileMobile?: string;
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
  /** Size of the published catalogue — the index badge's "/11". */
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
  modelFile, modelFileLow, modelFileMobile, heroImage, preloadImageUrl,
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
  }, [busy, viewerActive, clearTimers, after]);

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
    if (dwellRef.current) clearTimeout(dwellRef.current);
    dwellRef.current = setTimeout(() => {
      setPromptExit("hover");
      setPromptShown(true);
    }, 300);
  }, [viewerActive, promptShown]);
  const disarmPrompt = useCallback(() => {
    if (dwellRef.current) clearTimeout(dwellRef.current);
    setPromptExit("hover");
    setPromptShown(false);
  }, []);

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

  return (
    <>
    {open3D && modelFile && (
      <ParkViewerModal
        modelFile={modelFile}
        modelFileMobile={modelFileMobile}
        parkName={name}
        onClose={() => setOpen3D(false)}
        // Always the mobile full-screen treatment now. Desktop no longer hands
        // off to a separate screen at all — the hero becomes the viewer in
        // place, so the only thing that still opens this is the mobile
        // "explore in 3D" button. The modal's "takeover" variant is left in
        // the component but is no longer reachable from here.
        variant="fullscreen"
        catalogueId={catalogueId}
        catalogueTotal={catalogueTotal}
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
            modelFileLow={modelFileLow}
            modelFileMobile={modelFileMobile}
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
          className={`fbs-expand${viewerActive ? " is-inert" : ""}`}
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
          <span className={`fbs-expand-cta${promptShown ? " is-shown" : ""}`} data-exit={promptExit}>
            <CTAButton
              label="Click to explore"
              variant="ghost"
              onClick={openViewer}
            />
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

      {/* ── Viewer-mode controls ───────────────────────────────────────────
          Top-right, the corner the idle hint already uses, so entering viewer
          mode swaps the content of that corner instead of moving anything.
          Deliberately the opposite end of the hero from the metadata block. */}
      {/* ── Catalogue nav cluster ──────────────────────────────────────────
          Prev / index / next, in the header's utility row immediately left of
          the colour toggle. Navigation lived in the hero title through five
          rejected treatments; as functional chrome sitting with the other
          controls it stops competing with the park name entirely.

          Rendered whenever there are neighbours, not gated on topCluster the
          way the viewer chrome is: moving through the catalogue has nothing to
          do with whether this park has a scan to look at. The cluster shifts
          right into the freed space when that chrome is absent. */}
      {(prevPark || nextPark) && (
        <div
          className={`fbs-hero-nav${topCluster ? "" : " fbs-hero-nav--alone"}`}
          data-hero-chrome
        >
          {prevPark && (
            <Link
              href={`/parks/${prevPark.slug}`}
              className="fbs-hero-nav-btn"
              aria-label={`Previous park: ${prevPark.name}`}
              onClick={() => markParkNavDirection("prev")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 12H4" /><path d="M10 6l-6 6 6 6" />
              </svg>
            </Link>
          )}
          {indexLabel && <span className="fbs-hero-nav-idx">{indexLabel}</span>}
          {nextPark && (
            <Link
              href={`/parks/${nextPark.slug}`}
              className="fbs-hero-nav-btn"
              aria-label={`Next park: ${nextPark.name}`}
              onClick={() => markParkNavDirection("next")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 12h16" /><path d="M14 6l6 6-6 6" />
              </svg>
            </Link>
          )}
        </div>
      )}

      {/* ── Colour toggle ──────────────────────────────────────────────────
          Top-right, immediately left of Close, and independent of it: a way of
          looking at the scan rather than a viewer control, so it is present
          and unchanged in both states while Close fades. Its offset reserves
          Close's slot rather than sitting beside it in a flow, which is what
          keeps it still when Close arrives and leaves. */}
      {topCluster && (
        <button
          type="button"
          data-hero-chrome
          className="fbs-hero-bw"
          onClick={() => setBw(b => !b)}
          title={bw ? "Show colour" : "Show B&W"}
          aria-label={bw ? "Show the scan in colour" : "Show the scan in black and white"}
        >
          <BwIcon filled={!bw} />
        </button>
      )}

      {/* ── Close ──────────────────────────────────────────────────────────
          Top-right, on its own, icon only. It was briefly grouped with the
          instructions and the colour toggle; that cluster read as
          disconnected and left the toggle looking widowed beside controls it
          has nothing to do with. The three are independent elements now. */}
      {topCluster && (
        <button
          type="button"
          data-hero-chrome
          className={`fbs-hero-close${controlsShown ? " is-shown" : ""}`}
          onClick={closeViewer}
          aria-hidden={!controlsShown}
          tabIndex={controlsShown ? 0 : -1}
          aria-label="Exit 3D view"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
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
          <span className="fbs-cta fbs-cta--ghost">Drag to rotate · Scroll to zoom</span>
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
          catalogueTotal={catalogueTotal}
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
              <ViewerCluster>
                {!topCluster && (
                  <ViewerClusterButton
                    onClick={() => setBw(b => !b)}
                    title={bw ? "Show colour" : "Show B&W"}
                    active={!bw}
                  >
                    <BwIcon filled={!bw} />
                  </ViewerClusterButton>
                )}
                {isMobile && modelFile && (
                  <>
                    {!topCluster && <ViewerClusterDivider />}
                    <ViewerClusterButton onClick={() => setOpen3D(true)} title="Explore in 3D">
                      <ArIcon />
                    </ViewerClusterButton>
                  </>
                )}
              </ViewerCluster>
            )}
          </>}
        />
      </div>

      <style>{`
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
        /* Shared chrome for the two corner buttons — one box, so they read as
           a pair without being grouped into a cluster. --hero-btn is the slot
           width the colour toggle offsets itself by. */
        /* The utility-button look, in one place. Split out from the placement
           below so the catalogue nav can be the same object as the colour
           toggle rather than a copy of its values — same border, radius, fill,
           blur, colour and timing by construction. */
        .fbs-hero-close, .fbs-hero-bw, .fbs-hero-nav-btn, .fbs-hero-nav-idx{
          --hero-btn:34px;
          appearance:none; -webkit-appearance:none; margin:0;
          display:inline-flex; align-items:center; justify-content:center;
          height:var(--hero-btn); padding:0;
          border:1px solid rgba(255,255,255,0.34); border-radius:3px;
          background:rgba(20,18,15,0.66);
          backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
          color:rgba(255,255,255,0.88);
          transition:color .18s ease, border-color .18s ease, background-color .18s ease;
        }
        .fbs-hero-close, .fbs-hero-bw{
          position:absolute;
          top:calc(var(--nav-height, 44px) + 24px);
          z-index:6;
          width:var(--hero-btn);
          cursor:pointer;
        }
        /* Sits left of the colour toggle, which itself reserves Close's slot:
           content-padding + close(34) + 8 + bw(34) + 8. Written out rather
           than magic-numbered so moving any one of them stays traceable. */
        .fbs-hero-nav{
          position:absolute;
          top:calc(var(--nav-height, 44px) + 24px);
          right:calc(var(--content-padding) + 34px + 8px + 34px + 8px);
          z-index:6;
          display:flex; align-items:center; gap:6px;
        }
        /* With no viewer chrome there is nothing to sit left of, so the cluster
           takes the row's end itself. */
        .fbs-hero-nav--alone{ right:var(--content-padding); }
        .fbs-hero-nav-btn{ width:var(--hero-btn); cursor:pointer; text-decoration:none; }
        .fbs-hero-nav-btn svg{ width:15px; height:15px; display:block; }
        /* The index is the same plate, only wider — it is a readout, not a
           button, so it takes no hover and no pointer. */
        .fbs-hero-nav-idx{
          padding:0 10px;
          font-family:var(--font-mono);
          font-size:11px; font-weight:500; letter-spacing:.08em;
          white-space:nowrap;
          cursor:default;
        }
        /* Below the breakpoint the header is already logo + nav + toggle, and
           Miles has flagged crowding as a real risk. Desktop-only until the
           mobile treatment is designed — deliberately not a guess. */
        @media (max-width: 767px){
          .fbs-hero-nav{ display:none; }
        }
        /* Reserves Close's slot rather than flowing beside it, so it does not
           shift when Close fades in and out. */
        .fbs-hero-bw{ right:calc(var(--content-padding) + 34px + 8px); }
        .fbs-hero-bw svg{ width:15px; height:15px; display:block; }
        @media (hover: hover){
          .fbs-hero-bw:hover, .fbs-hero-nav-btn:hover{ color:#14120f; background:#fff; border-color:#fff; }
        }
        .fbs-hero-bw:focus-visible, .fbs-hero-nav-btn:focus-visible{ outline:2px solid var(--accent); outline-offset:2px; }

        .fbs-hero-close{
          right:var(--content-padding);
          opacity:0; transform:translateY(-6px); pointer-events:none;
          transition:opacity 180ms ease, transform 180ms ease,
                     color .18s ease, border-color .18s ease, background-color .18s ease;
        }
        .fbs-hero-close.is-shown{ opacity:1; transform:none; pointer-events:auto; }
        .fbs-hero-close svg{ width:15px; height:15px; display:block; }
        @media (hover: hover){
          .fbs-hero-close:hover{ color:#14120f; background:#fff; border-color:#fff; }
        }
        .fbs-hero-close:focus-visible{ outline:2px solid var(--accent); outline-offset:2px; }

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
          .fbs-hero-close, .fbs-hero-instructions{ transition-duration:.01ms; }
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
        .fbs-expand-cta{
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
