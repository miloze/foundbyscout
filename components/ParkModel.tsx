"use client";

import { Suspense, useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import {
  MODEL_FLOOR_Y, DEG, clampTarget, hasAzimuthSweep, heroFrame, limitsForAuthoredFrame,
  type CameraBounds, type HeroLimits,
} from "@/lib/heroCamera";

// Coerce to numbers — Supabase numeric[] returns strings
const n = (v: unknown[]): [number, number, number] => [+v[0]!, +v[1]!, +v[2]!];

useGLTF.setDecoderPath("/draco/");



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

// ── Ping-pong camera — REMOVED ────────────────────────────────────────────
// This was a two-point camera loop that wrote camera.position every frame. It
// existed for one reason: Southbank is an interior, and something had to stop
// the view swinging round behind the undercroft's shell. It did that by taking
// the camera away from OrbitControls altogether — which is why the single
// `pingPong` prop also had to switch off rotate, zoom and pan, skip the spin
// ease and skip the pan clamp. One park's framing problem cost that park its
// entire viewer: it could not be dragged, zoomed or paused, and it moved on
// its own from the moment it loaded.
//
// Per-park azimuth bounds replace it, and do the same job the right way round:
// the limits belong to the controls, so manual drag and automatic rotation are
// constrained by the same pair of numbers, and the rotation turns round at the
// ends instead of being animated between two poses. See CameraBounds in
// lib/heroCamera and the sweep logic in SpinEase.
//
// The `ping_pong` column is left alone and simply no longer read. Nothing is
// lost by clearing it; nothing breaks by leaving it.

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
// Eases the automatic rotation up and down instead of switching it. Starting
// or stopping it on a class flip reads as a glitch rather than a handover;
// easing autoRotateSpeed lets it settle. Nothing here touches the camera's
// angle, so whatever orientation it coasts to is where interaction begins.
//
// tau of 0.12s puts it within a few percent of the target in ~350ms, which is
// the window the timing spec allows for the settle.
//
// TWO THINGS THIS HAS TO GET RIGHT, and they pull in opposite directions:
//
//  1. The ease is for *deliberate* changes — activating the viewer, and the
//     orbit toggle. A gesture is not one of those: the brief is explicit that
//     touching the model stops the rotation immediately, so `haltRef` short
//     circuits the ease and writes zero.
//  2. The speed starts wherever drei left it (2.0, its default), so without
//     the one-time initialise below a viewer that mounts with spinning=false
//     would spin for the ~350ms it takes to ease down to zero — which is the
//     "rotates before you activate it" bug in its smallest form.
//
// `haltRef` is a ref rather than state because it is set from OrbitControls'
// pointerdown, and the React update that follows it is a frame or two behind.
// Without it, those frames see `spinning` still true and ease the speed back
// UP before the state lands. It is cleared by the only things allowed to start
// rotation: an activation or a toggle press, both of which are a false→true
// transition of `spinning`.
function SpinEase({ controlsRef, spinning, speed, haltRef, limits }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: React.RefObject<any>;
  spinning: boolean;
  speed: number;
  haltRef: React.MutableRefObject<boolean>;
  limits: HeroLimits;
}) {
  const initialised = useRef(false);
  const wasSpinning = useRef(spinning);
  // +1 / -1. Only meaningful on a park with an azimuth sweep; an open-air park
  // never flips and turns one way forever, exactly as before.
  const dir = useRef(1);
  useFrame((_, dt) => {
    const c = controlsRef.current;
    if (!c) return;
    if (!initialised.current) {
      initialised.current = true;
      c.autoRotateSpeed = spinning ? speed : 0;
    }
    if (spinning && !wasSpinning.current) haltRef.current = false;
    wasSpinning.current = spinning;

    if (haltRef.current) { c.autoRotateSpeed = 0; return; }

    // ── Turning round at the ends ──────────────────────────────────────
    // OrbitControls' azimuth clamp DOES apply while autoRotate is running,
    // but its behaviour there is to drive into the limit and sit against it —
    // the scan stops dead facing the edge of its own window and stays there.
    // Reversing is this component's job.
    //
    // The bounds are the ones the manual drag clamps to. There is deliberately
    // no second range for the rotation to play within: "how far this park can
    // turn" is one number pair, set once, read by both.
    //
    // getAzimuthalAngle() is the CLAMPED angle, so it reaches the bound
    // exactly. The guard is the distance the ease needs to shed the current
    // speed (v·tau) — derived rather than picked, so it stays correct if the
    // speed is ever retuned, and it starts the turn just early enough that the
    // scan decelerates into the end rather than hitting it.
    //
    // MIND THE SIGN. OrbitControls rotates by `sphericalDelta.theta -= angle`,
    // so a POSITIVE autoRotateSpeed makes the azimuth DECREASE. dir +1 is
    // therefore travel towards minAzimuth, and that is the bound it has to
    // turn at. Getting this backwards does not look like a reversed animation,
    // it looks like nothing happening: the rotation drives into the near limit
    // and sits against it, which is the exact behaviour the bounds exist to
    // replace.
    if (hasAzimuthSweep(limits)) {
      const vel   = Math.abs(2 * Math.PI / 60 * speed);   // rad/s at full speed
      const guard = vel * 0.12;
      const az    = c.getAzimuthalAngle();
      if (dir.current > 0 && az <= limits.minAzimuth + guard) dir.current = -1;
      else if (dir.current < 0 && az >= limits.maxAzimuth - guard) dir.current = 1;
    }

    const goal = spinning ? speed * dir.current : 0;
    const k = 1 - Math.exp(-Math.min(dt, 0.1) / 0.12);
    const next = c.autoRotateSpeed + (goal - c.autoRotateSpeed) * k;
    c.autoRotateSpeed = Math.abs(next - goal) < 0.001 ? goal : next;
  });
  return null;
}

// "Ready" means activatable, not downloaded.
//
// onLoad used to fire from the mesh effect, which is the moment the GLB has
// parsed — but the thing a visitor is invited to do on Ready is drag the
// model, and that is OrbitControls' job, not the mesh's. Firing on the first
// frame where both the model and the controls exist is the difference between
// a CTA that promises interaction and one that has it.
function ReadyGate({ controlsRef, modelLoaded, onReady }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  controlsRef: React.RefObject<any>;
  modelLoaded: boolean;
  onReady?: () => void;
}) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current || !modelLoaded || !controlsRef.current) return;
    fired.current = true;
    onReady?.();
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
  /** Live orbit angles in DEGREES, which is the unit the camera-bounds fields
   *  are authored in. Under ?debug=1 the bounds are lifted, so these can be
   *  swung to the edges of what the room can stand and read straight off. */
  azimuthDeg: number;
  polarDeg:   number;
};

const trip = (v: THREE.Vector3): [number, number, number] =>
  [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)];

// Orbit radius, for composing a park's min/max distance the same way.
const DIST = (p: [number, number, number], t: [number, number, number]) =>
  Math.hypot(p[0] - t[0], p[1] - t[1], p[2] - t[2]).toFixed(1);

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
    const ctrl = controlsRef.current;
    const next: CamReadout = {
      pos:         trip(camera.position),
      tgt:         trip(t),
      heroPos:     trip(hero.position),
      heroTgt:     trip(hero.target),
      constrained: hero.constrained,
      insideModel: modelTopY != null && camera.position.y <= modelTopY,
      azimuthDeg:  +DEG(ctrl.getAzimuthalAngle()).toFixed(1),
      polarDeg:    +DEG(ctrl.getPolarAngle()).toFixed(1),
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
  showLoadingNote     = true,
  onInteract,
  onDrag,
  stopOnInteract      = false,
  cameraBounds,
}: {
  modelFile: string;
  preloadImage?: string;
  onLoad?: () => void;
  cameraPos?: [number, number, number];
  cameraTarget?: [number, number, number];
  modelRotation?: [number, number, number];
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
  /** Whether the preload reassurance below is this surface's job.
   *
   *  False where the caller already says the scan is loading. The park page's
   *  hero does: the plate that becomes EXPLORE 3D reads "LOADING 3D SCAN…"
   *  first, and this note was printing "LOADING SCAN…" a few hundred pixels
   *  under it — one wait described twice, in two registers, in one frame.
   *  The full-screen viewer has no label of its own and keeps this.
   *
   *  Only the preload note is gated. The no-preload plate further down is the
   *  only thing on screen in that case and always renders. */
  showLoadingNote?: boolean;
  /** Every pointer, touch or wheel contact with the model, per OrbitControls'
   *  own start event — a plain tap included. Not latched here: the caller
   *  decides what is once-only. */
  onInteract?: () => void;
  /** The model was actually ROTATED, as distinct from touched. See the
   *  handlers below for what counts and why it is not a pixel threshold. */
  onDrag?: () => void;
  /** Whether a gesture permanently ends the automatic rotation.
   *
   *  On for the inline hero, where the orbit toggle is the way back. Off by
   *  default, and therefore in the full-screen viewer, which has no toggle —
   *  latching the rotation off there would take a behaviour away with nothing
   *  offered in its place. */
  stopOnInteract?: boolean;
  /** Per-park orbit window for an ENCLOSED park. Undefined outdoors, where it
   *  changes nothing. See CameraBounds in lib/heroCamera. */
  cameraBounds?: CameraBounds | null;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef  = useRef<any>(null);
  const preloadRef   = useRef<HTMLImageElement>(null);
  const captureRef   = useRef<(() => void) | undefined>(undefined);
  const snapRef      = useRef<(() => void) | undefined>(undefined);

  // ── Gesture ────────────────────────────────────────────────────────────
  // Read by SpinEase — see the note there for why it is a ref and not state.
  const haltRef    = useRef(false);
  // Per gesture, not per viewer: the caller can be entered, left and entered
  // again without this component remounting, and a latch that lived for the
  // life of the instance would report the first drag of the session and never
  // another.
  const gestureRef = useRef({ active: false, fired: false, theta: 0, phi: 0 });

  // Contact — pointer, touch or wheel. OrbitControls dispatches `start` for
  // all three, so this is the one place the "any interaction" rule is stated.
  const handleStart = useCallback(() => {
    const c = controlsRef.current;
    if (c) {
      if (stopOnInteract) {
        // Immediately, and that means the inertia too. Damping does not zero
        // autoRotate's accumulated delta when the speed goes to zero — it
        // decays it about 5% a frame — so the model would carry on turning by
        // itself for a good half second after being touched, which is exactly
        // the thing the brief separates from drag inertia. Toggling damping
        // off for one update() applies the residue in a single step (~1° at
        // this speed, invisible) and zeroes it, which also gives the drag test
        // below a still camera to measure against.
        c.autoRotateSpeed = 0;
        const damping = c.enableDamping;
        c.enableDamping = false;
        c.update();
        c.enableDamping = damping;
        haltRef.current = true;
      }
      // Recorded AFTER the flush, so the baseline is the camera at rest.
      gestureRef.current = {
        active: true, fired: false,
        theta: c.getAzimuthalAngle(), phi: c.getPolarAngle(),
      };
    }
    onInteract?.();
  }, [onInteract, stopOnInteract]);

  // What counts as "the visitor dragged the model".
  //
  // NOT a pixel or duration threshold — OrbitControls has none to borrow, and
  // inventing one here would be a second, private definition of a gesture the
  // controls already own. The question this asks instead is the one that
  // actually matters: did the ORBIT ANGLE move while a gesture was in
  // progress? A tap leaves theta and phi exactly where they were (the deltas
  // were flushed on contact, and autoRotate is stopped), so it never reads as
  // a drag; a zoom changes distance and not angle, so it does not either.
  const handleChange = useCallback(() => {
    const g = gestureRef.current;
    if (!g.active || g.fired) return;
    const c = controlsRef.current;
    if (!c) return;
    if (c.getAzimuthalAngle() !== g.theta || c.getPolarAngle() !== g.phi) {
      g.fired = true;
      onDrag?.();
    }
  }, [onDrag]);

  const handleEnd = useCallback(() => { gestureRef.current.active = false; }, []);

  // Note: nothing here re-homes the camera. Closing used to send it back to
  // its start position, which snapped the scan to a default orientation in
  // front of the visitor; the timing spec asks for the angle to survive both
  // transitions, so state is simply left alone.




  const startPos    = [+cameraPos[0], +cameraPos[1], +cameraPos[2]] as [number, number, number];
  const filter      = externallyControlled
    ? (grayscale ? "grayscale(1)" : "none")
    : (viewMode === "bw" ? "grayscale(1)" : "none");
  const filterRef   = useRef(filter);
  filterRef.current = filter;
  const canvasStart = startPos;

  // The park's own orbit limits, widened to contain the frame it was authored
  // with. This is what stops the hero silently correcting a composed angle —
  // the stored frame is inside its own limits by construction, so nothing
  // moves it on the first frame.
  const [tx, ty, tz] = n(cameraTarget);
  const [sx, sy, sz] = startPos;
  // Serialised so a fresh object literal from the caller each render does not
  // rebuild the limits — and with them the OrbitControls props — every frame.
  const boundsKey = JSON.stringify(cameraBounds ?? null);
  const heroLimits = useMemo(
    () => limitsForAuthoredFrame(
      new THREE.Vector3(sx, sy, sz), new THREE.Vector3(tx, ty, tz),
      JSON.parse(boundsKey) as CameraBounds | null,
    ),
    [sx, sy, sz, tx, ty, tz, boundsKey],
  );
  // The GLB has parsed and the still can go. Note that this deliberately does
  // NOT call onLoad — that is ReadyGate's, one frame later, once the controls
  // exist too.
  const handleLoad = useCallback(() => {
    if (preloadRef.current) preloadRef.current.style.opacity = "0";
    setModelLoaded(true);
  }, []);

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

              {/* ── Camera bounds, for enclosed parks ────────────────────
                  Degrees, matching the admin's Camera bounds fields exactly,
                  so composing a limit is: swing to the edge of what the room
                  can stand, read the number, paste it. Debug lifts the bounds
                  themselves, so this can be swung past wherever they are
                  currently set. */}
              <div style={{ marginTop: 8, color: "#7fd67f" }}>
                <div>azimuth {camPos.azimuthDeg}°</div>
                <div>polar&nbsp;&nbsp; {camPos.polarDeg}°</div>
                <div>dist&nbsp;&nbsp;&nbsp;&nbsp; {DIST(camPos.pos, camPos.tgt)}</div>
              </div>

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
      {preloadImage && !modelLoaded && showLoadingNote && (
        <div className="fbs-loading-note" style={{
          position: "absolute", left: "50%", bottom: "24%", transform: "translateX(-50%)",
          zIndex: 5, pointerEvents: "none",
          fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.72)",
          // No textShadow — see the standing rule in app/colors_and_type.css.
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

      {/* The drag hint that used to sit here — a curved path with a dot
          sliding along it — is gone. ParkHeroShell and ParkViewerModal both
          already state the interaction in words, device-appropriately ("Drag
          to rotate · Pinch to zoom" / "Scroll to zoom · Drag to rotate"), so
          the icon was a second, vaguer telling of the same thing. Those
          instructions are the ones to change if this needs saying again. */}
      {/* ── Canvas — filter on wrapper div, not on canvas itself ───────── */}
      <div style={{ position: "absolute", inset: 0, filter, transition: "filter 0.4s ease" }}>
      <Canvas
        frameloop={pageVisible ? "always" : "never"}
        camera={{ position: canvasStart, fov, near: 0.5, far: 400 }}
        style={{ position: "absolute", inset: 0 }}
        gl={{ antialias: true, alpha: true, logarithmicDepthBuffer: true, preserveDrawingBuffer: true, toneMapping: THREE.NoToneMapping, toneMappingExposure: 1.0, outputColorSpace: THREE.SRGBColorSpace }}
      >
        <ambientLight color={0xffffff} intensity={ambientIntensity} />
        <directionalLight color={0xffffff} position={[10, 20, 10]} intensity={directionalIntensity} />
        {/* Its own Suspense boundary, deliberately. The preset pulls a 1.67MB
            HDR from a third-party CDN, and unboundaried it suspends whatever
            boundary sits above it — which is the whole scene, model and
            controls included. Scoped here, a slow or unreachable HDR costs the
            environment lighting and nothing else. */}
        <Suspense fallback={null}>
          <Environment preset={environmentPreset as any} environmentIntensity={environmentIntensity} />
        </Suspense>

        {debug && <CaptureSetup captureRef={captureRef} snapRef={snapRef} filterRef={filterRef} controlsRef={controlsRef} limits={heroLimits} />}

        <Suspense fallback={null}>
          <Model
            onLoad={handleLoad}
            onBounds={setModelTopY}
            modelFile={modelFile}
            modelRotation={modelRotation}
          />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          target={n(cameraTarget)}
          enablePan
          enableZoom={debug || allowZoom}
          enableRotate={debug || allowRotate}
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
          autoRotate={modelLoaded && !debug}
          onStart={handleStart}
          onChange={handleChange}
          onEnd={handleEnd}
          minDistance={debug ? 1 : heroLimits.minDistance}
          maxDistance={debug ? 500 : heroLimits.maxDistance}
          minPolarAngle={debug ? 0 : heroLimits.minPolar}
          // 0.42π ≈ 76°, comfortably above horizontal. Combined with the pan
          // clamp pinning the target to MODEL_FLOOR_Y, camera.y works out to
          // floor + distance·cos(76°), so it stays over the deck at every
          // zoom level. Debug unlocks both to tune camera positions.
          maxPolarAngle={debug ? Math.PI : heroLimits.maxPolar}
          // ±Infinity outdoors — OrbitControls' own default, so an open-air
          // park is byte-for-byte unchanged. Debug unlocks them to compose.
          minAzimuthAngle={debug ? -Infinity : heroLimits.minAzimuth}
          maxAzimuthAngle={debug ?  Infinity : heroLimits.maxAzimuth}
        />

        {!debug && (
          <SpinEase
            controlsRef={controlsRef} spinning={spinning} speed={0.5}
            haltRef={haltRef} limits={heroLimits}
          />
        )}

        <ReadyGate controlsRef={controlsRef} modelLoaded={modelLoaded} onReady={onLoad} />


        {!debug && <PanClamp controlsRef={controlsRef} limits={heroLimits} />}

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
      `}</style>
    </div>
  );
}
