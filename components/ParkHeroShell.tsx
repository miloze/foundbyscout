"use client";

import { useState, useRef, useEffect } from "react";

const MONTHS: Record<string, string> = {
  january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
  july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
};

function fmtDate(val: string): string {
  const parts = val.trim().split(/\s+/);
  if (parts.length === 2) {
    const m = MONTHS[parts[0].toLowerCase()];
    const y = parts[1];
    if (m) return `${m}/${y}`;
  }
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) return parts[0];
  return val;
}
import HeroNavOverlay from "./HeroNavOverlay";
import ParkHeroViewer from "./ParkHeroViewer";
import { ParkGlanceHeroOverlay, type ParkGlance } from "./ParkFacts";
import ParkWeather from "./ParkWeather";
import ParkViewerModal from "./ParkViewerModal";
import { BwIcon, ArIcon, ViewerCluster, ViewerClusterDivider, ViewerClusterButton } from "./ViewerControls";
import ViewTransitionBoundary from "./ViewTransitionBoundary";
import { heroTransitionNames, parkDetailTransitionNames } from "@/lib/view-transitions";

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
  cameraPos, cameraTarget, modelRotation, pingPong, autoRotate, debug,
  ambientIntensity, directionalIntensity, environmentPreset, environmentIntensity,
  slug, catalogueId, name, address, location, postcode, lat, lng, opened, scanned,
  glance,
}: Props) {
  const vt = heroTransitionNames(slug);
  const vtDetail = parkDetailTransitionNames(slug);
  const [bw, setBw] = useState(true);
  const [open3D, setOpen3D] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const idNumber = catalogueId?.replace(/^SCN\//i, "");

  // Area name (not street) + full postcode — matches the homepage hero treatment.
  const areaName = address && address.length > 1 ? address[1] : address?.[0];
  const locationChain = [areaName, "London", postcode]
    .filter(Boolean)
    .join(", ")
    .toUpperCase();

  const hasCoords = lat != null && lng != null;

  return (
    <>
    {open3D && modelFile && (
      <ParkViewerModal
        modelFile={modelFile}
        modelFileMobile={modelFileMobile}
        parkName={name}
        onClose={() => setOpen3D(false)}
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
      className="full-bleed"
      style={{
        position: "relative",
        height: "78vh",
        minHeight: 340,
        overflow: "hidden",
        background: "var(--background)",
        marginTop: "-44px",
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
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
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
          />
        </div>
      ) : (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.025) 59px, rgba(255,255,255,0.025) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.025) 59px, rgba(255,255,255,0.025) 60px)",
        }} />
      )}


      {/* Scrim */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: 300,
        background: "linear-gradient(180deg, rgba(20,19,15,0) 0%, rgba(20,19,15,0.5) 30%, rgba(20,19,15,0.88) 100%)",
        pointerEvents: "none",
        zIndex: 2,
      }} />

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
        paddingBlock: "clamp(18px, 4vw, 32px)",
        zIndex: 5,
        color: "#fff",
        pointerEvents: "none",
      }}>
        {/* Park name — same identity as the home hero's title. It arrives by
            travelling from the homepage's position and size into this one, so
            it must not be remounted; the shared name is what tells the browser
            these two are one element. */}
        <ViewTransitionBoundary name={vt.name}>
        <div style={{
          fontFamily: "var(--font-display), Arial, sans-serif", fontWeight: 300,
          // Italic, matching the home hero exactly. Without it this rendered
          // MSCHN's upright cut — a real second face, not a fallback, since
          // colors_and_type.css declares normal and italic @font-face blocks
          // off the same variable file. That made the shared-element morph
          // change letterform mid-flight instead of only repositioning.
          fontStyle: "italic",
          fontSize: "clamp(34px, 5.5vw, 60px)",
          lineHeight: 0.88, color: "#fff",
          textShadow: "0 2px 24px rgba(0,0,0,0.25)",
          marginBottom: 20,
          textTransform: "uppercase", letterSpacing: "0em",
        }}>
          {name}
        </div>
        </ViewTransitionBoundary>

        {/* hero-meta row: field list (left) + cluster (right) */}
        <div className="fbs-hero-meta">

          {/* Left: field pills */}
          <div className="fbs-hm-left">
            {/* Three rows, mirroring the home hero's grouping: the index
                identifies the address it sits beside, coordinates stand
                alone, and the scan date sits with the surface condition —
                the two facts that describe when this was captured and what
                it's like now. Previously the index was stranded a row below
                the address and paired with the scan date instead, which put
                the same reference in a different colour and a different
                place than the hero had just shown it in. */}
            <div className="fbs-field-row">

              {/* Row 1 — catalogue index + address. Both continue from the
                  home hero, so both keep their identity across the
                  navigation rather than being replaced by longer versions.
                  The address carries more here (city and full postcode are
                  added back); it is still the same line. */}
              {(idNumber || locationChain) && (
                <div className="fbs-field-line">
                  {idNumber && (
                    <ViewTransitionBoundary name={vt.catalogue}>
                      <span className="fbs-field-tag fbs-field-tag--cat">{idNumber}</span>
                    </ViewTransitionBoundary>
                  )}
                  {locationChain && (
                    <ViewTransitionBoundary name={vt.address}>
                      <span className="fbs-field-tag fbs-field-tag--chip">{locationChain}</span>
                    </ViewTransitionBoundary>
                  )}
                </div>
              )}

              {/* Row 2 — coordinates. Added detail: no home counterpart, so
                  it animates in on its own rather than riding the root
                  crossfade. */}
              {hasCoords && (
                <ViewTransitionBoundary name={vtDetail.coords}>
                  <a
                    href={`https://maps.google.com/?q=${lat},${lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="fbs-field-tag fbs-coord-tag"
                  >
                    {Math.abs(lat!).toFixed(4)}° {lat! >= 0 ? "N" : "S"}, {Math.abs(lng!).toFixed(4)}° {lng! >= 0 ? "E" : "W"}
                  </a>
                </ViewTransitionBoundary>
              )}

              {/* Row 3 — scan date + surface condition. On the home hero the
                  scan date is folded into the address chip; here it separates
                  out, so it's treated as added detail rather than continuing
                  content — pairing it with half of the home chip isn't
                  expressible. Conditions stay desktop-only and move beside
                  the cluster on mobile, as before. */}
              {(scanned || hasCoords) && (
                <div className="fbs-field-line">
                  {scanned && (
                    <ViewTransitionBoundary name={vtDetail.scanned}>
                      <span className="fbs-field-tag">Scanned: {fmtDate(scanned)}</span>
                    </ViewTransitionBoundary>
                  )}
                  {hasCoords && (
                    <div className="fbs-cond-desktop">
                      <ParkWeather lat={lat!} lng={lng!} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: conditions (mobile only) + cluster */}
          <div className="fbs-hm-right">
            {hasCoords && (
              <div className="fbs-cond-mobile">
                <ParkWeather lat={lat!} lng={lng!} />
              </div>
            )}

            {/* Control cluster pill */}
            <ViewerCluster>
              {/* The icon reports the current state, not the action the title
                  describes: filled and orange while colour is on, empty
                  outline while it's stripped. Both were bound to `bw` —
                  outline for colour, fill for B&W — which read backwards,
                  since an empty shape suggests nothing applied. */}
              <ViewerClusterButton
                onClick={() => setBw(b => !b)}
                title={bw ? "Show colour" : "Show B&W"}
                active={!bw}
              >
                <BwIcon filled={!bw} />
              </ViewerClusterButton>
              {isMobile && modelFile && (
                <>
                  <ViewerClusterDivider />
                  <ViewerClusterButton onClick={() => setOpen3D(true)} title="Explore in 3D">
                    <ArIcon />
                  </ViewerClusterButton>
                </>
              )}
            </ViewerCluster>
          </div>
        </div>
      </div>

      <style>{`
        /* The content layer is pointer-transparent (see above) — only the
           things you can actually click take events back. Everything else
           lets the drag through to the canvas underneath. */
        .fbs-hero-content .fbs-field-tag,
        .fbs-hero-content .fbs-hm-right { pointer-events: auto; }
        .fbs-hero-meta {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 32px;
        }
        .fbs-hm-left { flex: 1; min-width: 0; }
        .fbs-hm-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          flex-shrink: 0;
          margin-bottom: 1px;
        }
        .fbs-field-row {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        /* One row of the three. flex-start rather than center because row 3
           pairs a single-line tag with the weather block, which is a pill
           over a timestamp — centring would float the tag between the two
           instead of lining it up with the pill. */
        .fbs-field-line {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          flex-wrap: wrap;
        }
        /* Box metrics are the home hero's .fbs-hp-chip, to the pixel: 11px
           type on a 16.5px line box, 3px of vertical inset and 8px of
           horizontal, giving 22.5px tall. These were 10.5px type with 5px/9px
           padding, which read as 27.75px — noticeably chunkier than the chips
           the visitor had just clicked away from.
           The 1px border is counted as part of the inset rather than added to
           it: 2px padding + 1px border is the home chip's 3px, so the filled
           and outlined variants here are the same height as each other and as
           the home chips. Change padding and border together or the match
           breaks. */
        .fbs-field-tag {
          display: inline-flex;
          align-items: center;
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.25);
          padding: 2px 7px;
          text-decoration: none;
        }
        /* The address line's backer, carried over from the home hero. It was
           --plain here (no border, no fill, no padding), which meant the
           element travelling in from the homepage arrived with its chip
           dissolving mid-flight — the text continued but the plate under it
           did not. Same fill, radius and text colour as .fbs-hp-chip in
           ParkHeroMeta so the backer survives the transition intact.
           Type metrics stay this hero's own (10.5px/.08em against the home
           chip's 11px/0.5px): the element is meant to resize into this
           layout, and that part reads as continuation, not as a swap. */
        .fbs-field-tag--chip {
          background: rgba(20,18,15,0.82);
          border-color: transparent;
          border-radius: 3px;
          color: #F3EFEC;
        }
        /* The index badge, matching the home hero's inverted chip: light
           plate, dark number, 3px radius. It was accent-filled, which meant
           the same catalogue reference changed colour between the two pages
           — orange here, light there — as well as changing corner radius
           mid-transition. The old comment claimed it matched the home hero;
           the home hero had since moved to the inverted chip. */
        .fbs-field-tag--cat {
          background: rgba(243,239,236,0.82);
          border-color: transparent;
          border-radius: 3px;
          color: #14120f;
        }
        .fbs-coord-tag { gap: 5px; }
        .fbs-coord-tag::after { content: "↗"; font-size: 10px; opacity: .7; }
        .fbs-coord-tag:hover { color: #fff; border-color: var(--accent); }
        .fbs-coord-tag:hover::after { opacity: 1; }
        /* flex, not the default block: the weather block inside is
           inline-flex, so as a block child it sat on a text baseline and
           picked up ~2.75px of leading above it — enough to drop the pill
           out of line with the scan date beside it in row 3. */
        .fbs-cond-desktop { display: flex; }
        .fbs-cond-mobile { display: none; }
        @media (max-width: 767px) {
          .fbs-hero-meta { flex-direction: column; align-items: stretch; gap: 14px; }
          .fbs-hm-right { flex-direction: row; align-items: center; justify-content: space-between; }
          .fbs-cond-desktop { display: none; }
          .fbs-cond-mobile { display: flex; }
        }
      `}</style>
    </div>

    </div>
    </>
  );
}
