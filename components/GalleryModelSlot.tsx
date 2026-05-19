"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

useGLTF.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");

// ── Live camera position readout ───────────────────────────────────────────
function LivePos({ onPos }: { onPos: (s: string) => void }) {
  const { camera } = useThree();
  const last = useRef("");
  useFrame(() => {
    const { x, y, z } = camera.position;
    const s = `[${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`;
    if (s !== last.current) { last.current = s; onPos(s); }
  });
  return null;
}

// ── GLB model ─────────────────────────────────────────────────────────────
function Model({ modelFile, onLoad }: {
  modelFile: string;
  onLoad: (obj: THREE.Group) => void;
}) {
  const { scene } = useGLTF(modelFile);
  const fixed = useRef(false);

  if (!fixed.current) {
    fixed.current = true;
    scene.traverse(child => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(m => {
        const mat = m as THREE.Material;
        mat.side        = THREE.DoubleSide;
        mat.transparent = false;
        mat.depthWrite  = true;
        mat.needsUpdate = true;
      });
    });
    onLoad(scene);
  }

  return <primitive object={scene} />;
}

// ── Scene ─────────────────────────────────────────────────────────────────
type FitInfo = { center: THREE.Vector3; maxDim: number };

function SceneContent({ modelFile, debug, onPos, fixedPos }: {
  modelFile: string;
  debug: boolean;
  onPos: (s: string) => void;
  fixedPos?: [number, number, number];
}) {
  const { camera } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const [fit, setFit] = useState<FitInfo | null>(null);

  function handleLoad(obj: THREE.Group) {
    const box    = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    if (fixedPos) {
      camera.position.set(...fixedPos);
    } else {
      const fovRad = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
      const dist   = (maxDim / 2) / Math.tan(fovRad / 2) * 0.85;
      camera.position.set(center.x, center.y + dist * 0.2, center.z + dist * 0.9);
    }

    (camera as THREE.PerspectiveCamera).far = maxDim * 100;
    camera.lookAt(center);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }

    setFit({ center, maxDim });
  }

  const d = fit?.maxDim ?? 1;
  const c = fit?.center ?? new THREE.Vector3();

  return (
    <>
      <ambientLight intensity={0.6} />
      {fit && (
        <>
          <hemisphereLight args={["#fff8f0", "#806040", 0.5]} />
          <directionalLight position={[c.x - d, c.y + d * 2, c.z + d]}               intensity={0.8} color="#ffffff" />
          <directionalLight position={[c.x + d * 1.5, c.y + d * 0.5, c.z + d * 0.5]} intensity={0.4} color="#ffd0b0" />
          <directionalLight position={[c.x, c.y + d * 0.8, c.z - d * 1.5]}            intensity={0.6} color="#e8f0ff" />
        </>
      )}
      <Suspense fallback={null}>
        <Model modelFile={modelFile} onLoad={handleLoad} />
      </Suspense>
      <OrbitControls
        ref={controlsRef}
        enablePan={debug}
        enableZoom={debug}
        enableRotate={debug}
        autoRotate={!debug}
        autoRotateSpeed={2.5}
        mouseButtons={debug ? { LEFT: 0, MIDDLE: 1, RIGHT: 2 } : undefined}
      />
      {debug && <LivePos onPos={onPos} />}
    </>
  );
}

// ── Export ────────────────────────────────────────────────────────────────
export default function GalleryModelSlot({
  modelFile,
  background  = "#ff5841",
  debug       = true,
  brightness  = 100,
  contrast    = 140,
  fixedPos    = [-10.3, 4.1, 2.6] as [number, number, number],
}: {
  modelFile:   string;
  background?: string;
  debug?:      boolean;
  brightness?: number;
  contrast?:   number;
  fixedPos?:   [number, number, number];
}) {
  const [pos,        setPos]        = useState("");
  const [localBri,   setLocalBri]   = useState(brightness);
  const [localCon,   setLocalCon]   = useState(contrast);

  const canvasFilter = `brightness(${localBri}%) contrast(${localCon}%)`;

  return (
    <div style={{ position: "absolute", inset: 0, background }}>
      <Canvas
        camera={{ position: [0, 1, 3], fov: 16, near: 0.01, far: 100000 }}
        style={{ position: "absolute", inset: 0, filter: canvasFilter, transition: "filter 0.7s ease" }}
        gl={{ antialias: true, alpha: true, logarithmicDepthBuffer: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.7;
        }}
      >
        <SceneContent modelFile={modelFile} debug={debug} onPos={setPos} fixedPos={fixedPos} />
      </Canvas>

      {debug && (
        <div style={{
          position: "absolute", bottom: 8, left: 8,
          background: "rgba(0,0,0,0.7)", color: "#fff",
          fontFamily: "monospace", fontSize: 10,
          padding: "8px 12px", lineHeight: 2,
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {pos && (
            <div style={{ color: "#0f0", marginBottom: 4 }}>
              pos {pos}<br />
              <span style={{ color: "#666" }}>orbit · right-drag pan · scroll zoom</span>
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 70, color: "#aaa" }}>Brightness</span>
            <input type="range" min={0} max={200} value={localBri}
              onChange={e => setLocalBri(+e.target.value)}
              style={{ width: 100, accentColor: "#ff5841" }} />
            <span style={{ width: 32, color: "#fff" }}>{localBri}%</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 70, color: "#aaa" }}>Contrast</span>
            <input type="range" min={0} max={200} value={localCon}
              onChange={e => setLocalCon(+e.target.value)}
              style={{ width: 100, accentColor: "#ff5841" }} />
            <span style={{ width: 32, color: "#fff" }}>{localCon}%</span>
          </label>
        </div>
      )}
    </div>
  );
}
