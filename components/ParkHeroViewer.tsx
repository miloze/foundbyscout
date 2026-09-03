"use client";

import { useState, useEffect, useCallback } from "react";
import ParkModelClient from "./ParkModelClient";
import ParkHeroMobile from "./ParkHeroMobile";
import { isPhone, getModelTierOverride } from "@/lib/device";

type Props = {
  modelFile: string;
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
  /** First pointer or wheel gesture on the model. */
  onInteract?: () => void;
};

export default function ParkHeroViewer({
  modelFile, modelFileLow, modelFileMobile, heroImage, preloadImageUrl,
  cameraPos, cameraTarget, modelRotation, pingPong, autoRotate, debug, forceViewer,
  ambientIntensity, directionalIntensity, environmentPreset, environmentIntensity,
  grayscale, onZoomChange, inOverlay, spinning, allowRotate, allowZoom, onInteract,
}: Props) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || new URLSearchParams(window.location.search).has('mobile');
  });

  // Track which model file is active (may swap to low on timeout)
  const [activeDesktopModel, setActiveDesktopModel] = useState(() => {
    if (typeof window === 'undefined') return modelFile;
    const override = getModelTierOverride();
    const wantsLow = override ? override === 'low' : isPhone();
    if (wantsLow && modelFileLow) return modelFileLow;
    return modelFile;
  });

  const [modelLoaded, setModelLoaded] = useState(false);

  const handleLoad = useCallback(() => setModelLoaded(true), []);

  useEffect(() => {
    const forceMobile = new URLSearchParams(window.location.search).has('mobile');
    const check = () => setIsMobile(forceMobile || window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Timeout fallback: if high model is slow, drop to low after 7s
  useEffect(() => {
    if (modelLoaded) return;
    if (activeDesktopModel !== modelFile) return; // already on low
    if (!modelFileLow) return;

    const timeout = setTimeout(() => {
      setActiveDesktopModel(modelFileLow);
    }, 7000);
    return () => clearTimeout(timeout);
  }, [modelLoaded, activeDesktopModel, modelFile, modelFileLow]);

  const preloadSrc = preloadImageUrl;

  // ── Mobile: static image + tap-to-expand modal ───────────────────────────
  if (isMobile && !forceViewer) {
    return (
      <div style={{ position: "absolute", inset: 0, filter: grayscale ? "grayscale(1)" : "none", transition: "filter 0.4s ease" }}>
        <ParkHeroMobile
          heroImage={preloadSrc || heroImage}
          parkName=""
          modelFile={modelFile}
          modelFileMobile={modelFileMobile}
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
      </div>
    );
  }

  // ── Desktop / forced viewer: 3D model ───────────────────────────────────
  // On mobile this is the tap-to-expand viewer, so keep it to the lightest
  // export available. The old expression only used the mobile file when one
  // existed and otherwise fell through to the desktop model — and no park
  // currently has `model_file_mobile` set, so phones were being handed the
  // high-res export wherever there was no low one (wandle-park, crystal-palace).
  const finalModelFile = (forceViewer && isMobile)
    ? (modelFileMobile || modelFileLow || modelFile)
    : activeDesktopModel;

  return (
    <>
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <ParkModelClient
          loadingBackground={inOverlay ? "transparent" : undefined}
          spinning={spinning}
          allowRotate={allowRotate}
          allowZoom={allowZoom}
          onInteract={onInteract}
          modelFile={finalModelFile}
          preloadImage={preloadSrc}
          onLoad={handleLoad}
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
