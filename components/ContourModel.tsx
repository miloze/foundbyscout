"use client";

import { Suspense, useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader } from "three";

// ── Heightmap contour shader ───────────────────────────────────────────────
const contourVert = /* glsl */`
  varying vec3 vWorldPos;

  void main() {
    vec4 wp    = modelMatrix * vec4(position, 1.0);
    vWorldPos  = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const contourFrag = /* glsl */`
  uniform sampler2D uHeightMap;
  uniform vec2      uMin;
  uniform vec2      uMax;
  uniform vec3      uColor;
  uniform float     uDebug;          // 0=normal  1=UV debug
  uniform vec2      uOffset;
  uniform vec2      uScale;
  uniform float     uRotation;
  uniform float     uFlipX;
  uniform float     uFlipY;
  uniform float     uSwapXY;
  uniform vec2      uTexelSize;
  uniform float     uBlur;
  // Height layer
  uniform float     uHeightOpacity;
  uniform float     uHeightBrightness;
  uniform float     uHeightContrast;
  // Contour layer
  uniform float     uLineOpacity;
  uniform float     uLineContrast;
  uniform float     uFrequency;
  uniform float     uLineWidth;

  varying vec3 vWorldPos;

  void main() {
    float normX = (vWorldPos.x - uMin.x) / (uMax.x - uMin.x);
    float normZ = (vWorldPos.z - uMin.y) / (uMax.y - uMin.y);

    if (uFlipX  > 0.5) normX = 1.0 - normX;
    if (uFlipY  > 0.5) normZ = 1.0 - normZ;
    vec2 uv = uSwapXY > 0.5 ? vec2(normZ, normX) : vec2(normX, normZ);

    float cr = cos(uRotation), sr = sin(uRotation);
    vec2 c = uv - 0.5;
    uv = vec2(cr * c.x - sr * c.y, sr * c.x + cr * c.y) + 0.5;

    uv = uv * uScale + uOffset;
    uv = clamp(uv, 0.0, 1.0);

    if (uDebug > 0.5) { gl_FragColor = vec4(uv.x, uv.y, 0.0, 1.0); return; }

    // 5x5 box blur
    float h = 0.0;
    for (int dx = -2; dx <= 2; dx++) {
      for (int dy = -2; dy <= 2; dy++) {
        vec2 off = vec2(float(dx), float(dy)) * uTexelSize * uBlur;
        h += texture2D(uHeightMap, clamp(uv + off, 0.0, 1.0)).r;
      }
    }
    h /= 25.0;

    // ── Height layer: independent brightness + contrast ───────────────────
    float hDisp = clamp((h - 0.5) * uHeightContrast + 0.5, 0.0, 1.0) * uHeightBrightness;

    // ── Contour layer: independent contrast → line generation ────────────
    float hLine = clamp((h - 0.5) * uLineContrast + 0.5, 0.0, 1.0);
    float f     = hLine * uFrequency;
    float df    = fwidth(f);
    float dist  = abs(fract(f + 0.5) - 0.5);
    float line  = (1.0 - smoothstep(0.0, df * uLineWidth, dist)) * uLineOpacity;

    // ── Composite ─────────────────────────────────────────────────────────
    vec3  finalColor = mix(vec3(hDisp), uColor, line);
    float finalAlpha = max(line, uHeightOpacity);
    if (finalAlpha < 0.01) discard;
    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

// ── Camera controller ──────────────────────────────────────────────────────
function CameraController({
  planView,
  normalPos,
}: {
  planView: boolean;
  normalPos: [number, number, number];
}) {
  const { camera } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (planView) {
      camera.position.set(0, 200, 0);
      camera.up.set(0, 0, -1);
      cam.fov = 20;
    } else {
      camera.position.set(...normalPos);
      camera.up.set(0, 1, 0);
      cam.fov = 28;
    }
    camera.lookAt(0, 2, 0);
    cam.updateProjectionMatrix();
  }, [planView, camera, normalPos]);
  return null;
}

// ── Mesh component ─────────────────────────────────────────────────────────
type Uniforms = Record<string, { value: unknown }>;

function ContourMesh({
  url, heightMapUrl, onLoad, onUniformsReady, onApplySavedProj, modelRotation, lineColor, viewMode,
}: {
  url: string;
  heightMapUrl: string;
  onLoad: () => void;
  onUniformsReady: (u: Uniforms) => void;
  onApplySavedProj: (u: Uniforms) => void;
  modelRotation: [number, number, number];
  lineColor: string;
  viewMode: "contour" | "bw" | "colour";
}) {
  const { scene: rawScene } = useGLTF(url);
  const scene = useMemo(() => rawScene.clone(true), [rawScene]);
  const heightTex = useLoader(TextureLoader, heightMapUrl);
  const contourRef   = useRef<THREE.ShaderMaterial | null>(null);
  const occludersRef = useRef<THREE.Mesh[]>([]);
  const meshEntries  = useRef<{ mesh: THREE.Mesh; origMat: THREE.Material | THREE.Material[] }[]>([]);

  // Always-current refs so setup effect can read them without re-running
  const viewModeRef        = useRef(viewMode);
  const onApplySavedProjRef = useRef(onApplySavedProj);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);
  useEffect(() => { onApplySavedProjRef.current = onApplySavedProj; }, [onApplySavedProj]);

  // Core mode-apply logic — reads from refs, can be called any time after setup
  const applyMode = useCallback((mode: "contour" | "bw" | "colour") => {
    const mat     = contourRef.current;
    const entries = meshEntries.current;
    if (!mat || entries.length === 0) return;

    if (mode === "colour" || mode === "bw") {
      entries.forEach(({ mesh, origMat }) => {
        mesh.material   = origMat;
        mesh.renderOrder = 0;
      });
      occludersRef.current.forEach(o => { o.visible = false; });
    } else {
      entries.forEach(({ mesh }) => {
        mesh.material   = mat;
        mesh.renderOrder = 1;
      });
      occludersRef.current.forEach(o => { o.visible = true; });
      onApplySavedProjRef.current(mat.uniforms as Uniforms);
    }
  }, []);

  // Re-apply whenever viewMode prop changes
  useEffect(() => { applyMode(viewMode); }, [viewMode, applyMode]);

  // Line colour update
  useEffect(() => {
    const c = new THREE.Color(lineColor);
    if (contourRef.current) contourRef.current.uniforms.uColor.value.copy(c);
  }, [lineColor]);

  // One-time setup: build shader + occluder meshes
  useEffect(() => {
    const contourMat = new THREE.ShaderMaterial({
      vertexShader: contourVert,
      fragmentShader: contourFrag,
      uniforms: {
        uHeightMap:  { value: heightTex },
        uMin:        { value: new THREE.Vector2() },
        uMax:        { value: new THREE.Vector2() },
        uFrequency:  { value: 20.0 },
        uLineWidth:  { value: 0.6 },
        uColor:      { value: new THREE.Color(lineColor) },
        uDebug:      { value: 1.0 },
        uOffset:     { value: new THREE.Vector2(0, 0) },
        uScale:      { value: new THREE.Vector2(1, 1) },
        uRotation:   { value: 0.0 },
        uFlipX:      { value: 0.0 },
        uFlipY:      { value: 0.0 },
        uSwapXY:     { value: 0.0 },
        uTexelSize:  { value: new THREE.Vector2(
          1 / (heightTex.image?.width  ?? 512),
          1 / (heightTex.image?.height ?? 512),
        )},
        uBlur:             { value: 0.0 },
        uHeightOpacity:    { value: 0.5 },
        uHeightBrightness: { value: 1.0 },
        uHeightContrast:   { value: 1.0 },
        uLineOpacity:      { value: 1.0 },
        uLineContrast:     { value: 1.0 },
      },
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    // Compute world bounding box for projection
    scene.updateMatrixWorld(true);
    const worldBox = new THREE.Box3();
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (!m.geometry) return;
        m.geometry.computeBoundingBox();
        const b = m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld);
        worldBox.union(b);
      }
    });
    (contourMat.uniforms.uMin.value as THREE.Vector2).set(worldBox.min.x, worldBox.min.z);
    (contourMat.uniforms.uMax.value as THREE.Vector2).set(worldBox.max.x, worldBox.max.z);

    contourRef.current = contourMat;

    const occluderMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#2a2a2a"),
      colorWrite: true,
      depthWrite: true,
      side: THREE.FrontSide,
    });

    const toAdd: { parent: THREE.Object3D; obj: THREE.Mesh }[] = [];
    meshEntries.current = [];
    occludersRef.current = [];

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!mesh.geometry || !mesh.parent) return;

        // origMat: whatever is on the mesh NOW — before we touch it.
        // The clone is always fresh (useMemo re-runs when scene/heightTex change),
        // so this is the original GLB material on first run and any re-run.
        meshEntries.current.push({ mesh, origMat: mesh.material });

        const occluder = new THREE.Mesh(mesh.geometry, occluderMat);
        occluder.position.copy(mesh.position);
        occluder.rotation.copy(mesh.rotation);
        occluder.scale.copy(mesh.scale);
        occluder.renderOrder = 0;
        toAdd.push({ parent: mesh.parent, obj: occluder });
        occludersRef.current.push(occluder);

        mesh.material   = contourMat;
        mesh.renderOrder = 1;
      }
    });

    toAdd.forEach(({ parent, obj }) => parent.add(obj));
    onUniformsReady(contourMat.uniforms as Uniforms);
    onApplySavedProjRef.current(contourMat.uniforms as Uniforms);
    onLoad();

    // Apply the current viewMode now that entries are populated
    applyMode(viewModeRef.current);

    return () => {
      // Restore original materials before disposing so the clone is pristine if re-used
      meshEntries.current.forEach(({ mesh, origMat }) => {
        mesh.material = origMat;
      });
      contourMat.dispose();
      occluderMat.dispose();
      toAdd.forEach(({ obj }) => { obj.parent?.remove(obj); });
      meshEntries.current = [];
      occludersRef.current = [];
      contourRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, heightTex]);

  return (
    <group>
      <primitive object={scene} rotation={modelRotation} position={[0, 4, 0]} />
    </group>
  );
}

// ── Projection state ───────────────────────────────────────────────────────
interface ProjState {
  rotation: number;   // degrees
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  flipX: boolean;
  flipY: boolean;
  swapXY: boolean;
  debug: number;      // 0=normal  1=UV debug
  // Height layer
  heightOpacity: number;
  heightBrightness: number;
  heightContrast: number;
  // Contour layer
  lineOpacity: number;
  lineContrast: number;
  frequency: number;
  lineWidth: number;
  blur: number;
}

const DEFAULT_PROJ: ProjState = {
  rotation: -0.65,
  scaleX: 0.9355,
  scaleY: 0.9460,
  offsetX: 0.0325,
  offsetY: 0.0325,
  flipX: false,
  flipY: true,
  swapXY: false,
  debug: 0,
  heightOpacity: 0.5,
  heightBrightness: 1,
  heightContrast: 1,
  lineOpacity: 1,
  lineContrast: 1,
  frequency: 20,
  lineWidth: 0.6,
  blur: 0,
};

const LS_KEY = "contour_proj_v8";

function loadProj(): ProjState {
  if (typeof window === "undefined") return DEFAULT_PROJ;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_PROJ, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PROJ;
}

function saveProj(p: ProjState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch {}
}

// ── Main export ────────────────────────────────────────────────────────────
const DEFAULT_CAMERA_POS:     [number, number, number] = [-37.9, 38, 36.7];
const DEFAULT_MODEL_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];

export default function ContourModel({
  modelFile,
  heightMapFile,
  lineColor     = "#ffffff",
  cameraPos     = DEFAULT_CAMERA_POS,
  modelRotation = DEFAULT_MODEL_ROTATION,
}: {
  modelFile: string;
  heightMapFile: string;
  lineColor?: string;
  cameraPos?: [number, number, number];
  modelRotation?: [number, number, number];
}) {
  const [loaded,         setLoaded]         = useState(false);
  const [planView,       setPlanView]       = useState(false);
  const [showPanel,      setShowPanel]      = useState(false);
  const [proj,           setProj]           = useState<ProjState>(loadProj);
  const [viewMode,       setViewMode]       = useState<"contour" | "bw" | "colour">("contour");
  const uniforms = useRef<Uniforms | null>(null);

  // Sync a partial update to both React state (CSS overlay) and shader uniforms
  const updateProj = useCallback((patch: Partial<ProjState>) => {
    setProj(prev => {
      const next = { ...prev, ...patch };
      saveProj(next);
      const u = uniforms.current;
      if (u) {
        (u.uRotation  as { value: number }).value = (next.rotation * Math.PI) / 180;
        (u.uScale.value  as THREE.Vector2).set(next.scaleX, next.scaleY);
        (u.uOffset.value as THREE.Vector2).set(next.offsetX, next.offsetY);
        (u.uFlipX            as { value: number }).value = next.flipX  ? 1.0 : 0.0;
        (u.uFlipY            as { value: number }).value = next.flipY  ? 1.0 : 0.0;
        (u.uSwapXY           as { value: number }).value = next.swapXY ? 1.0 : 0.0;
        (u.uDebug            as { value: number }).value = next.debug;
        (u.uHeightOpacity    as { value: number }).value = next.heightOpacity;
        (u.uHeightBrightness as { value: number }).value = next.heightBrightness;
        (u.uHeightContrast   as { value: number }).value = next.heightContrast;
        (u.uLineOpacity      as { value: number }).value = next.lineOpacity;
        (u.uLineContrast     as { value: number }).value = next.lineContrast;
        (u.uFrequency        as { value: number }).value = next.frequency;
        (u.uLineWidth        as { value: number }).value = next.lineWidth;
        (u.uBlur             as { value: number }).value = next.blur;
      }
      return next;
    });
  }, []);

  // Apply saved proj values to freshly-created shader uniforms
  const applySavedProj = useCallback((u: Uniforms) => {
    const p = loadProj();
    (u.uRotation  as { value: number }).value = (p.rotation * Math.PI) / 180;
    (u.uScale.value  as THREE.Vector2).set(p.scaleX, p.scaleY);
    (u.uOffset.value as THREE.Vector2).set(p.offsetX, p.offsetY);
    (u.uFlipX            as { value: number }).value = p.flipX  ? 1.0 : 0.0;
    (u.uFlipY            as { value: number }).value = p.flipY  ? 1.0 : 0.0;
    (u.uSwapXY           as { value: number }).value = p.swapXY ? 1.0 : 0.0;
    (u.uDebug            as { value: number }).value = p.debug;
    (u.uHeightOpacity    as { value: number }).value = p.heightOpacity;
    (u.uHeightBrightness as { value: number }).value = p.heightBrightness;
    (u.uHeightContrast   as { value: number }).value = p.heightContrast;
    (u.uLineOpacity      as { value: number }).value = p.lineOpacity;
    (u.uLineContrast     as { value: number }).value = p.lineContrast;
    (u.uFrequency        as { value: number }).value = p.frequency;
    (u.uLineWidth        as { value: number }).value = p.lineWidth;
    (u.uBlur             as { value: number }).value = p.blur;
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>

      {/* ── View mode toggle — top right ───────────────────────────────── */}
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 11, display: "flex", gap: 2 }}>
        {([
          { mode: "contour", label: "TOPO" },
          { mode: "bw",      label: "B&W"  },
          { mode: "colour",  label: "CLR"  },
        ] as const).map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: "5px 10px", border: "none", cursor: "pointer",
              background: viewMode === mode ? "rgba(255,88,65,0.95)" : "rgba(0,0,0,0.65)",
              color: "#fff", fontFamily: "monospace", fontSize: 10,
              letterSpacing: "0.1em", borderRadius: 2,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Panel toggle — bottom right ─────────────────────────────────── */}
      <button
        onClick={() => setShowPanel(v => !v)}
        style={{
          position: "absolute", bottom: 12, right: 12, zIndex: 11,
          background: "rgba(0,0,0,0.75)", color: "#fff", border: "none",
          fontFamily: "monospace", fontSize: 10, padding: "5px 10px",
          cursor: "pointer", letterSpacing: "0.08em",
        }}
      >
        {showPanel ? "× close" : "⚙ settings"}
      </button>

      {/* ── Debug panel ────────────────────────────────────────────────── */}
      {showPanel && <div
        style={{
          position: "absolute", top: 40, right: 12, zIndex: 10,
          background: "rgba(0,0,0,0.88)", color: "#fff",
          padding: "12px 14px", fontFamily: "monospace", fontSize: 11,
          display: "flex", flexDirection: "column", gap: 7, minWidth: 320,
          maxHeight: "80vh", overflowY: "auto",
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        <b style={{ marginBottom: 2, fontSize: 12 }}>Projection</b>

        {/* Plan view toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={planView}
            onChange={e => setPlanView(e.target.checked)}
          />
          Plan view (top-down)
        </label>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.15)", margin: "2px 0" }} />

        {/* Rotation (degrees) */}
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span>Rotation&nbsp;<span style={{ color: "#aaa" }}>{proj.rotation.toFixed(2)}°</span></span>
          <input
            type="range" min={-180} max={180} step={0.05} value={proj.rotation}
            style={{ width: "100%" }}
            onInput={e => updateProj({ rotation: parseFloat((e.target as HTMLInputElement).value) })}
          />
        </label>

        {/* Scale X */}
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span>Scale X&nbsp;<span style={{ color: "#aaa" }}>{proj.scaleX.toFixed(4)}</span></span>
          <input
            type="range" min={0.1} max={3} step={0.0005} value={proj.scaleX}
            style={{ width: "100%" }}
            onInput={e => updateProj({ scaleX: parseFloat((e.target as HTMLInputElement).value) })}
          />
        </label>

        {/* Scale Y */}
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span>Scale Y&nbsp;<span style={{ color: "#aaa" }}>{proj.scaleY.toFixed(4)}</span></span>
          <input
            type="range" min={0.1} max={3} step={0.0005} value={proj.scaleY}
            style={{ width: "100%" }}
            onInput={e => updateProj({ scaleY: parseFloat((e.target as HTMLInputElement).value) })}
          />
        </label>

        {/* Offset X */}
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span>Offset X&nbsp;<span style={{ color: "#aaa" }}>{proj.offsetX.toFixed(4)}</span></span>
          <input
            type="range" min={-1} max={1} step={0.0005} value={proj.offsetX}
            style={{ width: "100%" }}
            onInput={e => updateProj({ offsetX: parseFloat((e.target as HTMLInputElement).value) })}
          />
        </label>

        {/* Offset Y */}
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span>Offset Y&nbsp;<span style={{ color: "#aaa" }}>{proj.offsetY.toFixed(4)}</span></span>
          <input
            type="range" min={-1} max={1} step={0.0005} value={proj.offsetY}
            style={{ width: "100%" }}
            onInput={e => updateProj({ offsetY: parseFloat((e.target as HTMLInputElement).value) })}
          />
        </label>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.15)", margin: "2px 0" }} />

        {/* Flip / Swap toggles */}
        {(["flipX", "flipY", "swapXY"] as const).map(key => (
          <label key={key} style={{ display: "flex", gap: 8, cursor: "pointer", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={proj[key] as boolean}
              onChange={e => updateProj({ [key]: e.target.checked })}
            />
            {key === "flipX" ? "Flip X" : key === "flipY" ? "Flip Y" : "Swap XY"}
          </label>
        ))}

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.15)", margin: "2px 0" }} />

        {/* UV debug toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={proj.debug > 0.5}
            onChange={e => updateProj({ debug: e.target.checked ? 1 : 0 })}
          />
          UV debug
        </label>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.15)", margin: "2px 0" }} />
        <b style={{ marginBottom: 2, fontSize: 12 }}>Heightfield</b>

        {[
          { label: "Opacity",    key: "heightOpacity",    min: 0,   max: 1,  step: 0.01, dp: 2 },
          { label: "Brightness", key: "heightBrightness", min: 0,   max: 3,  step: 0.02, dp: 2 },
          { label: "Contrast",   key: "heightContrast",   min: 0.1, max: 5,  step: 0.05, dp: 2 },
        ].map(({ label, key, min, max, step, dp }) => (
          <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span>{label}&nbsp;<span style={{ color: "#aaa" }}>{(proj[key as keyof ProjState] as number).toFixed(dp)}</span></span>
            <input
              type="range" min={min} max={max} step={step} value={proj[key as keyof ProjState] as number}
              style={{ width: "100%" }}
              onInput={e => updateProj({ [key]: parseFloat((e.target as HTMLInputElement).value) })}
            />
          </label>
        ))}

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.15)", margin: "2px 0" }} />
        <b style={{ marginBottom: 2, fontSize: 12 }}>Contours</b>

        {[
          { label: "Opacity",    key: "lineOpacity",  min: 0,   max: 1,  step: 0.01, dp: 2 },
          { label: "Contrast",   key: "lineContrast", min: 0.1, max: 5,  step: 0.05, dp: 2 },
          { label: "Bands",      key: "frequency",    min: 1,   max: 80, step: 1,    dp: 0 },
          { label: "Pre-blur",   key: "blur",         min: 0,   max: 20, step: 0.1,  dp: 1 },
          { label: "Line width", key: "lineWidth",    min: 0.1, max: 5,  step: 0.05, dp: 2 },
        ].map(({ label, key, min, max, step, dp }) => (
          <label key={key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span>{label}&nbsp;<span style={{ color: "#aaa" }}>{(proj[key as keyof ProjState] as number).toFixed(dp)}</span></span>
            <input
              type="range" min={min} max={max} step={step} value={proj[key as keyof ProjState] as number}
              style={{ width: "100%" }}
              onInput={e => updateProj({ [key]: parseFloat((e.target as HTMLInputElement).value) })}
            />
          </label>
        ))}
      </div>}

      {/* ── Loading state ───────────────────────────────────────────────── */}
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

      {/* ── Canvas ──────────────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0,
        transition: "opacity 1s ease, filter 0.3s ease",
        opacity: loaded ? 1 : 0,
        filter: viewMode === "bw" ? "grayscale(1)" : "none",
      }}>
        <Canvas
          camera={{ position: cameraPos, fov: 28 }}
          style={{ position: "absolute", inset: 0, background: "transparent" }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} />
          <CameraController planView={planView} normalPos={cameraPos} />
          <OrbitControls
            target={[0, 2, 0]}
            enablePan
            enableZoom
            enableRotate
            autoRotate
            autoRotateSpeed={0.6}
            minPolarAngle={Math.PI * 0.05}
            maxPolarAngle={Math.PI * 0.38}
            mouseButtons={{
              LEFT:   THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.PAN,
              RIGHT:  THREE.MOUSE.DOLLY,
            }}
            keyPanSpeed={20}
          />
          <Suspense fallback={null}>
            <ContourMesh
              url={modelFile}
              heightMapUrl={heightMapFile}
              onLoad={() => setLoaded(true)}
              onUniformsReady={u => { uniforms.current = u; }}
              onApplySavedProj={applySavedProj}
              modelRotation={modelRotation}
              lineColor={lineColor}
              viewMode={viewMode}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
