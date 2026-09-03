"use client";

import { Suspense, useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import {
  MODEL_FLOOR_Y, clampTarget, heroFrame, limitsForAuthoredFrame, type HeroLimits,
} from "@/lib/heroCamera";

// Coerce to numbers — Supabase numeric[] returns strings
const n = (v: unknown[]): [number, number, number] => [+v[0]!, +v[1]!, +v[2]!];

useGLTF.setDecoderPath("/draco/");

// Session-scoped (not per-park) — once a visitor engages with any viewer
// this tab session, the drag hint shouldn't nag them again until a fresh visit.
const HINT_DISMISSED_KEY = "fbs-viewer-hint-dismissed";


// Keep original PBR materials — ambient-only lighting gives a flat
// baked-texture look. Fixes side/depthWrite so faces don't vanish.
function fixMaterials(scene: THREE.Object3D) {
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
}

// ── Mesh ───────────────────────────────────────────────────────────────────
function Model({ onLoad, onBounds, modelFile, modelRotation }: {
  onLoad: () => void;
  onBounds?: (topY: number) => void;
  modelFile: string;
  modelRotation: [number, number, number];
}) {
  const { scene } = useGLTF(modelFile);

  // Every caller of useGLTF for a given URL gets back the *same* Object3D, and
  // an Object3D has exactly one parent. Mounting the cached scene directly
  // meant the overlay's canvas did not copy the model, it took it: attaching
  // it there detached it from the hero's scene graph, and closing the overlay
  // left it parented to nothing, so the hero stayed black until a reload.
  // Two viewers of the same park are the normal case here, not an edge one.
  //
  // clone(true) copies the node hierarchy only — geometries and materials stay
  // shared by reference, so a second viewer costs a few hundred objects rather
  // than a second copy of the mesh data on the GPU.
  const model = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    // Run on the clone, not the cached original: materials are shared by
    // reference, so this still reaches every instance, but it also cannot
    // leave the cache holding a half-fixed scene if this one unmounts early.
    fixMaterials(model);
    // World-space top of the scan, used only to warn when a composed camera
    // would sit low enough to clip through it. Read after the primitive's own
    // transform is in place, so this is the lifted position, not the raw mesh.
    model.updateWorldMatrix(true, true);
    onBounds?.(new THREE.Box3().setFromObject(model).max.y);
    onLoad();
  }, [model, onLoad, onBounds]);

  return (
    <group>
      <primitive object={model} rotation={modelRotation} position={[0, MODEL_FLOOR_Y, 0]} />
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
// The vertical range starts at the floor, not at 0. maxPolarAngle keeps the
// camera above horizontal *relative to the target*, so a target panned below
// the deck drags the whole orbit cone under it — which is how you used to end
// up looking at the model from underneath.
function PanClamp({ controlsRef, limits }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: React.RefObject<any>;
  limits: HeroLimits;
}) {
  useFrame(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const t = ctrl.target;
    const c = clampTarget(t, limits);
    if (c.x !== t.x || c.y !== t.y || c.z !== t.z) {
      ctrl.object.position.add(c.clone().sub(t));
      t.copy(c);
      ctrl.update();
    }
  });
  return null;
}

// ── Debug: live camera position ────────────────────────────────────────────
// Reports camera distance as a percentage of the usable zoom range, so the
// overlay can show a readout without reaching into the R3F tree itself.
// 100% is fully zoomed IN (minDistance) — the direction a reader expects a
// zoom percentage to run, which is the inverse of the raw distance.
//
// Runs on useFrame because OrbitControls has no change event we subscribe to
// elsewhere, but only calls back when the rounded value actually moves —
// otherwise this would set React state 60 times a second for no visible
// difference.
// Eases the idle rotation up and down instead of switching it. Cutting
// autoRotate off the moment someone clicks stops the model dead, which reads
// as a glitch rather than a handover; easing autoRotateSpeed toward zero lets
// it settle. Nothing here touches the camera's angle, so whatever orientation
// it coasts to is where interaction begins — and where it resumes from on the
// way back out.
//
// tau of 0.12s puts it within a few percent of the target in ~350ms, which is
// the window the timing spec allows for the settle.
function SpinEase({ controlsRef, spinning, speed }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: React.RefObject<any>;
  spinning: boolean;
  speed: number;
}) {
  useFrame((_, dt) => {
    const c = controlsRef.current;
    if (!c) return;
    const goal = spinning ? speed : 0;
    const k = 1 - Math.exp(-Math.min(dt, 0.1) / 0.12);
    const next = c.autoRotateSpeed + (goal - c.autoRotateSpeed) * k;
    c.autoRotateSpeed = Math.abs(next - goal) < 0.001 ? goal : next;
  });
  return null;
}

function ZoomReporter({ controlsRef, onZoom }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: React.RefObject<any>;
  onZoom: (pct: number) => void;
}) {
  const last = useRef<number | null>(null);
  useFrame(() => {
    const c = controlsRef.current;
    if (!c) return;
    const dist = c.object.position.distanceTo(c.target);
    const { minDistance: min, maxDistance: max } = c;
    if (!(max > min)) return;
    const pct = Math.round((1 - (Math.min(max, Math.max(min, dist)) - min) / (max - min)) * 100);
    if (pct !== last.current) { last.current = pct; onZoom(pct); }
  });
  return null;
}

// What the debug panel renders. `hero*` is what these coordinates become once
// the hero's constraints are applied — the numbers that are actually safe to
// paste into the admin. When `constrained` is true the two differ and the
// panel says so, rather than letting an unreachable frame be baked.
export type CamReadout = {
  pos:         [number, number, number];
  tgt:         [number, number, number];
  heroPos:     [number, number, number];
  heroTgt:     [number, number, number];
  constrained: boolean;
  /** Camera is at or below the top of the scan, so it may clip through it.
   *  Advisory only — nothing corrects this, it just says the shot is risky. */
  insideModel: boolean;
};

const trip = (v: THREE.Vector3): [number, number, number] =>
  [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)];

function LivePos({ onPos, controlsRef, limits, modelTopY }: {
  onPos: (r: CamReadout) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: React.RefObject<any>;
  limits: HeroLimits;
  modelTopY: number | null;
}) {
  const { camera } = useThree();
  const last = useRef("");
  useFrame(() => {
    const t = controlsRef.current?.target;
    if (!t) return;
    const hero = heroFrame(camera.position, t, limits);
    const next: CamReadout = {
      pos:         trip(camera.position),
      tgt:         trip(t),
      heroPos:     trip(hero.position),
      heroTgt:     trip(hero.target),
      constrained: hero.constrained,
      insideModel: modelTopY != null && camera.position.y <= modelTopY,
    };
    // Diff on the rounded payload, not the raw floats — otherwise this sets
    // React state every frame for sub-pixel drift nobody can see.
    const key = JSON.stringify(next);
    if (key !== last.current) { last.current = key; onPos(next); }
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
// Snaps to the hero's constraints before reading pixels. This is the step that
// makes the tuning workflow trustworthy: debug orbits without the hero's
// limits, so the frame on screen while composing is not necessarily one the
// hero can reproduce. Exporting that frame is what put a baked preload image
// permanently out of step with the live hero. Snapping first means the PNG,
// the readout, and the hero are the same frame by construction — and because
// the snap is visible on screen, an angle the hero cannot hold announces
// itself while there is still a chance to re-compose it.
function CaptureSetup({ captureRef, snapRef, filterRef, controlsRef, limits }: {
  captureRef: React.MutableRefObject<(() => void) | undefined>;
  snapRef:    React.MutableRefObject<(() => void) | undefined>;
  filterRef:  React.MutableRefObject<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: React.RefObject<any>;
  limits: HeroLimits;
}) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    const snap = () => {
      const ctrl = controlsRef.current;
      if (!ctrl) return;
      const cam = ctrl.object;

      // Damping is on (drei defaults enableDamping to true), and that makes a
      // naive "write the position, call update()" snap land somewhere else.
      // OrbitControls.update() does not treat object.position as the truth: it
      // rebuilds it as target + offset, after folding in whatever orbit and pan
      // inertia is still queued — and with damping those deltas only decay ~5%
      // a frame, so a gesture is still bleeding into the camera seconds later.
      // Writing a position into the middle of that gets it overwritten, and the
      // residue keeps dragging the camera on later frames.
      //
      // Turning damping off makes the next update() apply the pending deltas
      // once and then zero them, so this first call settles the camera exactly
      // where the gesture was heading. Only then is there a stable frame to
      // measure and correct.
      const damping = ctrl.enableDamping;
      ctrl.enableDamping = false;
      ctrl.update();

      // Deltas are zero now, so this update() rebuilds the position from the
      // values just written rather than from leftover motion.
      const hero = heroFrame(cam.position, ctrl.target, limits);
      cam.position.copy(hero.position);
      ctrl.target.copy(hero.target);
      ctrl.update();

      ctrl.enableDamping = damping;
    };
    snapRef.current = snap;

    captureRef.current = () => {
      snap();
      // Draw synchronously after the snap. Without this the buffer still holds
      // the pre-snap frame — preserveDrawingBuffer keeps the *last* render,
      // not a fresh one, and the next rAF has not run yet.
      gl.render(scene, camera);

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
    return () => { captureRef.current = undefined; snapRef.current = undefined; };
  }, [gl, scene, camera, captureRef, snapRef, filterRef, controlsRef, limits]);
  return null;
}

// ── Main export ────────────────────────────────────────────────────────────
export default function ParkModel({
  modelFile,
  preloadImage,
  onLoad,
  cameraPos            = [0, 22, 32] as [number, number, number],
  // Floor centre, so the polar clamp lines up with the visible ground rather
  // than a point 2 units under it. Parks that tune their own target in the DB
  // (bloblands: y 4.01) already sit here.
  cameraTarget         = [0, MODEL_FLOOR_Y, 0] as [number, number, number],
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
  onZoomChange,
  loadingBackground   = "var(--background)",
  spinning            = true,
  allowRotate         = true,
  allowZoom           = true,
  onInteract,
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
  onZoomChange?: (pct: number) => void;
  /** What the "loading model" plate paints while the GLB resolves. Defaults to
   *  the page ground, which is right in the hero — it sits on the hero's own
   *  background. The overlay has a different ground, and painting
   *  var(--background) there put a solid #202020 slab over it. */
  loadingBackground?: string;
  /** Idle rotation target. Eased rather than switched — see SpinEase. */
  spinning?: boolean;
  /** Split so the two can be granted at different points in the entrance:
   *  drag comes live early, zoom only once the sequence has finished. */
  allowRotate?: boolean;
  allowZoom?: boolean;
  /** First pointer or wheel gesture on the model, per OrbitControls' own
   *  start event. Drives the instruction collapse upstream. */
  onInteract?: () => void;
}) {
  // When grayscale prop is provided externally, use it; otherwise fall back to internal toggle.
  const [viewMode,    setViewMode]    = useState<"bw" | "colour">("bw");
  const externallyControlled = grayscale !== undefined;
  const [camPos,      setCamPos]      = useState<CamReadout | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelTopY,   setModelTopY]   = useState<number | null>(null);

  // Chrome throttles background rAF rather than stopping it, so a hidden tab
  // kept driving the whole scene — controls damping, the spin ease and a full
  // draw. Page Visibility stops it outright. Done by handing R3F a different
  // frameloop rather than by wrapping its loop in one of ours: the render
  // architecture stays exactly as it was, and there is no second timer to keep
  // in step with the first.
  const [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const sync = () => setPageVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  // ssr:false component (dynamic-imported), so reading sessionStorage in the
  // initializer is safe — this never runs server-side.
  const [hintDismissed, setHintDismissed] = useState(() => {
    try { return sessionStorage.getItem(HINT_DISMISSED_KEY) === "1"; } catch { return false; }
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef  = useRef<any>(null);
  const preloadRef   = useRef<HTMLImageElement>(null);
  const captureRef   = useRef<(() => void) | undefined>(undefined);
  const snapRef      = useRef<(() => void) | undefined>(undefined);

  // Note: nothing here re-homes the camera. Closing used to send it back to
  // its start position, which snapped the scan to a default orientation in
  // front of the visitor; the timing spec asks for the angle to survive both
  // transitions, so state is simply left alone.

  const dismissHint = useCallback(() => {
    setHintDismissed(true);
    try { sessionStorage.setItem(HINT_DISMISSED_KEY, "1"); } catch { /* ignore */ }
  }, []);



  const startPos    = [+cameraPos[0], +cameraPos[1], +cameraPos[2]] as [number, number, number];
  const filter      = externallyControlled
    ? (grayscale ? "grayscale(1)" : "none")
    : (viewMode === "bw" ? "grayscale(1)" : "none");
  const filterRef   = useRef(filter);
  filterRef.current = filter;
  const canvasStart = pingPong ? n(pingPong[0]) : startPos;

  // The park's own orbit limits, widened to contain the frame it was authored
  // with. This is what stops the hero silently correcting a composed angle —
  // the stored frame is inside its own limits by construction, so nothing
  // moves it on the first frame.
  const [tx, ty, tz] = n(cameraTarget);
  const [sx, sy, sz] = startPos;
  const heroLimits = useMemo(
    () => limitsForAuthoredFrame(new THREE.Vector3(sx, sy, sz), new THREE.Vector3(tx, ty, tz)),
    [sx, sy, sz, tx, ty, tz],
  );
  const handleLoad = useCallback(() => {
    if (preloadRef.current) preloadRef.current.style.opacity = "0";
    setModelLoaded(true);
    onLoad?.();
  }, [onLoad]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>

      {/* ── B&W / CLR toggle — only shown when not controlled by hero shell ── */}
      {!externallyControlled && (
        <div style={{ position: "absolute", bottom: 12, right: 12, zIndex: 11, display: "flex", gap: 2 }}>
          {(["bw", "colour"] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center",
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
          // Right-aligned, and held off the edge rather than flush: the hero
          // title is left-anchored and grows upward as it wraps, so a long
          // park name used to run straight through the coordinates. The title
          // wins that overlap outright — .fbs-hero-media is a z-index:0
          // stacking context, so this panel's z-index is scoped inside it and
          // can never rise above the hero copy at 5. Moving it out of the
          // title's column is the fix; the 50px inset keeps the readout clear
          // of the viewport edge at every breakpoint.
          position: "absolute", bottom: 80, right: 50, zIndex: 20,
          background: "rgba(0,0,0,0.82)", color: "#0f0", padding: "12px 16px",
          fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.9,
          borderRadius: 4, pointerEvents: "auto", minWidth: 260,
        }}>
          <div style={{ color: "#aaa", fontSize: 9, letterSpacing: "0.12em", marginBottom: 6 }}>CAMERA POSITION</div>
          {!camPos ? (
            <div style={{ marginBottom: 12 }}>loading…</div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <div>pos [{camPos.pos.join(", ")}]</div>
              <div>tgt [{camPos.tgt.join(", ")}]</div>

              {/* The whole point of the panel. While this is showing, the
                  numbers above are NOT what the hero will render — pasting
                  them into the admin bakes an offset that only appears once
                  the viewer goes live. */}
              {/* Advisory, not a correction. The authored frame is honoured
                  verbatim now, so nothing stops a camera composed low enough
                  to pass through the scan — this is the warning that replaced
                  the clamp which used to prevent it. */}
              {camPos.insideModel && !camPos.constrained && (
                <div style={{
                  marginTop: 10, padding: "8px 10px", borderRadius: 3,
                  background: "rgba(120,170,255,0.10)", border: "1px solid rgba(120,170,255,0.45)",
                  color: "#8fb8ff", lineHeight: 1.7, fontSize: 9, letterSpacing: "0.06em",
                }}>
                  CAMERA BELOW TOP OF SCAN — may clip through it
                </div>
              )}

              {camPos.constrained && (
                <div style={{
                  marginTop: 10, padding: "8px 10px", borderRadius: 3,
                  background: "rgba(255,176,0,0.12)", border: "1px solid rgba(255,176,0,0.5)",
                  color: "#ffb000", lineHeight: 1.7,
                }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.12em", marginBottom: 4 }}>
                    ⚠ OUTSIDE HERO LIMITS
                  </div>
                  <div style={{ color: "#ffd479" }}>
                    <div>pos [{camPos.heroPos.join(", ")}]</div>
                    <div>tgt [{camPos.heroTgt.join(", ")}]</div>
                  </div>
                  <div style={{ fontSize: 9, color: "#c9a34e", marginTop: 5 }}>
                    Past what the hero can hold. Snap before exporting.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview the correction without exporting — the capture applies it
              anyway, so this is just the chance to see it and re-compose. */}
          <button
            onClick={() => snapRef.current?.()}
            disabled={!camPos?.constrained}
            style={{
              width: "100%", padding: "6px 0",
              background: "transparent", color: camPos?.constrained ? "#ffb000" : "#555",
              border: `1px solid ${camPos?.constrained ? "rgba(255,176,0,0.5)" : "#333"}`,
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em",
              textTransform: "uppercase", borderRadius: 2,
              cursor: camPos?.constrained ? "pointer" : "default",
            }}
          >
            Snap to hero frame
          </button>

          <button
            onClick={() => captureRef.current?.()}
            style={{
              marginTop: 10, width: "100%", padding: "6px 0",
              background: "var(--accent)", border: "none", color: "#fff",
              fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em",
              textTransform: "uppercase", cursor: "pointer", borderRadius: 2,
            }}
          >
            Snap + save frame as PNG
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
            opacity: 1, transition: "opacity 0.5s ease",
            filter,
          }}
        />
      )}

      {/* ── Preload reassurance ────────────────────────────────────────────
          A label, not a meter. This was a progress bar fed by GLTFLoader, and
          the number it reported did not describe the wait: it moves in jumps
          as chunks land and then sits near the end through decode, which reads
          as a stall exactly when the visitor is most likely to give up. The
          preload still is already doing the reassuring; this is a backstop for
          slow connections, so it says something is happening and nothing more. */}
      {preloadImage && !modelLoaded && (
        <div className="fbs-loading-note" style={{
          position: "absolute", left: "50%", bottom: "24%", transform: "translateX(-50%)",
          zIndex: 5, pointerEvents: "none",
          fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.72)",
          textShadow: "0 1px 10px rgba(0,0,0,0.5)",
        }}>
          Loading scan…
        </div>
      )}

      {/* ── Loading fallback when no preload image ─────────────────────────
          Unmounted on load rather than faded: it used to stay mounted at
          z-index auto, which put it *behind* the later-in-DOM canvas wrapper
          for the rest of the session. Solid fill + above the canvas while it
          is up, gone the moment the model resolves. */}
      {!preloadImage && !modelLoaded && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 6, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: loadingBackground,
          color: "var(--muted)", fontSize: 11,
          textTransform: "uppercase", letterSpacing: "0.12em",
          pointerEvents: "none",
        }}>
          <span className="fbs-loading-note">Loading scan…</span>
        </div>
      )}

      {/* ── Drag hint icon — only once the model is interactive; dismisses on
          the first pointerdown on the canvas, not a timer; stays dismissed
          for the rest of the session ────────────────────────────────────── */}
      {!pingPong && !debug && (
        <div
          aria-hidden
          style={{
            position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
            zIndex: 5, pointerEvents: "none",
            color: "rgba(255,255,255,0.45)",
            opacity: modelLoaded && !hintDismissed ? 1 : 0,
            transition: "opacity 200ms ease",
          }}
        >
          <svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 16c6-6 12-9 16-9s10 3 16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            <circle className="fbs-hint-dot" cx="12" cy="10" r="4" fill="currentColor" />
          </svg>
        </div>
      )}

      {/* ── Canvas — filter on wrapper div, not on canvas itself ───────── */}
      <div style={{ position: "absolute", inset: 0, filter, transition: "filter 0.4s ease" }} onPointerDown={dismissHint}>
      <Canvas
        frameloop={pageVisible ? "always" : "never"}
        camera={{ position: canvasStart, fov, near: 0.5, far: 400 }}
        style={{ position: "absolute", inset: 0 }}
        gl={{ antialias: true, alpha: true, logarithmicDepthBuffer: true, preserveDrawingBuffer: true, toneMapping: THREE.NoToneMapping, toneMappingExposure: 1.0, outputColorSpace: THREE.SRGBColorSpace }}
      >
        <ambientLight color={0xffffff} intensity={ambientIntensity} />
        <directionalLight color={0xffffff} position={[10, 20, 10]} intensity={directionalIntensity} />
        <Environment preset={environmentPreset as any} environmentIntensity={environmentIntensity} />

        {debug && <CaptureSetup captureRef={captureRef} snapRef={snapRef} filterRef={filterRef} controlsRef={controlsRef} limits={heroLimits} />}

        <Suspense fallback={null}>
          <Model
            onLoad={handleLoad}
            onBounds={setModelTopY}
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
          enableZoom={(debug || !pingPong) && allowZoom}
          enableRotate={(!pingPong || debug) && allowRotate}
          // Left on and driven by speed instead, so stopping is a deceleration
          // rather than a cut.
          //
          // `spinning` is the only thing that decides whether the model turns.
          // There used to be an `engaged` flag here that latched true on the
          // first drag and killed autoRotate outright — it was cleared by the
          // camera reset, and when that reset was removed the flag had nothing
          // to clear it, so the scan never turned again after a single drag.
          // The viewer already withdraws the spin by setting `spinning` false,
          // and the shield stops anyone reaching an idle model, so the flag was
          // both redundant and the bug.
          autoRotate={modelLoaded && !debug && !pingPong}
          onStart={() => onInteract?.()}
          minDistance={debug ? 1 : heroLimits.minDistance}
          maxDistance={debug ? 500 : heroLimits.maxDistance}
          minPolarAngle={debug ? 0 : heroLimits.minPolar}
          // 0.42π ≈ 76°, comfortably above horizontal. Combined with the pan
          // clamp pinning the target to MODEL_FLOOR_Y, camera.y works out to
          // floor + distance·cos(76°), so it stays over the deck at every
          // zoom level. Debug unlocks both to tune camera positions.
          maxPolarAngle={debug ? Math.PI : heroLimits.maxPolar}
        />

        {!pingPong && !debug && (
          <SpinEase controlsRef={controlsRef} spinning={spinning} speed={0.5} />
        )}

        {!pingPong && !debug && <PanClamp controlsRef={controlsRef} limits={heroLimits} />}

        {onZoomChange && <ZoomReporter controlsRef={controlsRef} onZoom={onZoomChange} />}

        {debug && <LivePos onPos={setCamPos} controlsRef={controlsRef} limits={heroLimits} modelTopY={modelTopY} />}

      </Canvas>
      </div>

      <style>{`
        /* Breathing, not filling — see the note by the label. */
        .fbs-loading-note{ animation: fbs-loading-breathe 1.9s ease-in-out infinite; }
        @keyframes fbs-loading-breathe{
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce){
          .fbs-loading-note{ animation: none; opacity: 0.8; }
        }
        @keyframes fbs-hint-drag {
          0%, 100% { transform: translateX(-6px); }
          50%      { transform: translateX(6px); }
        }
        .fbs-hint-dot {
          animation: fbs-hint-drag 2s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .fbs-hint-dot { animation: none; }
        }
      `}</style>
    </div>
  );
}
