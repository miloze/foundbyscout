"use client";

import { useState, useEffect } from "react";
import ParkModelClient from "./ParkModelClient";
import ParkHeroMobile from "./ParkHeroMobile";
import type { CameraBounds } from "@/lib/heroCamera";

type Props = {
  modelFile: string;
  heroImage?: string;
  preloadImageUrl?: string;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  autoRotate?: boolean;
  debug?: boolean;
  forceViewer?: boolean;
  ambientIntensity?: number;
  directionalIntensity?: number;
  environmentPreset?: string;
  environmentIntensity?: number;
  grayscale?: boolean;
  /** Live zoom readout for the overlay panel. Absent inline, where there
   *  is nothing to report it to. */
  onZoomChange?: (pct: number) => void;
  /** Rendering inside the takeover rather than in the page hero. The hero
   *  dresses its viewer to sit in a page — a scrim fading the bottom of the
   *  model into var(--background) so it meets the editorial below, and a
   *  loading plate in that same colour. Both are wrong once the viewer *is*
   *  the window: the scrim became an opaque band across the bottom of the
   *  overlay and the plate a slab over its ground. */
  inOverlay?: boolean;
  /** Idle rotation target, eased rather than switched — see ParkModel. */
  spinning?: boolean;
  /** Granted separately during the entrance: drag early, zoom last. */
  allowRotate?: boolean;
  allowZoom?: boolean;
  /** Passed through to ParkModel. The park page's hero sets this false because
   *  its EXPLORE 3D plate already reads "LOADING 3D SCAN…" while the GLB
   *  resolves; the full-screen viewer has no such label and leaves it on. */
  showLoadingNote?: boolean;
  /** Every pointer, touch or wheel contact with the model — a plain tap
   *  included. Not latched; the caller decides what is once-only. */
  onInteract?: () => void;
  /** The model was actually rotated, as distinct from touched. */
  onDrag?: () => void;
  /** A gesture permanently ends the automatic rotation. See ParkModel. */
  stopOnInteract?: boolean;
  /** Per-park orbit window for an ENCLOSED park — see CameraBounds in
   *  lib/heroCamera. Undefined outdoors, where it changes nothing. */
  cameraBounds?: CameraBounds | null;
  /** The GLB is parsed and on screen. Drives the entry affordance — see
   *  ParkHeroShell: nothing may be explored before this fires. */
  onReady?: () => void;
  /** The viewer threw and the still is showing instead. */
  onFailed?: () => void;
};

export default function ParkHeroViewer({
  modelFile, heroImage, preloadImageUrl,
  cameraPos, cameraTarget, modelRotation, autoRotate, debug, forceViewer,
  ambientIntensity, directionalIntensity, environmentPreset, environmentIntensity,
  grayscale, onZoomChange, inOverlay, spinning, allowRotate, allowZoom, showLoadingNote, onInteract, onDrag, stopOnInteract, cameraBounds,
  onReady, onFailed,
}: Props) {
  // ── Server and first client render must agree ─────────────────────────
  // Both of these used to be `useState` initialisers reading `window`, which
  // is a server/client branch inside render and therefore a hydration
  // mismatch: the server has no window and returned the desktop branch, while
  // the client returned whatever `innerWidth` happened to be. React logs
  // "Hydration failed… the tree will be regenerated on the client" and throws
  // the server tree away — and the tree it throws away contains the WebGL
  // canvas, which is mounted through `dynamic(ssr:false)` and does not
  // survive being torn down and rebuilt cleanly.
  //
  // This was confirmed from the error's own component stack: server rendered
  // the desktop viewer branch, client rendered <ParkHeroMobile>.
  //
  // It matters most on iPad, where `innerWidth` at hydration is not
  // necessarily the settled layout width — Safari reports a transient value
  // while its toolbars resolve — so a tablet can hydrate as one branch and
  // immediately re-render as the other.
  //
  // `mounted` is the fix: the still is what BOTH the server and the first
  // client pass render, so they agree by construction. The live viewer is an
  // upgrade applied after mount. Desktop loses nothing — ParkModel paints the
  // same still over the canvas until the GLB resolves anyway — and phones
  // never momentarily mount a viewer they are not supposed to have.
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // The one extra render this costs is the entire point: it is what makes the
  // server's tree and the first client tree identical. The rule against setting
  // state synchronously in an effect is guarding against cascading renders;
  // this runs once, with an empty dependency list, and cannot cascade.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // `modelLoaded` was tracked here only so the 7-second tier swap could decide
  // whether to give up on the high model. With one model there is nothing to
  // swap to, so the flag has no reader — ParkModel keeps its own, which is what
  // fades the preload still out.

  useEffect(() => {
    const forceMobile = new URLSearchParams(window.location.search).has('mobile');
    const check = () => setIsMobile(forceMobile || window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // The 7-second "swap to the low model" timeout lived here. It is gone with
  // the low model itself — and it was actively harmful: changing modelFile
  // mid-load changes useGLTF's key AND ViewerErrorBoundary's resetKey, so it
  // tore down an in-flight download and started a different one rather than
  // letting the first finish. On the iPad that turned one slow load into two
  // failures, and the second is the error that surfaced.

  const preloadSrc = preloadImageUrl;

  // ── Still: phones, and every surface before mount ────────────────────────
  // `!mounted` is not a mobile case — it is the one tree the server and the
  // first client pass both produce. See the note on the state above.
  if ((!mounted || isMobile) && !forceViewer) {
    return (
      <div style={{ position: "absolute", inset: 0, filter: grayscale ? "grayscale(1)" : "none", transition: "filter 0.4s ease" }}>
        <ParkHeroMobile
          heroImage={preloadSrc || heroImage}
          parkName=""
          modelFile={modelFile}
          cameraPos={cameraPos}
          cameraTarget={cameraTarget}
          modelRotation={modelRotation}
          autoRotate={autoRotate}
          ambientIntensity={ambientIntensity}
          directionalIntensity={directionalIntensity}
          environmentPreset={environmentPreset}
          environmentIntensity={environmentIntensity}
        />
      </div>
    );
  }

  // ── Desktop / tablet / opened viewer: the production model ──────────────
  // Every device that gets a live scan gets the same file. On a phone this is
  // only reached through forceViewer — the hero there is a still and never
  // requests a GLB, so the download happens when someone asks for the scan.

  return (
    <>
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <ParkModelClient
          loadingBackground={inOverlay ? "transparent" : undefined}
          spinning={spinning}
          allowRotate={allowRotate}
          allowZoom={allowZoom}
          showLoadingNote={showLoadingNote}
          onInteract={onInteract}
          onDrag={onDrag}
          stopOnInteract={stopOnInteract}
          cameraBounds={cameraBounds}
          onLoad={onReady}
          onFailed={onFailed}
          modelFile={modelFile}
          preloadImage={preloadSrc}
          cameraPos={cameraPos}
          cameraTarget={cameraTarget}
          modelRotation={modelRotation}
          autoRotate={autoRotate}
          debug={debug}
          ambientIntensity={ambientIntensity}
          directionalIntensity={directionalIntensity}
          environmentPreset={environmentPreset}
          environmentIntensity={environmentIntensity}
          grayscale={grayscale}
          onZoomChange={onZoomChange}
        />
      </div>
      {/* The scan meets the page directly now. This was a gradient fading the
          bottom 55% of the model into var(--background), which is what put a
          wash behind the hero's name and chips — removed with the hero's own
          scrim so the metadata sits on the scan rather than on a plate. It
          also softened the hero's bottom edge into the editorial below; if
          that edge now reads too hard, this is what used to do it. */}
    </>
  );
}
