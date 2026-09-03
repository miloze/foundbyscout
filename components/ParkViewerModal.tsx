"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import ParkHeroViewer from "./ParkHeroViewer";
import ParkHeroDetails from "./ParkHeroDetails";
import { BwIcon, ArExitIcon, ViewerCluster, ViewerClusterDivider, ViewerClusterButton } from "./ViewerControls";

type Props = {
  modelFile: string;
  modelFileMobile?: string;
  parkName: string;
  onClose: () => void;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  pingPong?: [[number, number, number], [number, number, number]];
  autoRotate?: boolean;
  ambientIntensity?: number;
  directionalIntensity?: number;
  environmentPreset?: string;
  environmentIntensity?: number;
  /** Chrome only — the open/close contract, the body-scroll lock, the Esc
   *  binding and the viewer mount are identical in both.
   *    "fullscreen" — the shipped mobile takeover, edge to edge.
   *    "takeover"   — desktop: the model on a full-viewport dark ground, no
   *                   card and no bounded container. Was "panel" (a centred
   *                   ~1000x640 card on a scrim); that read as "a modal
   *                   appeared" rather than "the model took over", and the
   *                   card's own edges were the thing doing the reading.
   *  Deliberately one component rather than two: the desktop overlay exists
   *  precisely because it is the mobile pattern, and forking it would leave
   *  two scroll-lock implementations to keep in step. */
  variant?: "fullscreen" | "takeover";
  /** Shown in the panel header ahead of the name, in accent. */
  catalogueId?: string;
  catalogueTotal?: number;
  /** The park's identity block, rendered over the model in the fullscreen
   *  viewer. Without these the viewer replaced the hero's whole metadata
   *  block with one small park-name label, which on mobile read as the text
   *  disappearing the moment you opened the scan. */
  address?: string[];
  postcode?: string;
  lat?: number;
  lng?: number;
  scanned?: string;
  /** The still the hero was already showing. Without it the viewer opened on
   *  a black plate reading "loading model" while a multi-megabyte GLB came
   *  down — on a phone, the slowest connection and the longest wait. */
  preloadImageUrl?: string;
};

export default function ParkViewerModal({
  parkName, onClose, variant = "fullscreen", catalogueId, catalogueTotal,
  address, postcode, lat, lng, scanned, preloadImageUrl, ...viewerProps
}: Props) {
  const isTakeover = variant === "takeover";
  // The viewfinder window. Clicking out is measured against this rather than
  // against an element hit test: the canvas covers the whole viewport and sits
  // under the wash too (the model is meant to read as continuing behind it),
  // so every click lands on the canvas whichever side of the frame it is on.
  const frameRef = useRef<HTMLDivElement>(null);
  const outsideFrame = (x: number, y: number) => {
    const r = frameRef.current?.getBoundingClientRect();
    if (!r) return false;
    return x < r.left || x > r.right || y < r.top || y > r.bottom;
  };
  // Both ends of the gesture have to be out in the wash. That is what keeps a
  // rotate that starts on the model and releases past the frame from being
  // read as a dismissal — and it replaces the travel threshold the frameless
  // version needed, which had the side effect that any plain click on the
  // model closed the overlay.
  const pressedOutside = useRef(false);
  // Live camera distance as a percentage of the usable zoom range, reported
  // out of the R3F tree by ParkModel. Null until the controls exist, so the
  // readout can hold its place instead of flashing a fake 0%.
  const [zoomPct, setZoomPct] = useState<number | null>(null);
  // Owned here so the modal drives the viewer's grayscale externally — that
  // suppresses ParkModel's own fallback toggle, leaving exactly one B&W
  // control on screen, in the same cluster the inline hero uses.
  // Opens in colour, like the desktop viewer: entering the scan is what brings
  // it up. The hero behind stays black and white and is what you come back to,
  // since this unmounts on close.
  const [bw, setBw] = useState(false);

  useEffect(() => {
    const doc = document.documentElement;
    const body = document.body;
    // Locking body alone leaves the viewport scrollbar drawn, and a fixed
    // element's containing block stops at the scrollbar — so the overlay ended
    // 15px short and the model looked clipped down its right edge. Lock the
    // scrolling element too, then give the width back as padding so the page
    // underneath does not jump when the bar disappears and returns.
    const barWidth = window.innerWidth - doc.clientWidth;
    const prev = {
      html: doc.style.overflow,
      body: body.style.overflow,
      pad: body.style.paddingRight,
    };
    const basePad = parseFloat(getComputedStyle(body).paddingRight) || 0;
    doc.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (barWidth > 0) body.style.paddingRight = `${basePad + barWidth}px`;
    return () => {
      doc.style.overflow = prev.html;
      body.style.overflow = prev.body;
      body.style.paddingRight = prev.pad;
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Rendered into <body>, not where it sits in the tree. The park page mounts
  // this inside <div class="contained">, and `position: fixed` only escapes
  // that for as long as no ancestor happens to be a containing block — one
  // `transform`, `filter`, `contain` or `view-transition-name` anywhere up the
  // chain and the overlay silently reframes itself inside the content column,
  // inheriting its max-width and centring offset. The portal removes the whole
  // class of failure rather than relying on that chain staying clean.
  const overlay = (
    <div
      className={isTakeover ? "fbs-vm fbs-vm--takeover" : "fbs-vm"}
      onPointerDown={isTakeover ? (e) => { pressedOutside.current = outsideFrame(e.clientX, e.clientY); } : undefined}
      onClick={isTakeover ? (e) => {
        const pressed = pressedOutside.current;
        pressedOutside.current = false;
        // The header and the control cluster run their own actions; a click
        // that lands on either is never a dismissal.
        if ((e.target as Element).closest?.("[data-vm-chrome]")) return;
        if (!pressed) return;
        if (!outsideFrame(e.clientX, e.clientY)) return;
        onClose();
      } : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        // Opaque, and the same warm near-black the scrim and the control
        // cluster already use — not the handover's #14171B. There is no navy
        // anywhere in the palette to match: dark ground is #202020 and every
        // dark plate on the page is rgb(20,19,15). #14171B is a cool blue-black
        // and reads as a foreign surface against the model's warm greys.
        // Fixed rather than themed: the cluster and the model are both built
        // for a dark ground, so the takeover stays dark under the light theme.
        background: isTakeover ? "#14130F" : "var(--background)",
        display: isTakeover ? "block" : "flex",
        flexDirection: isTakeover ? undefined : "column",
      }}
    >
      {/* No bounded child in the takeover — the header, the model and the
          controls each position against the viewport, so this collapses. */}
      <div style={{ display: "contents" }}>
      {/* Header. Fullscreen keeps the bare floating label it shipped with;
          the panel gets a real header row, since it has an edge to sit on and
          needs to carry the close control. */}
      {isTakeover ? (
        <div data-vm-chrome style={{
          position: "absolute", zIndex: 3,
          top: "calc(var(--vm-inset) + 18px)",
          left: "calc(var(--vm-inset) + 22px)",
          right: "calc(var(--vm-inset) + 22px)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16,
        }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em",
            // Fixed light values, not var(--muted): the ground is always dark
            // now, and under the light theme --muted is #6D6D6D, which would
            // put grey-on-near-black in the header.
            textTransform: "uppercase", color: "rgba(255,255,255,0.55)",
          }}>
            {catalogueId && <span style={{ color: "var(--accent)" }}>{catalogueId}/ </span>}
            {parkName}
          </span>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close 3D view"
            style={{
              all: "unset", cursor: "pointer", lineHeight: 0,
              padding: 6, color: "rgba(255,255,255,0.55)",
            }}
            className="fbs-vm-close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ) : (
        <>
          {/* Scrim, so the identity block stays readable over a bright part of
              the scan — the same treatment the hero gives it. */}
          <div aria-hidden style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 300, zIndex: 2,
            background: "linear-gradient(180deg, rgba(20,19,15,0) 0%, rgba(20,19,15,0.5) 30%, rgba(20,19,15,0.88) 100%)",
            pointerEvents: "none",
          }} />
          {/* Bottom-anchored and pointer-transparent, so a drag across it
              still reaches the model; the coordinate link opts back in. */}
          <div className="fbs-vm-details contained" style={{
            position: "absolute",
            bottom: "calc(68px + env(safe-area-inset-bottom, 0px))",
            left: 0, right: 0,
            paddingBlock: 0,
            zIndex: 3,
            color: "#fff",
            pointerEvents: "none",
          }}>
            <ParkHeroDetails
              name={parkName}
              catalogueId={catalogueId}
              catalogueTotal={catalogueTotal}
              address={address}
              postcode={postcode}
              lat={lat}
              lng={lng}
              scanned={scanned}
              compact
            />
          </div>
        </>
      )}

      {/* Viewer. In the takeover the canvas is the whole viewport, which is
          the entire point — the model reads as large because the frame around
          it is gone, not because it is scaled up inside a smaller one. (The
          handover's `min(52vw, 560px)` sizes a CSS cube in the prototype;
          applying it here would re-introduce the bounded box v2 removes.) */}
      {/* ── Viewfinder ────────────────────────────────────────────────────
          Two layers over a canvas that still fills the whole viewport. The
          model is not cropped to the window — it keeps rendering behind the
          wash, which is what makes this read as a porthole rather than a card
          on a background.

          The veil carries the legibility gradients under the chrome and is
          clipped to the window, so they stop at its curve instead of running
          out to the screen edge. The wash is the window itself: no border
          stroke (an edge line made it a card again), just a translucent flood
          everywhere outside it, a soft vignette inside, and a faint sheen off
          the top corners for the suggestion of glass. */}
      {isTakeover && (
        <>
          <div aria-hidden style={{
            position: "absolute", inset: "var(--vm-inset)", zIndex: 2,
            borderRadius: "var(--vm-radius)", overflow: "hidden", pointerEvents: "none",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 108,
              background: "linear-gradient(to bottom, rgba(10,11,13,0.66), rgba(10,11,13,0))",
            }} />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 108,
              background: "linear-gradient(to top, rgba(10,11,13,0.66), rgba(10,11,13,0))",
            }} />
          </div>

          <div ref={frameRef} aria-hidden className="fbs-vm-frame" style={{
            position: "absolute", inset: "var(--vm-inset)", zIndex: 2,
            borderRadius: "var(--vm-radius)", pointerEvents: "none",
          }} />
        </>
      )}

      <div
        className={isTakeover ? "fbs-vm-stage" : undefined}
        style={isTakeover ? { position: "absolute", inset: 0 } : { position: "relative", flex: 1 }}
      >
        <ParkHeroViewer
          modelFile={viewerProps.modelFile}
          modelFileMobile={viewerProps.modelFileMobile}
          cameraPos={viewerProps.cameraPos}
          cameraTarget={viewerProps.cameraTarget}
          modelRotation={viewerProps.modelRotation}
          pingPong={viewerProps.pingPong}
          autoRotate={viewerProps.autoRotate}
          ambientIntensity={viewerProps.ambientIntensity}
          directionalIntensity={viewerProps.directionalIntensity}
          environmentPreset={viewerProps.environmentPreset}
          environmentIntensity={viewerProps.environmentIntensity}
          heroImage=""
          preloadImageUrl={preloadImageUrl}
          debug={false}
          grayscale={bw}
          forceViewer
          inOverlay={isTakeover}
          onZoomChange={isTakeover ? setZoomPct : undefined}
        />
      </div>

      {/* Control cluster — same component, same corner as the inline hero */}
      <div data-vm-chrome style={{
        position: "absolute",
        bottom: isTakeover
          ? "calc(var(--vm-inset) + 16px + env(safe-area-inset-bottom, 0px))"
          : "calc(12px + env(safe-area-inset-bottom, 0px))",
        right: isTakeover ? "calc(var(--vm-inset) + 20px)" : 12,
        zIndex: 3,
      }}>
        <ViewerCluster>
          {/* The icon reports the current state, not the action the title
              describes: filled and orange while colour is on, empty outline
              while it's stripped. Both were bound to `bw` — outline for
              colour, fill for B&W — which read backwards, since an empty
              shape suggests nothing applied. */}
          <ViewerClusterButton
            onClick={() => setBw(b => !b)}
            title={bw ? "Show colour" : "Show B&W"}
            active={!bw}
          >
            <BwIcon filled={!bw} />
          </ViewerClusterButton>
          <ViewerClusterDivider />
          <ViewerClusterButton onClick={onClose} title="Exit 3D view">
            <ArExitIcon />
          </ViewerClusterButton>
        </ViewerCluster>
      </div>

      {/* Persistent, unlike the inline chip: nothing here is on a timer and
          there is no exit gesture to discover, so the hint has no reason to
          fade. The zoom readout sits with it as the one piece of live state. */}
      {isTakeover && (
        <div style={{
          position: "absolute", bottom: "calc(var(--vm-inset) + 22px)", left: "50%", transform: "translateX(-50%)", zIndex: 3,
          display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap",
          fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.5)", pointerEvents: "none",
        }}>
          <span>Scroll to zoom · Drag to rotate</span>
          <span style={{ color: "var(--accent)", minWidth: "4ch" }}>
            {zoomPct == null ? "" : `${zoomPct}%`}
          </span>
        </div>
      )}

      </div>

      <style>{`
        /* Window inset and curve. Not raw vw/vh: on a 13" laptop a percentage
           inset eats a far bigger share of the window than on a 27" monitor,
           so the frame stopped reading as a margin and started reading as a
           border. clamp() pins it to a sane pixel range at both ends — the
           middle term still tracks width so it breathes between them.
           These three numbers are the ones to argue with; nothing else here
           depends on their exact values. */
        .fbs-vm--takeover{
          --vm-inset: clamp(18px, 2.6vw, 44px);
          --vm-radius: clamp(10px, 1.1vw, 20px);
        }
        /* The wash is a single enormous spread shadow rather than four edge
           elements, so the window's rounded corners cut it for free. Inset
           shadows do the vignette; the sheen is deliberately barely there. */
        .fbs-vm-frame{
          box-shadow:
            0 0 0 9999px rgba(10,11,13,0.62),
            inset 0 0 70px 18px rgba(10,11,13,0.42),
            inset 0 0 180px 60px rgba(10,11,13,0.22);
          background:
            radial-gradient(140px 110px at 0% 0%, rgba(255,255,255,0.055), rgba(255,255,255,0) 72%),
            radial-gradient(140px 110px at 100% 0%, rgba(255,255,255,0.038), rgba(255,255,255,0) 72%);
        }

        /* Only what you can actually press takes events back — see the
           wrapper's pointer-events above. */
        .fbs-vm-details .fbs-field-tag{ pointer-events:auto; }
        /* The cluster sits bottom-right in this variant. Clearing it with a
           right inset squeezed the address chip into two lines on a phone —
           the block is only ~340px wide there to begin with. Stacking above
           the cluster instead keeps every chip on one line. */

        .fbs-vm-close{ transition:color .18s ease; }
        @media (hover: hover){ .fbs-vm-close:hover{ color:var(--foreground); } }
        /* The ground is always dark here, so --foreground would resolve to
           near-black under the light theme and the control would vanish. */
        @media (hover: hover){ .fbs-vm--takeover .fbs-vm-close:hover{ color:#fff; } }
        .fbs-vm-close:focus-visible{ outline:2px solid var(--accent); outline-offset:2px; }

        /* No opening motion, deliberately — see the note below before adding
           any back.

           The handover asks for the model to settle in over ~400ms. Both ways
           of expressing that in CSS start from a state that is not the correct
           layout (opacity 0, scale .9) and hold it until time advances. Time
           here is compositor time, and the compositor is busy decoding a
           multi-megabyte GLB during exactly that window: measured on this
           page, both a keyframe animation and a class-flipped transition sat
           at currentTime 0 indefinitely, pinning the stage at scale(.9). That
           is what put the model in a letterboxed strip with the header and the
           hint stranded on the ground above and below it.

           The stage sizes the canvas, so its from-state is a wrong layout, not
           a wrong decoration. Anything reintroduced here must animate
           something that is not the model's box — and must be watched on a
           real build, since a stalled compositor makes this invisible in
           automated checks. */
      `}</style>
    </div>
  );

  return createPortal(overlay, document.body);
}
