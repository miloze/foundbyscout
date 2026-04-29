"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";

function Model({ onLoad, modelFile, modelRotation, rotate }: { onLoad: () => void; modelFile: string; modelRotation: [number, number, number]; rotate: boolean }) {
  const { scene } = useGLTF(modelFile);
  const turntable = useRef<Group>(null);
  useEffect(() => { onLoad(); }, [onLoad]);

  useFrame((_, delta) => {
    if (rotate && turntable.current) turntable.current.rotation.y += delta * 0.1;
  });

  return (
    <group ref={turntable}>
      <primitive object={scene} rotation={modelRotation} position={[0, 4, 0]} />
    </group>
  );
}

// Coerce to numbers — Supabase numeric[] returns strings
const n = (v: unknown[]): [number, number, number] => [+v[0]!, +v[1]!, +v[2]!];

function PingPongCamera({ posA, posB, target }: {
  posA: [number, number, number];
  posB: [number, number, number];
  target: [number, number, number];
}) {
  const { camera } = useThree();
  const t = useRef(-Math.PI / 2); // start at posA
  const look = new THREE.Vector3(...n(target));

  const [ax, ay, az] = n(posA);
  const [bx, by, bz] = n(posB);
  const radius = (Math.sqrt(ax * ax + az * az) + Math.sqrt(bx * bx + bz * bz)) / 2;
  const height = (ay + by) / 2;

  // Compute angles and force arc to stay on the same side as posA/posB (positive Z)
  let startAngle = Math.atan2(az, ax);
  let endAngle   = Math.atan2(bz, bx);
  // If going the wrong way (arc crosses negative Z), flip end angle
  if (endAngle < startAngle) endAngle += 2 * Math.PI;

  useFrame((_, delta) => {
    t.current += delta * 0.2;
    const s     = (Math.sin(t.current) + 1) / 2; // 0→1 oscillation
    const angle = startAngle + (endAngle - startAngle) * s;
    camera.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    camera.lookAt(look);
  });

  return null;
}

// Shows live camera XYZ in debug mode so you can find good ping-pong positions
function DebugCamera() {
  const { camera } = useThree();
  const [pos, setPos] = useState("…");

  useFrame(() => {
    const { x, y, z } = camera.position;
    setPos(`${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}`);
  });

  return (
    <mesh visible={false}>
      <boxGeometry />
      <meshBasicMaterial />
      {/* rendered via portal below */}
      <group userData={{ debugPos: pos }} />
    </mesh>
  );
}

function DebugOverlay() {
  const { camera } = useThree();
  const [pos, setPos] = useState({ x: 0, y: 0, z: 0 });

  useFrame(() => {
    setPos({ x: camera.position.x, y: camera.position.y, z: camera.position.z });
  });

  return (
    <mesh visible={false} userData={{ x: pos.x, y: pos.y, z: pos.z }} />
  );
}

export default function ParkModel({
  modelFile,
  cameraPos     = [0, 18, 25],
  cameraTarget  = [0, 0, 0],
  modelRotation = [-Math.PI / 2, 0, 0] as [number, number, number],
  pingPong,
  autoRotate,
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

  const filter = viewMode === "bw" ? "grayscale(1) contrast(1.1)" : "none";
  const startPos = pingPong
    ? [+pingPong[0][0], +pingPong[0][1], +pingPong[0][2]] as [number,number,number]
    : [+cameraPos[0], +cameraPos[1], +cameraPos[2]] as [number,number,number];

  function LivePos() {
    const { camera } = useThree();
    useFrame(() => {
      const { x, y, z } = camera.position;
      setCamPos(`[${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}]`);
    });
    return null;
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* B&W / CLR toggle */}
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

      {/* Debug overlay */}
      {debug && (
        <div style={{
          position: "absolute", bottom: 80, left: 12, zIndex: 20,
          background: "rgba(0,0,0,0.75)", color: "#0f0", padding: "10px 14px",
          fontFamily: "monospace", fontSize: 12, lineHeight: 1.8,
          borderRadius: 4, pointerEvents: "none",
        }}>
          <div style={{ color: "#aaa", fontSize: 10, marginBottom: 4 }}>CAMERA POSITION</div>
          <div>{camPos}</div>
          <div style={{ color: "#aaa", fontSize: 10, marginTop: 8 }}>Orbit to position A → note coords</div>
          <div style={{ color: "#aaa", fontSize: 10 }}>Orbit to position B → note coords</div>
          <div style={{ color: "#aaa", fontSize: 10 }}>Then update ping_pong in Supabase</div>
        </div>
      )}

      {!loaded && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "var(--muted)", fontSize: 11,
          textTransform: "uppercase", letterSpacing: "0.12em",
        }}>
          Loading model…
        </div>
      )}
      <Canvas
        camera={{ position: startPos, fov }}
        style={{ position: "absolute", inset: 0, filter, transition: "filter 0.4s ease" }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[-15, 40, 15]} intensity={7.0} color="#ffffff" />
        <directionalLight position={[20, 5, 10]}  intensity={1.5} color="#d0e4ff" />
        <directionalLight position={[0, 10, -20]} intensity={2.0} color="#ffffff" />
        <pointLight position={[0, 15, 0]} intensity={3.0} color="#ffffff" />
        <pointLight position={[0, -8, 0]} intensity={2.5} color="#ff7040" />
        <Suspense fallback={null}>
          <Model onLoad={() => setLoaded(true)} modelFile={modelFile} modelRotation={modelRotation} rotate={!debug && (autoRotate ?? !pingPong)} />
        </Suspense>
        {debug && (
          <>
            <OrbitControls enableZoom enablePan enableRotate target={n(cameraTarget)} />
            <LivePos />
          </>
        )}
        {!debug && pingPong && (
          <PingPongCamera posA={pingPong[0]} posB={pingPong[1]} target={cameraTarget} />
        )}
      </Canvas>
    </div>
  );
}
