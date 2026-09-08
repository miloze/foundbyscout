"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
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
function resolve(parks: FoundObjectPark[]) {
  const byKey = new Map<string, { park: FoundObjectPark; place: string }>();
  for (const park of parks) {
    if (!FOUND_OBJECTS[park.slug]) continue;
    // The same two-part notation the park cards print, from the same columns:
    // the postcode's district and the park's region.
    const place = [postcodeDistrict(park.postcode), park.location]
      .filter(Boolean).join(" / ");
    byKey.set(park.slug, { park, place });
  }
  return byKey;
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
  const [loaded, setLoaded] = useState(false);
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
  const resolved = resolve(parks);
  // Falls through to the first object that actually has a park row rather than
  // rendering a name or a position the database cannot vouch for.
  const key =
    asked && resolved.has(asked) ? asked
    : resolved.has(DEFAULT_FOUND_OBJECT) ? DEFAULT_FOUND_OBJECT
    : resolved.keys().next().value;

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

  const entry = key ? resolved.get(key) : undefined;
  if (!entry || !key) return null;
  const feature = FOUND_OBJECTS[key];
  const { park, place } = entry;
  // Non-null in practice: FOUND_OBJECT_SLUGS is already filtered on this, so a
  // park with no scan on the CDN never reaches the query, let alone this line.
  const src = featureUrl(key);
  if (!src) return null;

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
      <div className="full-bleed fbs-fo-stage" ref={ref} data-loaded={loaded ? "" : undefined}>
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
              <Stage
                src={src}
                word={park.name}
                motion={feature.motion}
                scale={feature.scale}
                running={onScreen && awake}
                reduced={reduced}
                onLoaded={() => { setLoaded(true); markReady(); }}
              />
            </ViewerErrorBoundary>
          </div>
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
      </div>

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

/* Reduced motion gets the finished state, not a shorter animation. */
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
}
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
