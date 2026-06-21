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
};

export default function ParkHeroViewer({
  modelFile, modelFileLow, modelFileMobile, heroImage, preloadImageUrl,
  cameraPos, cameraTarget, modelRotation, pingPong, autoRotate, debug, forceViewer,
  ambientIntensity, directionalIntensity, environmentPreset, environmentIntensity,
  grayscale,
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

  const preloadSrc = preloadImageUrl ?? modelFile.replace(/\/[^/]+$/, "/glb-preload.png");

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
  const finalModelFile = (forceViewer && isMobile && modelFileMobile) ? modelFileMobile : activeDesktopModel;

  return (
    <>
      <div style={{ position: "absolute", inset: 0 }}>
        <ParkModelClient
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
        />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--background) 0%, transparent 55%)", pointerEvents: "none" }} />
    </>
  );
}
