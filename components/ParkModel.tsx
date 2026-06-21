"use client";

import { Suspense, useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";

// Coerce to numbers — Supabase numeric[] returns strings
const n = (v: unknown[]): [number, number, number] => [+v[0]!, +v[1]!, +v[2]!];

useGLTF.setDecoderPath("/draco/");

// ── Mesh ───────────────────────────────────────────────────────────────────
function Model({ onLoad, modelFile, modelRotation }: {
  onLoad: () => void;
  modelFile: string;
  modelRotation: [number, number, number];
}) {
  const { scene } = useGLTF(modelFile);

  useEffect(() => {
    // Keep original PBR materials — ambient-only lighting gives a flat
    // baked-texture look. Fixes side/depthWrite so faces don't vanish.
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const mat = m as THREE.MeshStandardMaterial;
          mat.side        = THREE.DoubleSide;
          mat.transparent = false;
          mat.depthWrite  = true;
          if (mat.map)         mat.map.colorSpace         = THREE.SRGBColorSpace;
          if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
          mat.needsUpdate = true;
        });
      }
    });
    onLoad();
  }, [scene, onLoad]);

  return (
    <group>
      <primitive object={scene} rotation={modelRotation} position={[0, 4, 0]} />
    </group>
  );
}

// ── Ping-pong camera ───────────────────────────────────────────────────────
function PingPongCamera({ posA, posB, target }: {
  posA: [number, number, number];
  posB: [number, number, number];
  target: [number, number, number];
}) {
  const { camera } = useThree();
  const vA      = useRef(new THREE.Vector3(...posA));
  const vB      = useRef(new THREE.Vector3(...posB));
  const vT      = useRef(new THREE.Vector3(...target));
  const elapsed = useRef(0);
  const PERIOD  = 60;

  useFrame((_, delta) => {
    elapsed.current = (elapsed.current + delta) % PERIOD;
    const t    = elapsed.current / PERIOD;
    const tri  = t < 0.5 ? t * 2 : 2 - t * 2;
    const ease = 0.5 - Math.cos(tri * Math.PI) * 0.5;

    const relA = vA.current.clone().sub(vT.current);
    const relB = vB.current.clone().sub(vT.current);
    const rxzA = Math.sqrt(relA.x * relA.x + relA.z * relA.z);
    const rxzB = Math.sqrt(relB.x * relB.x + relB.z * relB.z);
    const thA  = Math.atan2(relA.x, relA.z);
    const thB  = Math.atan2(relB.x, relB.z);

    let dTh = thB - thA;
    if (dTh >  Math.PI) dTh -= 2 * Math.PI;
    if (dTh < -Math.PI) dTh += 2 * Math.PI;
    dTh = dTh > 0 ? dTh - 2 * Math.PI : dTh + 2 * Math.PI; // force correct arc

    const rxz   = rxzA + (rxzB - rxzA) * ease;
    const y     = relA.y + (relB.y - relA.y) * ease;
    const theta = thA + dTh * ease;

    camera.position.set(
      vT.current.x + Math.sin(theta) * rxz,
      vT.current.y + y,
      vT.current.z + Math.cos(theta) * rxz,
    );
    camera.lookAt(vT.current);
  });
  return null;
}

// ── Pan clamp — tightened to keep model centred in frame ──────────────────
const PAN_LIMIT = 12;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PanClamp({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  useFrame(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const t  = ctrl.target;
    const cx = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, t.x));
    const cy = Math.max(0,          Math.min(8,          t.y));
    const cz = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, t.z));
    if (cx !== t.x || cy !== t.y || cz !== t.z) {
      const dx = cx - t.x, dy = cy - t.y, dz = cz - t.z;
      ctrl.object.position.x += dx;
      ctrl.object.position.y += dy;
      ctrl.object.position.z += dz;
      t.set(cx, cy, cz);
      ctrl.update();
    }
  });
  return null;
}

// ── Debug: live camera position ────────────────────────────────────────────
function LivePos({ onPos, controlsRef }: {
  onPos: (s: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const last = useRef("");
  useFrame(() => {
    const { x, y, z } = camera.position;
    const t   = controlsRef.current?.target;
    const pos = `pos [${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}]`;
    const tgt = t ? `  tgt [${t.x.toFixed(2)}, ${t.y.toFixed(2)}, ${t.z.toFixed(2)}]` : "";
    const s   = pos + tgt;
    if (s !== last.current) { last.current = s; onPos(s); }
  });
  return null;
}

// ── Renderer config — updates toneMappingExposure dynamically ─────────────
function RendererConfig({ exposure }: { exposure: number }) {
  const { gl } = useThree();
  useLayoutEffect(() => { gl.toneMappingExposure = exposure; }, [gl, exposure]);
  return null;
}

// ── Frame capture — saves canvas as JPEG via a ref callback ───────────────
function CaptureSetup({ captureRef, filterRef }: {
  captureRef: React.MutableRefObject<(() => void) | undefined>;
  filterRef:  React.MutableRefObject<string>;
}) {
  const { gl } = useThree();
  useEffect(() => {
    captureRef.current = () => {
      const src  = gl.domElement;
      const out  = document.createElement("canvas");
      out.width  = src.width;
      out.height = src.height;
      // No background fill — keep alpha transparent so the park is a cutout
      const ctx  = out.getContext("2d")!;
      ctx.drawImage(src, 0, 0);
      const url  = out.toDataURL("image/png");
      const a    = document.createElement("a");
      a.href     = url;
      a.download = "park-preview.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    return () => { captureRef.current = undefined; };
  }, [gl, captureRef, filterRef]);
  return null;
}

// ── Main export ────────────────────────────────────────────────────────────
export default function ParkModel({
  modelFile,
  preloadImage,
  onLoad,
  cameraPos            = [0, 22, 32] as [number, number, number],
  cameraTarget         = [0, 2, 0]  as [number, number, number],
  modelRotation        = [-Math.PI / 2, 0, 0] as [number, number, number],
  pingPong,
  autoRotate           = false,
  debug                = false,
  fov                  = 45,
  ambientIntensity     = 0.9,
  directionalIntensity = 1.0,
  environmentPreset    = "warehouse",
  environmentIntensity = 0.85,
  grayscale,
}: {
  modelFile: string;
  preloadImage?: string;
  onLoad?: () => void;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  pingPong?: [[number, number, number], [number, number, number]];
  autoRotate?: boolean;
  debug?: boolean;
  fov?: number;
  ambientIntensity?: number;
  directionalIntensity?: number;
  environmentPreset?: string;
  environmentIntensity?: number;
  grayscale?: boolean;
}) {
  // When grayscale prop is provided externally, use it; otherwise fall back to internal toggle.
  const [viewMode,    setViewMode]    = useState<"bw" | "colour">("bw");
  const externallyControlled = grayscale !== undefined;
  const [camPos,      setCamPos]      = useState("loading…");
  const [modelLoaded, setModelLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef  = useRef<any>(null);
  const preloadRef   = useRef<HTMLImageElement>(null);
  const captureRef   = useRef<(() => void) | undefined>(undefined);

  const startPos    = [+cameraPos[0], +cameraPos[1], +cameraPos[2]] as [number, number, number];
  const filter      = externallyControlled
    ? (grayscale ? "grayscale(1)" : "none")
    : (viewMode === "bw" ? "grayscale(1)" : "none");
  const filterRef   = useRef(filter);
  filterRef.current = filter;
  const canvasStart = pingPong ? n(pingPong[0]) : startPos;
  const handleLoad = useCallback(() => {
    if (preloadRef.current) preloadRef.current.style.opacity = "0";
    setModelLoaded(true);
    onLoad?.();
  }, [onLoad]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>

      {/* ── B&W / CLR toggle — only shown when not controlled by hero shell ── */}
      {!externallyControlled && (
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 11, display: "flex", gap: 2 }}>
          {(["bw", "colour"] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              padding: "5px 12px", border: "none", cursor: "pointer",
              background: viewMode === mode ? "var(--accent)" : "rgba(0,0,0,0.55)",
              color: "#fff", fontFamily: "var(--font-mono)", fontSize: 10,
              letterSpacing: "0.1em", borderRadius: 2,
            }}>
              {mode === "bw" ? "B&W" : "CLR"}
            </button>
          ))}
        </div>
      )}

      {/* ── Debug overlay — camera + image controls ───────────────────── */}
      {debug && (
        <div style={{
          position: "absolute", bottom: 80, left: 12, zIndex: 20,
          background: "rgba(0,0,0,0.82)", color: "#0f0", padding: "12px 16px",
          fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.9,
          borderRadius: 4, pointerEvents: "auto", minWidth: 260,
        }}>
          <div style={{ color: "#aaa", fontSize: 9, letterSpacing: "0.12em", marginBottom: 6 }}>CAMERA POSITION</div>
          <div style={{ marginBottom: 12 }}>{camPos}</div>

          <button
            onClick={() => captureRef.current?.()}
            style={{
              marginTop: 10, width: "100%", padding: "6px 0",
              background: "var(--accent)", border: "none", color: "#fff",
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em",
              textTransform: "uppercase", cursor: "pointer", borderRadius: 2,
            }}
          >
            Save frame as PNG
          </button>
        </div>
      )}

      {/* ── Preload image — fades out via DOM ref (no React state update) ── */}
      {preloadImage && (
        <img
          ref={preloadRef}
          src={preloadImage}
          alt=""
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", pointerEvents: "none", zIndex: 4,
            opacity: 1, transition: "opacity 0.7s ease",
            filter,
          }}
        />
      )}

      {/* ── Loading text fallback when no preload image ────────────────── */}
      {!preloadImage && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "var(--muted)", fontSize: 11,
          textTransform: "uppercase", letterSpacing: "0.12em",
          pointerEvents: "none",
        }}>
          Loading model…
        </div>
      )}

      {/* ── Controls hint ─────────────────────────────────────────────── */}
      {!pingPong && !debug && (
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 5, pointerEvents: "none",
          fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.45)",
        }}>
          drag to rotate · scroll to zoom
        </div>
      )}

      {/* ── Canvas — filter on wrapper div, not on canvas itself ───────── */}
      <div style={{ position: "absolute", inset: 0, filter, transition: "filter 0.4s ease" }}>
      <Canvas
        camera={{ position: canvasStart, fov, near: 0.5, far: 400 }}
        style={{ position: "absolute", inset: 0 }}
        gl={{ antialias: true, alpha: true, logarithmicDepthBuffer: true, preserveDrawingBuffer: true, toneMapping: THREE.NoToneMapping, toneMappingExposure: 1.0, outputColorSpace: THREE.SRGBColorSpace }}
      >
        <ambientLight color={0xffffff} intensity={ambientIntensity} />
        <directionalLight color={0xffffff} position={[10, 20, 10]} intensity={directionalIntensity} />
        <Environment preset={environmentPreset as any} environmentIntensity={environmentIntensity} />

        {debug && <CaptureSetup captureRef={captureRef} filterRef={filterRef} />}

        <Suspense fallback={null}>
          <Model
            onLoad={handleLoad}
            modelFile={modelFile}
            modelRotation={modelRotation}
          />
        </Suspense>

        {pingPong && !debug && (
          <PingPongCamera
            posA={n(pingPong[0])}
            posB={n(pingPong[1])}
            target={n(cameraTarget)}
          />
        )}

        <OrbitControls
          ref={controlsRef}
          target={n(cameraTarget)}
          enablePan={debug || !pingPong}
          enableZoom={debug || !pingPong}
          enableRotate={!pingPong || debug}
          autoRotate={modelLoaded && !debug && !pingPong}
          autoRotateSpeed={0.5}
          minDistance={debug ? 1 : 10}
          maxDistance={debug ? 500 : 70}
          minPolarAngle={debug ? 0 : Math.PI / 7}
          maxPolarAngle={debug ? Math.PI : Math.PI * 0.42}
        />

        {!pingPong && !debug && <PanClamp controlsRef={controlsRef} />}

        {debug && <LivePos onPos={setCamPos} controlsRef={controlsRef} />}

      </Canvas>
      </div>
    </div>
  );
}
