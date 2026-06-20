"use client";

import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

// Draco decoder (handles both compressed and uncompressed GLBs)
useGLTF.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");

const DEFAULT_CAMERA_POS: [number, number, number] = [-37.9, 50, 30];
const DEFAULT_MODEL_ROTATION: [number, number, number] = [0, 0, 0];
const DEFAULT_TARGET_ARR: [number, number, number] = [0, 2, 0];
const IDLE_SECONDS = 10;
const PAN_LIMIT = 20;

// ── Drives autoRotate from a ref every frame — no React re-render race ────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AutoRotateController({ controlsRef, isControllingRef }: { controlsRef: React.RefObject<any>; isControllingRef: React.RefObject<boolean> }) {
  useFrame(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = !isControllingRef.current;
  });
  return null;
}

// ── Clamp pan target + reposition camera to match ─────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PanClamp({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  useFrame(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const t = ctrl.target;
    const cx = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, t.x));
    const cy = Math.max(0,           Math.min(10,         t.y));
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

// ── Camera init ────────────────────────────────────────────────────────────
function CameraController({ normalPos, target }: { normalPos: [number, number, number]; target: [number, number, number] }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...normalPos);
    (camera as THREE.PerspectiveCamera).fov = 28;
    camera.lookAt(...target);
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ── Mesh ───────────────────────────────────────────────────────────────────
function SceneMesh({ url, modelRotation, onLoad }: {
  url: string;
  modelRotation: [number, number, number];
  onLoad: () => void;
}) {
  const { scene } = useGLTF(url);
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;

        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(m => {
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

// ── Main export ────────────────────────────────────────────────────────────
export default function ParkViewer({
  modelFile,
  cameraPos            = DEFAULT_CAMERA_POS,
  cameraTarget         = DEFAULT_TARGET_ARR,
  modelRotation        = DEFAULT_MODEL_ROTATION,
  onLoad,
  ambientIntensity     = 0.9,
  directionalIntensity = 1.0,
  environmentPreset    = "warehouse",
  environmentIntensity = 0.85,
}: {
  modelFile: string;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  onLoad?: () => void;
  ambientIntensity?: number;
  directionalIntensity?: number;
  environmentPreset?: string;
  environmentIntensity?: number;
}) {
  const [loaded,           setLoaded]           = useState(false);
  const [isUserControlling, setIsUserControlling] = useState(false);
  const [hintVisible,      setHintVisible]      = useState(false);
  const [viewMode,         setViewMode]         = useState<"bw" | "colour">("bw");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef      = useRef<any>(null);
  const isControllingRef = useRef(false);
  const idleTimer        = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show hint after model loads
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => setHintVisible(true), 800);
    return () => clearTimeout(t);
  }, [loaded]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (idleTimer.current) clearTimeout(idleTimer.current); }, []);

  const startIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      isControllingRef.current = false;
      setIsUserControlling(false);
      setTimeout(() => setHintVisible(true), 400);
    }, IDLE_SECONDS * 1000);
  }, []);

  const clearIdleTimer = useCallback(() => {
    if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null; }
  }, []);

  const handleStart = useCallback(() => {
    clearIdleTimer();
    isControllingRef.current = true;
    setIsUserControlling(true);
    setHintVisible(false);
  }, [clearIdleTimer]);

  const handleEnd = useCallback(() => {
    startIdleTimer();
  }, [startIdleTimer]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>

      {/* ── B&W / CLR toggle ──────────────────────────────────────────── */}
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

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {!loaded && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "rgba(255,255,255,0.4)", fontSize: 11,
          textTransform: "uppercase", letterSpacing: "0.12em",
          pointerEvents: "none",
        }}>
          Loading model…
        </div>
      )}

      {/* ── Hint ──────────────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
        zIndex: 10, pointerEvents: "none",
        opacity: hintVisible ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.5)",
          background: "rgba(0,0,0,0.35)", padding: "5px 12px", borderRadius: 2,
          backdropFilter: "blur(4px)",
        }}>
          ↻ drag to explore
        </span>
      </div>

      {/* ── Canvas ────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes strip-reveal {
          from { clip-path: inset(0 0 100% 0); }
          to   { clip-path: inset(0 0 0% 0); }
        }
      `}</style>
      <div style={{
        position: "absolute", inset: 0,
        transition: "filter 0.4s ease",
        clipPath: loaded ? undefined : "inset(0 0 100% 0)",
        animation: loaded ? "strip-reveal 1.0s steps(12, end) forwards" : "none",
        filter: viewMode === "bw" ? "grayscale(1)" : "none",
      }}>
        <Canvas
          camera={{ position: cameraPos, fov: 28, near: 0.5, far: 400 }}
          style={{ position: "absolute", inset: 0, background: "transparent" }}
          gl={{ antialias: true, alpha: true, logarithmicDepthBuffer: true, toneMapping: THREE.NoToneMapping, toneMappingExposure: 1.0, outputColorSpace: THREE.SRGBColorSpace }}
        >
          <ambientLight color={0xffffff} intensity={ambientIntensity} />
          <directionalLight color={0xffffff} position={[10, 20, 10]} intensity={directionalIntensity} />
          <Environment preset={environmentPreset as any} environmentIntensity={environmentIntensity} />
          <CameraController normalPos={cameraPos} target={cameraTarget} />
          <AutoRotateController controlsRef={controlsRef} isControllingRef={isControllingRef} />
          <OrbitControls
            ref={controlsRef}
            target={cameraTarget}
            enablePan={isUserControlling}
            enableZoom={isUserControlling}
            enableRotate={true}
            autoRotate={false}
            autoRotateSpeed={0.5}
            panSpeed={0.6}
            minDistance={20}
            maxDistance={110}
            minPolarAngle={Math.PI / 12}
            maxPolarAngle={Math.PI / 2.2}
            onStart={handleStart}
            onEnd={handleEnd}
          />
          {isUserControlling && <PanClamp controlsRef={controlsRef} />}
          <Suspense fallback={null}>
            <SceneMesh
              url={modelFile}
              modelRotation={modelRotation}
              onLoad={() => { setLoaded(true); onLoad?.(); }}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
