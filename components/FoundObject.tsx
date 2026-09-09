"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ViewerErrorBoundary from "./ViewerErrorBoundary";
import Coords from "./Coords";
import { postcodeDistrict } from "@/lib/postcode";
import {
  FOUND_OBJECTS, DEFAULT_FOUND_OBJECT, type FoundObjectPark,
} from "@/lib/foundObjects";
import { featureUrl } from "@/lib/assets";

/**
 * FOUND OBJECT — the archive exhibiting a single scanned form.
 *
 * Not a park gateway, and deliberately not shaped like one. The homepage
 * already features a place (the hero) and browses places (PARKS); this is the
 * third thing, which is skateable *form* — one piece of concrete lifted out of
 * its park and turned slowly on nothing.
 *
 * The hierarchy is the argument. The small mono line names the object; the
 * display type names the place it belongs to. So the module reads as "here is
 * a volcano, and it is at Bloblands" rather than as a card advertising
 * Bloblands — which is the difference between an exhibit and a listing. There
 * is no scan number: numbering these would start a second catalogue running
 * alongside the parks' own, and an object does not need an accession to be
 * worth looking at.
 *
 * PROTOTYPE SCOPE. Two hardcoded objects and a query-string switch for
 * comparing them — no feature table, no selection logic, no cycling, one GLB
 * in memory at a time. OBJECTS below is the entire "data model" and is meant
 * to be read as a placeholder.
 */

/**
 * The feature config and the park record, joined.
 *
 * The config says which object and how it behaves; the park row says what the
 * place is called and where it is. Nothing about the park is duplicated into
 * the config — see lib/foundObjects for why that split is load-bearing.
 */
type Exhibit = {
  key: string;
  park: FoundObjectPark;
  place: string;
  feature: (typeof FOUND_OBJECTS)[string];
  src: string;
};

/**
 * Every object that can actually be exhibited, in catalogue order.
 *
 * A list rather than the map this used to return, because the module now
 * browses: an order is what previous and next mean, and it has to be the
 * config's own order rather than whatever order the database handed back — a
 * result set is unordered unless it was asked to be, and the position count
 * would then differ between requests for no reason a reader could see.
 *
 * Three conditions, all of them already enforced elsewhere and all re-checked
 * here because this is the list the controls are built from: the park has a
 * feature configured, the database returned a published row for it, and its
 * scan is on the CDN. An object failing any of them is absent from the list
 * rather than present and broken, so the count and the controls describe what
 * is actually there.
 */
function resolve(parks: FoundObjectPark[]): Exhibit[] {
  const rows = new Map(parks.map(p => [p.slug, p]));
  const out: Exhibit[] = [];
  for (const key of Object.keys(FOUND_OBJECTS)) {
    const park = rows.get(key);
    if (!park) continue;
    const src = featureUrl(key);
    if (!src) continue;
    // The same two-part notation the park cards print, from the same columns:
    // the postcode's district and the park's region.
    const place = [postcodeDistrict(park.postcode), park.location]
      .filter(Boolean).join(" / ");
    out.push({ key, park, place, feature: FOUND_OBJECTS[key], src });
  }
  return out;
}

/** How far ahead of the viewport to start the download. Roughly one screen:
 *  loaded by arrival at a normal scroll speed, and never fetched at all by
 *  someone who lands on the homepage and does not scroll. */
const PRELOAD_MARGIN = "700px";

/** The entrance. One fade, everything together. */
const ENTRANCE_MS = 500;
/**
 * How long the module will wait for the scan before showing its labels anyway.
 *
 * The entrance waits for the model, but the labels must not be hostage to it:
 * a slow connection would otherwise leave the section as bare grid, and a model
 * that never resolves and never throws would leave it that way for good. The
 * error boundary covers a failure; this covers a stall.
 */
const ENTRANCE_FALLBACK_MS = 2500;

/** Where the background grid's verticals sit, as percentages of the page
 *  column: its two edges and its quarters, which are the PARKS grid's four
 *  columns. The marks below are drawn at the same positions, so the two cannot
 *  disagree. */
const GRID_COLS = [0, 25, 50, 75, 100];

/**
 * Past this much horizontal movement, the gesture has committed to a step.
 *
 * One step per gesture, decided at the threshold and not revisited: the object
 * does not follow the finger and there is no rubber band at the ends, because
 * the travel is now a whole frame-width in the scene rather than a nudge in a
 * slot, and half-dragging a screen-wide slide back and forth is a different
 * interaction from stepping through a collection.
 */
const COMMIT_PX = 56;
/** Until the pointer has moved this far the gesture is neither horizontal nor
 *  vertical, and the first movement past it decides which. */
const AXIS_LOCK_PX = 8;

const Stage = dynamic(() => import("./FoundObjectStage"), { ssr: false });

export default function FoundObject({ parks }: { parks: FoundObjectPark[] }) {
  const ref = useRef<HTMLDivElement>(null);
  /** Latched: once the download has started, leaving the viewport must not
   *  discard it and fetch it again on the way back. */
  const [mounted, setMounted] = useState(false);
  /** Not latched — this is the render loop's switch. */
  const [onScreen, setOnScreen] = useState(false);
  const [awake, setAwake] = useState(true);
  const [reduced, setReduced] = useState(false);

  const [failed, setFailed] = useState(false);
  /** Latched: the entrance runs once per mount and scrolling back up does not
   *  replay it. Both conditions are recorded in refs and checked from the
   *  callbacks that set them, so nothing here sets state from an effect body. */
  const [entered, setEntered] = useState(false);
  const seen = useRef(false);
  const ready = useRef(false);
  const enter = useCallback(() => {
    if (seen.current && ready.current) setEntered(true);
  }, []);
  const markReady = useCallback(() => { ready.current = true; enter(); }, [enter]);
  /** A/B switch. Read through the router's hook rather than window.location so
   *  the server and the first client pass agree on it — reading location during
   *  render is exactly the hydration mismatch that broke the iPad viewer in 7C,
   *  and correcting it from an effect would render the wrong object first. */
  const asked = useSearchParams().get("object");
  const items = useMemo(() => resolve(parks), [parks]);
  // Falls through to the first object that actually has a park row rather than
  // rendering a name or a position the database cannot vouch for.
  const initial = useMemo(() => {
    const byAsk = asked ? items.findIndex(it => it.key === asked) : -1;
    if (byAsk >= 0) return byAsk;
    const byDefault = items.findIndex(it => it.key === DEFAULT_FOUND_OBJECT);
    return byDefault >= 0 ? byDefault : 0;
  }, [asked, items]);

  /**
   * Which object is on the stage.
   *
   * ?object= seeds it and then stops mattering: it is a comparison switch, and
   * a control that silently rewrote the URL on every swipe would fill the back
   * button with steps through an exhibit. Browsing is state, not navigation.
   */
  const [index, setIndex] = useState(initial);
  /**
   * The step in flight: which object is arriving and from which side.
   *
   * One at a time, and the whole of the guard against rapid input. While this
   * is set every other way in — the arrows, the keys, a swipe — is refused, so
   * a reader leaning on the arrow key cannot stack steps behind one another or
   * leave the title showing one object and the metadata another. The stage
   * cannot be caught mid-slide by a second slide.
   */
  const [pending, setPending] = useState<{ to: number; dir: 1 | -1 } | null>(null);
  /** Which scans have loaded and been fitted, by slug. Distinct from the
   *  entrance's own `ready` ref above, which is about the section arriving. */
  const [fitted, setFitted] = useState<Record<string, boolean>>({});
  const stageRef = useRef<HTMLDivElement>(null);

  const at = Math.min(index, Math.max(0, items.length - 1));
  const canPrev = at > 0;
  const canNext = at < items.length - 1;

  /**
   * Whether the object currently on the stage is drawn.
   *
   * Derived from which scans have been fitted rather than kept as its own
   * flag, and that is the fix for a real confusion: a separate `loaded` was set
   * by whichever scan reported in, so the incoming object arriving mid-step
   * marked the stage loaded while the outgoing one was still the one on it.
   * Asking the question about a named object cannot be wrong in that way.
   */
  const loaded = !!fitted[items[at]?.key ?? ""];

  /**
   * Move one place, if there is one.
   *
   * Bounded rather than wrapping, matching the map preview: with an end you can
   * reach, the count and the disabled control agree about how big the
   * collection is. Wrapping would make next infinite and the count a lie.
   *
   * The two halves are deliberately separated in time. The outgoing object
   * leaves first and the index changes only once it has gone, so what slides
   * away is the object you were looking at rather than a frame of the next one
   * — the swap happens behind an empty stage. Reduced motion skips straight to
   * the change, since there is nothing to see and nothing to wait for.
   */
  const step = useCallback((dir: -1 | 1) => {
    if (pending || !loaded) return;
    const target = at + dir;
    // Bounded, and bounded silently: at either end the direction simply does
    // not exist. No wrap, and nothing springs back to say so — the arrow on
    // that side is already dimmed and the count already says where you are.
    if (target < 0 || target >= items.length) return;
    if (reduced) { setIndex(target); return; }
    setPending({ to: target, dir });
  }, [at, items.length, reduced, loaded, pending]);

  /** Called by the stage when the two objects have finished travelling. The
   *  arriving object is already at rest under the frame's centre by then, so
   *  this only records which one it is. */
  const finishStep = useCallback(() => {
    setPending(p => { if (p) setIndex(p.to); return null; });
  }, []);

  const markFitted = useCallback((key: string) => {
    setFitted(f => (f[key] ? f : { ...f, [key]: true }));
  }, []);

  /**
   * Dragging the object aside — one gesture for touch, pen and mouse, because
   * Pointer Events already unify them and a separate touch path is how the
   * two drift apart.
   *
   * The page must keep scrolling. touch-action:pan-y on the stage gives the
   * browser the vertical axis outright and reserves only the horizontal one
   * for this, and the axis lock below settles the ambiguous first few pixels:
   * until the pointer has moved AXIS_LOCK_PX the gesture is neither, and the
   * first movement to pass that decides. A drag judged vertical releases the
   * pointer and never touches the object again.
   *
   * Nothing here navigates. The stage holds a canvas and a graticule and no
   * link at all — View park below is the only way into the park, and it is a
   * real anchor a reader can see, middle-click and open in a tab.
   */
  const drag = useRef<{
    id: number; x: number; y: number; axis: null | "x" | "y"; fired: boolean;
  } | null>(null);
  /**
   * Set the moment a gesture becomes a horizontal drag, cleared on the click
   * that follows it.
   *
   * A pointer sequence ends in a click, and a drag that started on one of the
   * side arrows would deliver that click to the arrow — so a single swipe
   * begun over a control stepped twice, once for the gesture and once for the
   * button. The click is swallowed in the capture phase, before it can reach
   * the button at all.
   */
  const dragged = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (items.length < 2 || reduced || pending || !loaded) return;
    // Secondary buttons belong to the browser's own menus.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: null, fired: false };
  }, [items.length, reduced, pending, loaded]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;

    if (!d.axis) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (d.axis === "y") { drag.current = null; return; }
      dragged.current = true;
      // Only once the gesture is known to be ours, so a vertical flick that
      // started here still scrolls the page.
      //
      // Capture is an optimisation, not a requirement — it keeps the moves
      // coming when the pointer leaves the stage mid-drag. It throws if the
      // pointer is already gone, which is a race a slow frame can lose, and the
      // gesture works without it, so a failure here must not take the drag down
      // with it.
      try { (e.currentTarget as HTMLElement).setPointerCapture(d.id); } catch {}
    }

    // The step fires at the threshold rather than on release, so the slide
    // starts while the finger is still down and the gesture and the motion are
    // the same event. Once per gesture: `fired` is what stops a long swipe
    // from crossing the threshold repeatedly.
    if (!d.fired && Math.abs(dx) >= COMMIT_PX) {
      d.fired = true;
      step(dx < 0 ? 1 : -1);
    }
  }, [step]);

  const endDrag = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (d.axis !== "x") return;
    const el = e.currentTarget as HTMLElement;
    try { if (el.hasPointerCapture?.(d.id)) el.releasePointerCapture(d.id); } catch {}
  }, []);

  /** See `dragged`. Capture phase, so the click never reaches the arrow. */
  const swallowDragClick = useCallback((e: React.MouseEvent) => {
    if (!dragged.current) return;
    dragged.current = false;
    e.stopPropagation();
    e.preventDefault();
  }, []);

  /** Arrow keys, once focus is inside the controls — the standard way to work
   *  a set of stepped items, and it costs the stage no tabindex of its own. */
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
  }, [step]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const near = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setMounted(true); near.disconnect(); } },
      { rootMargin: PRELOAD_MARGIN },
    );
    // A second observer with no margin, because "close enough to start
    // downloading" and "actually being looked at" are different questions and
    // only the second should be spending frames.
    let stall: ReturnType<typeof setTimeout> | null = null;
    const watch = new IntersectionObserver(([e]) => {
      setOnScreen(e.isIntersecting);
      if (!e.isIntersecting || seen.current) return;
      seen.current = true;
      enter();
      stall = setTimeout(markReady, ENTRANCE_FALLBACK_MS);
    });

    near.observe(el);
    watch.observe(el);

    const onVisibility = () => setAwake(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => setReduced(motion.matches);
    onMotion();
    motion.addEventListener("change", onMotion);

    return () => {
      near.disconnect();
      watch.disconnect();
      if (stall) clearTimeout(stall);
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotion);
    };
  }, [enter, markReady]);

  const entry = items[at];
  if (!entry) return null;
  const incomingEntry = pending ? items[pending.to] : null;
  const { park, place, feature, src } = entry;
  /** One object is an exhibit, not a collection. With nothing to step to, no
   *  controls are drawn at all — a disabled pair either side of "1 / 1" would
   *  be an interface describing a choice that does not exist. */
  const browsable = items.length > 1;

  // The entrance is two attributes and nothing else: everything it moves is
  // opacity, and the grid, the layout and the model's own framing and motion
  // are untouched by it. Reduced motion resolves to the finished state with no
  // transition rather than a faster one.
  return (
    <section
      className="fbs-fo"
      aria-labelledby="fbs-fo-park"
      data-entered={entered || reduced ? "" : undefined}
      data-instant={reduced ? "" : undefined}
    >
      {/* TRIAL — a faint background graticule, behind everything.

          It is not drawn at invented positions. The section already sits in
          the page's content column, so the verticals mark that column's own
          edges and quarters by measuring nothing — 0% and 100% are the page
          margins, and 25/50/75% land in the 2px gutters of the PARKS grid
          directly above. They cannot drift at any width because they are not a
          copy of the layout, they are the layout. The horizontals sit on the
          stage's own top and bottom edges for the same reason.

          Nothing here is a box: the verticals run the full height of the
          section and the horizontals run the full width of the viewport, so
          they cross each other and pass on rather than closing around any
          element. */}
      <div className="fbs-fo-grid" aria-hidden="true">
        <div className="fbs-fo-grid-cols">
          <span /><span /><span /><span /><span />
        </div>
      </div>

      <div className="fbs-fo-index">
        <span>Found object</span>
        {/* Park from the database, feature from the config — the two halves
            come from the two places that own them. This line has to stand on
            its own: the oversized name behind the model is interrupted by the
            scan by design, so it cannot be the only place the park is named. */}
        <span className="fbs-fo-feature">{park.name} / {feature.feature}</span>
      </div>

      {/* The stage reserves its full height from the first paint, so nothing
          below it moves when the scan lands.

          Moving the park name into the canvas buys the occlusion but costs the
          pre-load composition: until the GLB arrives this box holds only the
          two mono lines, where it used to hold the display type as well. That
          is the real trade of doing this with depth instead of a mask, and it
          is worth watching on a cold load before this goes further. */}
      <div
        className="full-bleed fbs-fo-stage"
        ref={node => { ref.current = node; stageRef.current = node; }}
        data-loaded={loaded ? "" : undefined}
        data-browsable={browsable ? "" : undefined}
        onPointerDown={browsable ? onPointerDown : undefined}
        onPointerMove={browsable ? onPointerMove : undefined}
        onPointerUp={browsable ? endDrag : undefined}
        onPointerCancel={browsable ? endDrag : undefined}
        onClickCapture={browsable ? swallowDragClick : undefined}
      >
        {/* Before the canvas in source order, so the scan is painted over them
            and obscures them exactly as it obscures the park name. */}
        <div className="fbs-fo-grid-rows" aria-hidden="true">
          <span /><span />
          {/* One hollow square per intersection. They live here rather than
              with the verticals because an intersection is where a horizontal
              is, and the horizontals are the stage's own two edges — so this
              needs no measurement and cannot fall out of step with them. The
              wrapper rebuilds the page column inside the full-bleed stage from
              the same two tokens .contained uses, which is what puts each
              square on a vertical rather than near one. */}
          <div className="fbs-fo-grid-marks">
            {GRID_COLS.flatMap(x => ["top", "bottom"].map(edge => (
              <span
                key={edge + x}
                className="fbs-fo-mark"
                data-edge={edge}
                data-col={x === 100 ? "last" : undefined}
                data-quarter={x === 25 || x === 75 ? "" : undefined}
                style={{ left: x + "%" }}
              />
            )))}
          </div>
        </div>

        {mounted && !failed && (
          <div className="fbs-fo-canvas" aria-hidden="true">
            <ViewerErrorBoundary fallback={null} resetKey={src} onFailed={() => { setFailed(true); markReady(); }}>
              {/* Both objects are handed over together during a step, so the
                  stage can put them side by side and move them as one. The
                  slide, the crossfade and the sizing all live in there because
                  all three are questions about the scene; the DOM only says
                  which two objects and which way. */}
              <Stage
                current={{
                  key: entry.key, src, word: park.name,
                  motion: feature.motion, scale: feature.scale,
                }}
                incoming={incomingEntry ? {
                  key: incomingEntry.key,
                  src: incomingEntry.src,
                  word: incomingEntry.park.name,
                  motion: incomingEntry.feature.motion,
                  scale: incomingEntry.feature.scale,
                } : null}
                dir={pending ? pending.dir : 1}
                running={onScreen && awake}
                reduced={reduced}
                onReady={(key) => { markFitted(key); markReady(); }}
                onSlideEnd={finishStep}
              />
            </ViewerErrorBoundary>
          </div>
        )}

        {/* ── Stepping, beside the object ───────────────────────────────
            Two hit areas flanking the artwork, not over it: each runs from the
            stage's edge inward and stops well short of the object, so nothing
            invisible sits on top of the thing the section is about.

            The arrows are the site's own — the MSCHN horizontal pair, in
            accent orange, the same glyphs and the same colour the map preview
            and the park pages use for moving through the catalogue. Fixed
            where they stand and aligned to the grid: each sits on the content
            column's outer vertical, rebuilt from the same two tokens the grid
            marks use, so they land on a line that is already drawn rather than
            near one.

            With a pointer they are absent until their side is hovered or the
            button is focused, and only opacity changes — a fixed arrow that
            fades is quieter than one that slides in, and it cannot be chased.
            Without a pointer there is no hover to reveal anything, so they are
            simply always there, smaller and quieter. */}
        {browsable && (
          <>
            <button
              type="button" className="fbs-fo-side" data-side="prev"
              onClick={() => step(-1)} onKeyDown={onKeyDown}
              aria-disabled={!canPrev || !loaded || !!pending}
              aria-label="Previous object"
            >
              <span className="fbs-fo-side-mark" aria-hidden="true">←</span>
            </button>
            <button
              type="button" className="fbs-fo-side" data-side="next"
              onClick={() => step(1)} onKeyDown={onKeyDown}
              aria-disabled={!canNext || !loaded || !!pending}
              aria-label="Next object"
            >
              <span className="fbs-fo-side-mark" aria-hidden="true">→</span>
            </button>
          </>
        )}

        {/* The park name runs inside the canvas now, on a strip behind the
            object, so the scan's real silhouette interrupts it. That leaves
            nothing in the DOM to read, so the heading stays here for assistive
            tech and for anything that reads the page as text — visually hidden
            rather than duplicated, because two copies would have to be
            positioned to agree with each other and would drift apart at some
            width. */}
        <h2 id="fbs-fo-park" className="fbs-fo-name-sr">{park.name}</h2>
      </div>

      {/* Both halves are the park record, not this component's opinion of it:
          the district is derived from the stored postcode and the position is
          the stored coordinate. The row mirrors the index row above it, so the
          two mono lines bracket the object symmetrically. */}
      <div className="fbs-fo-provenance">
        {place && (
          <Link href={"/parks/" + park.slug} className="fbs-fo-link">{place}</Link>
        )}
        <Coords lat={park.lat} lng={park.lng} className="fbs-fo-coords" />
      </div>

      {/* Its own row, on the same inset as the two above it. The link is the
          one thing here a visitor can act on, so it gets a real target rather
          than a 10px line of text: the padding is negative-margined back out so
          the tap area grows without the row moving. */}
      <div className="fbs-fo-actions">
        <Link href={"/parks/" + park.slug} className="fbs-fo-view">
          View park
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* The count stays here, on the row's far edge, and the arrows do not:
            they moved beside the object where the gesture is. What is left is
            a position rather than a control — so it is text, not a button, and
            it holds a fixed width so neither it nor View park moves when the
            number changes. */}
        {browsable && (
          <span className="fbs-fo-count" data-pending={pending ? "" : undefined}>
            {at + 1} / {items.length}
          </span>
        )}
      </div>

      {/* The stage is aria-hidden and the name behind the object is a canvas
          texture, so a change of object is invisible to a screen reader unless
          it is said. Polite, and it names the object rather than only the
          position: "2 of 2" on its own is a fact about the control, not about
          what is now on the stage. */}
      <p className="fbs-fo-name-sr" role="status">
        {browsable ? `${park.name} / ${feature.feature}, ${at + 1} of ${items.length}` : ""}
      </p>

      <style>{CSS}</style>
    </section>
  );
}

/* Held outside the JSX so the CSS reads as CSS. Nothing in here may contain a
   backtick, including inside a comment — one would end the template literal
   silently, which has now cost this project three separate debugging sessions. */
const CSS = `
/* No surface of its own, in either theme — the page's ground is what surrounds
   the object, and the canvas is transparent, so it is also what shows between
   and behind its geometry. */
.fbs-fo{ position:relative; padding-block:clamp(2.5rem, 6vw, 5rem); }

.fbs-fo-index, .fbs-fo-provenance{
  font-family:var(--font-mono); font-size:10px; font-weight:500;
  letter-spacing:.16em; text-transform:uppercase; color:var(--muted);
}
/* Both mono rows split left/right, so the index above the object and the
   provenance below it bracket it on the same two edges. Positioned so they
   paint above the grid: a positioned element with z-index 0 would otherwise
   sit over static text, and 1px lines would cross the letterforms. */
.fbs-fo-index, .fbs-fo-provenance{
  display:flex; justify-content:space-between; align-items:baseline; gap:1rem;
  position:relative; z-index:1;
  /* Held off the outer verticals rather than sitting on them. Both rows take
     the same inset, so FOUND OBJECT and the location agree on the left edge and
     the feature label and the coordinates agree on the right. Padding on the
     rows only: the grid, the model and the park name are all separate layers
     and none of them move. */
  padding-inline:16px;
  /* Arrive with the scan rather than before it. */
  opacity:0; transition:opacity ${ENTRANCE_MS}ms ease;
}
.fbs-fo[data-entered] .fbs-fo-index,
.fbs-fo[data-entered] .fbs-fo-provenance{ opacity:1; }

/* Reduced motion gets the finished state, not a shorter animation. The step
   handler already swaps without an exit under the same preference, so there is
   nothing here to shorten either — this only makes sure no transition is left
   to run if the preference is turned on midway. */
.fbs-fo[data-instant] .fbs-fo-canvas,
.fbs-fo[data-instant] .fbs-fo-index,
.fbs-fo[data-instant] .fbs-fo-provenance{ transition:none; }


/* ── Background graticule (trial) ───────────────────────────────────
   One continuous layer for the section, never a participant in it: it takes no
   pointer events, so nothing about clicking a link or dragging on the canvas
   changes. */
.fbs-fo-grid, .fbs-fo-grid-rows{
  position:absolute; inset:0; z-index:0; pointer-events:none;
}
/* The verticals run the full height of the section and were ending on a hard
   cut at both edges. This fades the layer itself out over the last stretch at
   each end, so they arrive and leave rather than starting.

   Masked with a gradient, so it is opacity and not blur — the lines stay 1px
   and stay sharp, they simply become less present.

   Only this layer is masked, and it does not need to be more than that: the
   horizontals and their marks live in the stage's own layer, and the stage sits
   111px inside the section at 1440 and never closer than about 60px at any
   width, since the section's own padding alone is at least 40px. The fade never
   reaches them. The model and the type are separate elements entirely and are
   untouched. */
.fbs-fo-grid{
  --fo-grid-fade:52px;
  -webkit-mask-image:linear-gradient(to bottom,
    transparent 0, #000 var(--fo-grid-fade),
    #000 calc(100% - var(--fo-grid-fade)), transparent 100%);
  mask-image:linear-gradient(to bottom,
    transparent 0, #000 var(--fo-grid-fade),
    #000 calc(100% - var(--fo-grid-fade)), transparent 100%);
}
/* No .contained here, and none on the two mono rows either. The page root is
   already a .contained, so a second one inset them another 56px at 1440 — which
   is why FOUND OBJECT used to start 56px right of the park cards above it. The
   grid made that visible. */
.fbs-fo-grid-cols{ position:relative; height:100%; }
.fbs-fo-grid-cols > span, .fbs-fo-grid-rows > span{
  position:absolute; background:var(--border);
  /* Faint by design. --border is already the site's hairline in both themes,
     so this stays correct when the theme flips. */
  opacity:.5;
}
.fbs-fo-grid-cols > span{ top:0; bottom:0; width:1px; }
/* The reading column's own edges — where FOUND OBJECT and the feature label
   already align. */
.fbs-fo-grid-cols > span:nth-child(1){ left:0; }
.fbs-fo-grid-cols > span:nth-child(5){ right:0; }
/* Its quarters, which are the PARKS grid's four columns above. */
.fbs-fo-grid-cols > span:nth-child(2){ left:25%; }
.fbs-fo-grid-cols > span:nth-child(3){ left:50%; }
.fbs-fo-grid-cols > span:nth-child(4){ left:75%; }
/* Full-bleed, so they run past the column rather than capping it. */
.fbs-fo-grid-rows > span{ left:0; right:0; height:1px; }

/* The page column, rebuilt inside the full-bleed stage from the same two
   tokens .contained is built from, so the marks land on the verticals at every
   width without measuring anything. */
.fbs-fo-grid-marks{
  position:absolute; top:0; bottom:0; pointer-events:none;
  left:max(var(--content-padding),
    calc((100% - var(--content-max-width)) / 2 + var(--content-padding)));
  right:max(var(--content-padding),
    calc((100% - var(--content-max-width)) / 2 + var(--content-padding)));
}
/* Hollow, and the same stroke as the lines they sit on — same colour, same
   1px, same opacity — so they read as part of the grid rather than as objects
   placed on it. */
.fbs-fo-mark{
  position:absolute; box-sizing:border-box;
  /* 6px overall, border included — box-sizing makes the declared size the
     outer size, so the mark is exactly as wide as it is tall. */
  width:6px; height:6px;
  /* Softened corners, as in the reference. Everything else is the line's own:
     same token, same 1px, same opacity. */
  border:1px solid var(--border); border-radius:1px; background:none;
  opacity:.5;

  /* Centred on the crossing, and the half-pixels are the whole point.
     A 1px line anchored at left:25% occupies 25%..25%+1px, so the line the eye
     sees is centred half a pixel further on than the coordinate it was placed
     at. Centring the mark on the coordinate therefore leaves it half a pixel
     off the line every time. These offsets follow each line's own anchor —
     positive where it grows right or down from its edge, negative for the two
     that are anchored to the far edge and grow back toward it — so the mark's
     centre lands on the line's centre rather than on its edge.

     It makes them crisper as well: the line centres fall on whole pixels, so a
     6px box centred there covers whole pixels instead of straddling them. */
  --mx:.5px;
  --my:.5px;
  transform:translate(calc(-50% + var(--mx)), calc(-50% + var(--my)));
}
.fbs-fo-mark[data-col="last"]{ --mx:-.5px; }
.fbs-fo-mark[data-edge="top"]{ top:0; }
.fbs-fo-mark[data-edge="bottom"]{ top:100%; --my:-.5px; }
.fbs-fo-grid-rows > span:nth-child(1){ top:0; }
.fbs-fo-grid-rows > span:nth-child(2){ bottom:0; }
/* The catalogue grid drops to two columns here, so its quarter lines stop
   meaning anything and would just be clutter in a phone gutter. */
@media (max-width: 700px){
  .fbs-fo-actions{ padding-inline:calc(12px - 10px); }
  .fbs-fo-grid-cols > span:nth-child(2),
  .fbs-fo-grid-cols > span:nth-child(4),
  .fbs-fo-mark[data-quarter]{ display:none; }
  /* The same 700px this module already uses for the grid, so there is one
     mobile threshold here rather than several. */
  .fbs-fo-index, .fbs-fo-provenance{ padding-inline:12px; }
}
/* The object's own name — the only line about the artefact rather than the
   place, so it takes the accent. */
.fbs-fo-feature{ color:var(--accent); }

.fbs-fo-stage{
  position:relative;
  display:grid; place-items:center;
  height:clamp(360px, 52vh, 640px);
  margin-block:clamp(.5rem, 1.5vw, 1rem);
}
/* The drag surface. pan-y hands the vertical axis to the browser outright, so
   ordinary page scrolling starting on the object is never something this has to
   give back — only the horizontal axis is reserved here. Without it a phone
   would wait to see what the gesture turns out to be, and the first pixels of
   every scroll would stutter.

   grab/grabbing on a pointer only: on touch the cursor is nothing, and on a
   device with no second object there is nothing to grab. */
.fbs-fo-stage[data-browsable]{ touch-action:pan-y; }
@media (hover: hover){
  .fbs-fo-stage[data-browsable]{ cursor:grab; }
  .fbs-fo-stage[data-browsable]:active{ cursor:grabbing; }
}
/* Full-bleed, unlike the two mono lines above and below it, which stay in the
   reading column. The park name is fitted to a fraction of the canvas, so the
   canvas has to be the viewport for that fraction to mean 92vw rather than 92%
   of the content column — which at 1440 is 152px narrower, and was the
   difference between a name that reaches the gutters and one that does not. */
.fbs-fo-canvas{
  position:absolute; inset:0;
  opacity:0; transition:opacity ${ENTRANCE_MS}ms ease;
}
/* Two gates, and both are needed. data-loaded is the scan being ready;
   data-entered is the section having been reached. The name is inside this
   canvas, behind the model, so fading the canvas fades the name and the scan
   together as one object and leaves the occlusion between them untouched. */
.fbs-fo[data-entered] .fbs-fo-stage[data-loaded] .fbs-fo-canvas{ opacity:1; }

/* Stepping between objects happens inside the scene, not to this element: the
   two objects share a track that travels a full frame-width, and the oversized
   name is deliberately not on that track — it holds still and crossfades. See
   FoundObjectStage. Nothing here transforms, so nothing here can push the page
   sideways; the canvas is the section's own width and WebGL draws only inside
   it, which is the clip the brief asks for and it costs no overflow rule. */

/* The visible park name lives in the canvas, behind the object. This is the
   same string kept in the document for assistive tech and text extraction. */
.fbs-fo-name-sr{
  position:absolute; width:1px; height:1px; margin:-1px;
  padding:0; border:0; overflow:hidden; white-space:nowrap;
  clip-path:inset(50%);
}

.fbs-fo-actions{
  position:relative; z-index:1;
  opacity:0; transition:opacity ${ENTRANCE_MS}ms ease;
  /* Same inset as the rows above, minus the padding the target adds back. */
  padding-inline:calc(16px - 10px);
  margin-top:.5rem;
  /* The row now holds two things. space-between puts them on the module's two
     edges, which are the same two edges FOUND OBJECT / the feature label and
     the location / the coordinates already sit on — so the browse controls
     land on the grid's outer verticals rather than somewhere new. */
  display:flex; align-items:center; justify-content:space-between; gap:1rem;
}

/* ── Stepping, beside the object ───────────────────────────────────────
   A hit area at each end of the stage, running its full height and stopping
   well short of the middle, so a swipe over the object is never competing with
   an invisible button sitting on it. */
.fbs-fo-side{
  position:absolute; top:0; bottom:0; z-index:2;
  /* Wide enough to find with a thumb, never wide enough to reach the object:
     the ceiling is what keeps it clear of the artwork at large widths. */
  width:clamp(56px, 13%, 148px);
  display:flex; align-items:center;
  background:none; border:0; padding:0;
  color:var(--accent); cursor:pointer;
  /* The gesture owns the horizontal axis over the whole stage, this included,
     so a swipe that happens to start on an arrow is still a swipe. */
  touch-action:pan-y;
  -webkit-tap-highlight-color:transparent;
}
/* On the content column's outer verticals, rebuilt from the same two tokens
   the grid marks use — so each arrow sits on a line that is already drawn
   rather than at a position invented for it. */
.fbs-fo-side[data-side="prev"]{
  left:0; justify-content:flex-start;
  padding-left:max(var(--content-padding),
    calc((100vw - var(--content-max-width)) / 2 + var(--content-padding)));
}
.fbs-fo-side[data-side="next"]{
  right:0; justify-content:flex-end;
  padding-right:max(var(--content-padding),
    calc((100vw - var(--content-max-width)) / 2 + var(--content-padding)));
}
/* The site's own arrows, in the display face, at the size the stage can
   afford. Nothing is drawn around them. */
.fbs-fo-side-mark{
  font-family:var(--font-display); font-size:44px; line-height:1;
  /* A real target around a glyph that does not fill one. */
  min-width:44px; min-height:44px;
  display:flex; align-items:center; justify-content:center;
  transition:opacity 180ms ease;
}
/* With a pointer: absent until the side is pointed at or the button is
   focused. Opacity only — a fixed mark that fades cannot be chased. */
@media (hover: hover){
  .fbs-fo-side-mark{ opacity:0; }
  .fbs-fo-side:hover .fbs-fo-side-mark,
  .fbs-fo-side:focus-visible .fbs-fo-side-mark{ opacity:1; }
}
/* Without one there is no hover to reveal anything, so they are simply always
   there — smaller, and quieter, but never dependent on a pointer the device
   does not have. */
@media (hover: none){
  .fbs-fo-side-mark{ font-size:26px; opacity:.85; }
}
.fbs-fo-side:focus-visible{ outline:2px solid var(--accent); outline-offset:-8px; }
/* An end you can see. Still focusable — disabling the element a keyboard
   reader is standing on moves focus to the body, so arrowing to the last
   object would throw you out of the control you were using. step() already
   refuses to pass either end, so the guard lives in one place. */
.fbs-fo-side[aria-disabled="true"]{ cursor:default; }
.fbs-fo-side[aria-disabled="true"] .fbs-fo-side-mark{ opacity:.18; }
@media (hover: hover){
  .fbs-fo-side[aria-disabled="true"]:hover .fbs-fo-side-mark{ opacity:.18; }
}
.fbs-fo[data-instant] .fbs-fo-side-mark{ transition:none; }

.fbs-fo-count{
  font-family:var(--font-mono); font-size:10px; font-weight:500;
  letter-spacing:.16em; color:var(--muted);
  /* Tabular, and a floor under the width: the count is the one label here that
     changes while the reader is looking at it, and neither chevron may move
     when it does. */
  font-variant-numeric:tabular-nums;
  min-width:3.2em; text-align:right;
  transition:opacity 180ms ease;
}
/* Quietened while a step is in flight, which is also when every way in is
   refused. One state for the whole indicator rather than a word swapped into
   it: its width is what keeps View park opposite from moving. */
.fbs-fo-count[data-pending]{ opacity:.4; }
.fbs-fo[data-instant] .fbs-fo-count{ transition:none; }
.fbs-fo[data-entered] .fbs-fo-actions{ opacity:1; }
.fbs-fo[data-instant] .fbs-fo-actions{ transition:none; }
.fbs-fo-view{
  display:inline-flex; align-items:center; gap:.5em;
  /* 44px tall including the padding, so it is a real target on a phone while
     still reading as one more line of field notation. */
  padding:14px 10px;
  font-family:var(--font-mono); font-size:10px; font-weight:500;
  letter-spacing:.16em; text-transform:uppercase;
  color:var(--muted); text-decoration:none;
}
@media (hover: hover){ .fbs-fo-view:hover{ color:var(--foreground); } }
.fbs-fo-view:focus-visible{
  outline:2px solid var(--accent); outline-offset:2px; color:var(--foreground);
}

.fbs-fo-link, .fbs-fo-coords{ color:inherit; text-decoration:none; }
/* The coordinate keeps the row's size and colour but not its tracking: .16em
   pulls a numeric string apart and undoes the point of setting it in tabular
   figures. */
.fbs-fo-coords{ letter-spacing:.08em; flex-shrink:0; }
@media (hover: hover){
  .fbs-fo-link:hover, .fbs-fo-coords:hover{ color:var(--foreground); }
}
.fbs-fo-link:focus-visible, .fbs-fo-coords:focus-visible{
  outline:2px solid var(--accent); outline-offset:4px;
}

/* Two field-notation lines will not sit side by side in a phone gutter. */
@media (max-width: 560px){
  .fbs-fo-provenance{ flex-direction:column; align-items:flex-start; gap:.4rem; }
}
`;
