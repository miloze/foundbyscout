"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const DEFAULT_CAMERA_POS: [number, number, number] = [-37.9, 50, 30];
const DEFAULT_MODEL_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];

// ── Camera reset on planView toggle ───────────────────────────────────────
function CameraController({ normalPos }: { normalPos: [number, number, number] }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...normalPos);
    (camera as THREE.PerspectiveCamera).fov = 28;
    camera.lookAt(0, 2, 0);
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ── Mesh component ─────────────────────────────────────────────────────────
function SceneMesh({
  url, modelRotation, onLoad,
}: {
  url: string;
  modelRotation: [number, number, number];
  onLoad: () => void;
}) {
  const { scene } = useGLTF(url);
  useEffect(() => { onLoad(); }, [onLoad]);
  return (
    <group>
      <primitive object={scene} rotation={modelRotation} position={[0, 4, 0]} />
    </group>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export default function ContourModel({
  modelFile,
  cameraPos     = DEFAULT_CAMERA_POS,
  modelRotation = DEFAULT_MODEL_ROTATION,
  onLoad,
}: {
  modelFile: string;
  heightMapFile?: string;
  lineColor?: string;
  cameraPos?: [number, number, number];
  modelRotation?: [number, number, number];
  onLoad?: () => void;
}) {
  const [loaded,   setLoaded]   = useState(false);
  const [viewMode, setViewMode] = useState<"bw" | "colour">("bw");

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>

      {/* ── B&W / CLR toggle — top right ──────────────────────────────── */}
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 11, display: "flex", gap: 2 }}>
        {(["bw", "colour"] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: "5px 12px", border: "none", cursor: "pointer",
              background: viewMode === mode ? "var(--accent)" : "rgba(0,0,0,0.55)",
              color: "#fff", fontFamily: "monospace", fontSize: 10,
              letterSpacing: "0.1em", borderRadius: 2,
            }}
          >
            {mode === "bw" ? "B&W" : "CLR"}
          </button>
        ))}
      </div>

      {/* ── Loading state ─────────────────────────────────────────────── */}
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

      {/* ── Strip reveal keyframes ────────────────────────────────────── */}
      <style>{`
        @keyframes strip-reveal {
          from { clip-path: inset(0 0 100% 0); }
          to   { clip-path: inset(0 0 0% 0); }
        }
      `}</style>

      {/* ── Canvas ────────────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0,
        transition: "filter 0.4s ease",
        clipPath: loaded ? undefined : "inset(0 0 100% 0)",
        animation: loaded ? "strip-reveal 1.0s steps(12, end) forwards" : "none",
        filter: viewMode === "bw" ? "grayscale(1) contrast(1.05) brightness(1.05)" : "none",
      }}>
        <Canvas
          camera={{ position: cameraPos, fov: 28 }}
          style={{ position: "absolute", inset: 0, background: "transparent" }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} />
          <CameraController normalPos={cameraPos} />
          <OrbitControls
            target={[0, 2, 0]}
            enablePan
            enableZoom
            enableRotate
            autoRotate
            autoRotateSpeed={0.6}
            minPolarAngle={Math.PI * 0.05}
            maxPolarAngle={Math.PI * 0.38}
            minDistance={12}
            maxDistance={70}
            mouseButtons={{
              LEFT:   THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.PAN,
              RIGHT:  THREE.MOUSE.DOLLY,
            }}
            keyPanSpeed={20}
          />
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
