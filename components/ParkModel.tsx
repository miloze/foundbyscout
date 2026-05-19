"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";

// Coerce to numbers — Supabase numeric[] returns strings
const n = (v: unknown[]): [number, number, number] => [+v[0]!, +v[1]!, +v[2]!];

// Draco decoder (handles both compressed and uncompressed GLBs)
useGLTF.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");

// ── Mesh ───────────────────────────────────────────────────────────────────
function Model({ onLoad, modelFile, modelRotation }: {
  onLoad: () => void;
  modelFile: string;
  modelRotation: [number, number, number];
}) {
  const { scene } = useGLTF(modelFile);
  const ref = useRef<Group>(null);
  useEffect(() => {
    // Force double-sided on all materials so backface culling
    // doesn't cause polygons to vanish on photogrammetry meshes
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;

        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(m => {
          const mat = m as THREE.Material;
          mat.side        = THREE.DoubleSide;
          mat.transparent = false;
          mat.depthWrite  = true;
          mat.needsUpdate = true;
        });
      }
    });
    onLoad();
  }, [scene, onLoad]);
  return (
    <group ref={ref}>
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

// ── Pan clamp — limits how far the user can pan from the origin ───────────
const PAN_LIMIT = 18;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PanClamp({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  useFrame(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const t  = ctrl.target;
    const cx = Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, t.x));
    const cy = Math.max(-4,         Math.min(12,         t.y));
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

// ── Debug live camera readout ──────────────────────────────────────────────
function LivePos({ onPos }: { onPos: (s: string) => void }) {
  const { camera } = useThree();
  const last = useRef("");
  useFrame(() => {
    const { x, y, z } = camera.position;
    const s = `[${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}]`;
    if (s !== last.current) { last.current = s; onPos(s); }
  });
  return null;
}

// ── Main export ────────────────────────────────────────────────────────────
export default function ParkModel({
  modelFile,
  cameraPos     = [0, 18, 25],
  cameraTarget  = [0, 0, 0],
  modelRotation = [-Math.PI / 2, 0, 0] as [number, number, number],
  pingPong,
  autoRotate    = false,
  debug         = false,
  fov           = 50,
}: {
  modelFile: string;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  pingPong?: [[number, number, number], [number, number, number]];
  autoRotate?: boolean;
  debug?: boolean;
  fov?: number;
}) {
  const [loaded,   setLoaded]   = useState(false);
  const [viewMode, setViewMode] = useState<"bw" | "colour">("bw");
  const [camPos,   setCamPos]   = useState("loading…");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);

  const startPos    = [+cameraPos[0], +cameraPos[1], +cameraPos[2]] as [number, number, number];
  const filter      = viewMode === "bw" ? "grayscale(1) contrast(1.1)" : "none";
  const canvasStart = pingPong ? n(pingPong[0]) : startPos;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>

      {/* ── B&W / CLR toggle ──────────────────────────────────────────── */}
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 11, display: "flex", gap: 2 }}>
        {(["bw", "colour"] as const).map(mode => (
          <button key={mode} onClick={() => setViewMode(mode)} style={{
            padding: "5px 12px", border: "none", cursor: "pointer",
            background: viewMode === mode ? "var(--accent)" : "rgba(0,0,0,0.55)",
            color: "#fff", fontFamily: "monospace", fontSize: 10,
            letterSpacing: "0.1em", borderRadius: 2,
          }}>
            {mode === "bw" ? "B&W" : "CLR"}
          </button>
        ))}
      </div>

      {/* ── Debug overlay ─────────────────────────────────────────────── */}
      {debug && (
        <div style={{
          position: "absolute", bottom: 80, left: 12, zIndex: 20,
          background: "rgba(0,0,0,0.75)", color: "#0f0", padding: "10px 14px",
          fontFamily: "monospace", fontSize: 12, lineHeight: 1.8,
          borderRadius: 4, pointerEvents: "none",
        }}>
          <div style={{ color: "#aaa", fontSize: 10, marginBottom: 4 }}>CAMERA POSITION</div>
          <div>{camPos}</div>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {!loaded && (
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

      {/* ── Canvas ────────────────────────────────────────────────────── */}
      <Canvas
        camera={{ position: canvasStart, fov, near: 0.5, far: 400 }}
        style={{ position: "absolute", inset: 0, filter, transition: "filter 0.4s ease" }}
        gl={{ antialias: true, alpha: true, logarithmicDepthBuffer: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[-15, 40, 15]} intensity={7.0} color="#ffffff" />
        <directionalLight position={[20, 5, 10]}  intensity={1.5} color="#d0e4ff" />
        <directionalLight position={[0, 10, -20]} intensity={2.0} color="#ffffff" />
        <pointLight position={[0, 15, 0]} intensity={3.0} color="#ffffff" />
        <pointLight position={[0, -8, 0]} intensity={2.5} color="#ff7040" />

        <Suspense fallback={null}>
          <Model
            onLoad={() => setLoaded(true)}
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
          autoRotate={autoRotate && !debug}
          autoRotateSpeed={0.6}
          minDistance={debug ? 1 : 8}
          maxDistance={debug ? 500 : 80}
          minPolarAngle={debug ? 0 : Math.PI / 12}
          maxPolarAngle={debug ? Math.PI : Math.PI / 2.2}
        />

        {/* Pan clamp — keeps user from panning off the model */}
        {!pingPong && !debug && <PanClamp controlsRef={controlsRef} />}

        {debug && <LivePos onPos={setCamPos} />}
      </Canvas>
    </div>
  );
}
