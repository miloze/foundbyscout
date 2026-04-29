"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
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

function PingPongCamera({ posA, posB, target }: {
  posA: [number, number, number];
  posB: [number, number, number];
  target: [number, number, number];
}) {
  const { camera } = useThree();
  const t   = useRef(0);
  const dir = useRef(1);
  const look = new THREE.Vector3(...target);

  // Quadratic Bezier: control point = midpoint pushed away from the target
  const vA   = new THREE.Vector3(...posA);
  const vB   = new THREE.Vector3(...posB);
  const vT   = new THREE.Vector3(...target);
  const mid     = new THREE.Vector3().addVectors(vA, vB).multiplyScalar(0.5);
  const awayXZ  = new THREE.Vector3().subVectors(mid, vT).setY(0).normalize().multiplyScalar(32);
  const ctrl    = new THREE.Vector3().addVectors(mid, awayXZ).setY(mid.y);

  const curve = new THREE.QuadraticBezierCurve3(vA, ctrl, vB);
  const point = new THREE.Vector3();

  useFrame((_, delta) => {
    t.current += delta * 0.025 * dir.current;
    if (t.current >= 1) { t.current = 1; dir.current = -1; }
    if (t.current <= 0) { t.current = 0; dir.current =  1; }

    // Smoothstep easing
    const s = t.current * t.current * (3 - 2 * t.current);
    curve.getPoint(s, point);
    camera.position.copy(point);
    camera.lookAt(look);
  });

  return null;
}

export default function ParkModel({
  modelFile,
  cameraPos     = [0, 18, 25],
  cameraTarget  = [0, 0, 0],
  modelRotation = [-Math.PI / 2, 0, 0] as [number, number, number],
  pingPong,
  autoRotate,
  fov           = 50,
}: {
  modelFile: string;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
  pingPong?: [[number, number, number], [number, number, number]];
  autoRotate?: boolean;
  fov?: number;
}) {
  const [loaded,   setLoaded]   = useState(false);
  const [viewMode, setViewMode] = useState<"bw" | "colour">("bw");

  const filter = viewMode === "bw" ? "grayscale(1) contrast(1.1)" : "none";

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
        camera={{ position: pingPong ? pingPong[0] : cameraPos, fov }}
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
          <Model onLoad={() => setLoaded(true)} modelFile={modelFile} modelRotation={modelRotation} rotate={autoRotate ?? !pingPong} />
        </Suspense>
        {pingPong && (
          <PingPongCamera posA={pingPong[0]} posB={pingPong[1]} target={cameraTarget} />
        )}
      </Canvas>
    </div>
  );
}
