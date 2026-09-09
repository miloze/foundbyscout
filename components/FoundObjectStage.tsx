"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useStore, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * The 3D half of the FOUND OBJECT module: one GLB and one word, sharing a
 * depth buffer.
 *
 * Deliberately not a viewer. No OrbitControls, no drag, no zoom, no controls,
 * one canvas. It is an exhibit — the thing you can do with it is look at it.
 *
 * Four properties matter more than anything visual here:
 *
 *  1. The park name is *in the scene*, on a plane behind the object, so the
 *     scan occludes it by ordinary depth testing. Nothing is masked, clipped
 *     or composited: the word is simply further away than the concrete, and
 *     the silhouette that interrupts it is the real one, changing as the
 *     object moves. See ParkWord.
 *
 *  2. The canvas is transparent (`alpha`, no scene background, clear alpha 0),
 *     so the page's own ground is what surrounds the object and shows through
 *     the word's counters. That is what makes light and dark work from one
 *     asset with no theme branch.
 *
 *  3. It renders on demand, not continuously. `frameloop="demand"` means R3F
 *     draws nothing until something asks it to, and the only thing that asks
 *     is the turntable below — which stops dead when the module is offscreen,
 *     when the tab is hidden, and when motion is reduced. That is where the
 *     saving is: not in drawing slowly while you watch, but in drawing nothing
 *     at all while you are not. A visible frame here is one to three draw
 *     calls at a capped pixel ratio, so there is no reason to ration it — see
 *     VSYNCS_PER_FRAME.
 *
 *  4. Both the camera and the type are derived, not authored. The camera
 *     frames the volume the object sweeps; the word is fitted to the viewport
 *     by measuring it. Neither has a per-park number, so a longer name or a
 *     different GLB needs no re-tuning.
 *
 * This mounts only once the module is near the viewport — see FoundObject.
 */

useGLTF.setDecoderPath("/draco/");

// ── The knobs. ────────────────────────────────────────────────────────────
/** Seconds per revolution, for the objects that orbit. */
const REVOLUTION_S = 24;
/**
 * The ping-pong sweep: how far either side of front-on, and how long a full
 * there-and-back takes. A sine, so it eases at the turnarounds on its own
 * rather than snapping.
 *
 * Kept as an option rather than a verdict on any particular scan: a capture
 * whose far side is missing or not worth showing can sweep about its authored
 * front instead of turning all the way round. Nothing uses it at present.
 *
 * The sine starts at zero, so the object opens at its authored front angle and
 * moves away from it in both directions rather than arriving at it.
 */
const SWEEP_RAD = (25 * Math.PI) / 180;
const SWEEP_S = 16;

/**
 * How many display refreshes pass between drawn frames. 1 = every refresh.
 *
 * This counts vsyncs rather than milliseconds, and that is the whole point.
 * The first version asked for 28fps by rendering whenever 35.7ms had elapsed —
 * but a frame can only be drawn on a refresh boundary, so on a 60Hz display
 * the first tick past 35.7ms is always the third one, and the real cadence was
 * a 50ms period: 20fps, not 28. On a 120Hz iPad the same rule lands on the
 * fifth tick, 41.7ms, for 24fps. Two different rates from one constant,
 * neither of them the one asked for, and a single dropped tick shifted the
 * pattern for several frames afterwards — which is what the drift looked like.
 *
 * Counting refreshes cannot drift: every drawn frame is exactly N refreshes
 * after the last, on every display.
 */
const VSYNCS_PER_FRAME = 1;

/** Camera elevation. High enough to read a mound's top, low enough to keep it
 *  an object on a shelf rather than a site plan. */
const ELEVATION_DEG = 20;
/** A long lens. Short ones make an artefact look like a game asset. */
const FOV_DEG = 20;
/**
 * Clear space around the swept volume. Above 1 the object sits smaller in the
 * frame, which is what keeps it interrupting the word rather than burying it.
 *
 * Raised from 1.08 after measuring the ledge's silhouette through a full turn:
 * it came within 12px of the bottom edge at 210 degrees while leaving 147px
 * spare at the top. It was not quite clipping at 1440, but a stage of any other
 * proportion had nothing left to give.
 */
const FRAMING = 1.16;
/**
 * Per-object art-direction multiplier on the derived size. 1 is the geometry's
 * own answer; above 1 is bigger, below 1 smaller.
 *
 * Everything else about an object's size is normalised from its bounds, so two
 * scans of wildly different world scale land at the same place in the frame.
 * This exists for the one thing bounds cannot express: how much of the cylinder
 * the object actually fills. Bloblands is a round cone in a square footprint
 * and leaves most of its cylinder empty; Stockwell is a rectangular slab that
 * fills nearly all of its own. Same rule, same numbers, different amount of the
 * word covered — because one is round and one is not.
 *
 * Deriving it would mean rendering the silhouette and measuring it, which is a
 * lot of machinery for a judgement worth making by eye. So it is one authored
 * number per object, sitting beside the authored motion.
 */
const DEFAULT_OBJECT_SCALE = 1;
/**
 * How far the object sits below the word's centre line, as a fraction of its
 * own height. The word is centred; dropping the object lets the tops of the
 * letterforms stay clear, so the name is still read at a glance while the body
 * of the object cuts through it.
 *
 * Reduced from 0.12: the clearance through a full rotation was 12px at the
 * bottom against 147px at the top, and the drop was spending margin the bottom
 * edge could not afford. The letterforms still read.
 */
const OBJECT_DROP = 0.05;
/** Where a reduced-motion viewer finds it: a three-quarter view, not head-on. */
const STATIC_ANGLE = 0.62;

/**
 * How much of the canvas the word spans, and the whole of the fitting rule.
 *
 * The canvas is full-bleed, so this is a fraction of the viewport: 0.92 leaves
 * a 4% gutter each side. The type size is never named — the string is measured
 * and then scaled so its ink is exactly this wide, which means BLOBLANDS,
 * STOCKWELL, THE GROVE and CRYSTAL PALACE all reach the same two margins and
 * the longer ones simply come out smaller. Nothing per-park to maintain, and
 * no width at which a name can be cropped, because the fit is to the ink box
 * rather than to a font size that was guessed at some other viewport.
 */
const WORD_WIDTH = 0.92;
/**
 * Ceiling on the word's height, as a fraction of the stage. Without it a short
 * name fitted to 92vw would tower over the object and the module would stop
 * being about the object.
 */
const WORD_MAX_HEIGHT = 0.4;
/**
 * Where the word sits, as a multiple of the object's swept radius behind its
 * centre. 1 puts the whole plane behind the whole object, so the scan is
 * always in front and only ever subtracts from the type.
 *
 * 0 was tried — the plane through the object's middle, so the near half covers
 * the word and the far half is covered by it. It read well on Stockwell, whose
 * footprint is deep enough to straddle the plane, and was invisible on
 * Bloblands, which is small against the type. The simple front/back
 * relationship is the direction; this is kept as one number because that is
 * the entire cost of having tried the other one.
 */
const WORD_DEPTH = 1;

/**
 * The camera's distance from the origin, and now a constant.
 *
 * It used to be solved per object: the camera moved until that object's
 * silhouette filled the frame. That is the same picture as holding the camera
 * still and scaling the object — scaling the world about the camera's target
 * and scaling the camera's distance are the same projection — and the
 * difference matters the moment two objects share the stage. A camera fitted
 * to one of them frames the other wrongly, so the incoming object would have
 * arrived at the wrong size and snapped to the right one on landing, which is
 * exactly the scale change the motion brief rules out.
 *
 * So the camera is fixed and each object is fitted to it instead. The value is
 * arbitrary — every object is normalised against it — and the framing rule,
 * its convergence loop and FRAMING are unchanged, so what lands on screen for
 * a single object is what landed before.
 */
const CAM_DIST = 6;

/** The slide. Short, and flat: no spring, no overshoot, no bounce. */
const SLIDE_MS = 350;
/**
 * Extra travel past the frame's own width, so an object is fully outside the
 * visible area before it stops rather than clipping at the edge with a corner
 * still showing. Measured from the frame, not from the object's slot.
 */
const SLIDE_CLEARANCE = 1.25;

const SPEED = (Math.PI * 2) / REVOLUTION_S;

/** Flat ease-in-out. Symmetric, no undershoot below 0 or past 1 — the two
 *  places a cubic can produce the elasticity this is replacing. */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export type Motion = "orbit" | "pingpong";

// ── Model ─────────────────────────────────────────────────────────────────
function Model({ src, onReady, sizeKey }: {
  src: string;
  onReady: (o: THREE.Object3D) => void;
  /** Changes when the canvas is resized. The fit is to the frame, and the
   *  frame's aspect decides what fits in it, so a resize has to re-run it —
   *  otherwise an object fitted in portrait stays fitted for portrait after
   *  the tablet is turned. */
  sizeKey: string;
}) {
  const { scene } = useGLTF(src);

  /**
   * A clone, and this is load-bearing rather than tidiness.
   *
   * useGLTF caches by URL and hands every caller the same Object3D. That was
   * survivable while one object was ever on the stage; it stopped being so the
   * moment a step puts two there, because the arriving object is mounted in the
   * incoming slot and then re-mounted in the current one when the step lands.
   * For one commit the same node is claimed by two parents, three.js detaches
   * it from the first as the second adds it, and the order the two run in
   * decides where the object ends up — which is exactly what it looked like:
   * the ledge arrived correctly, then reappeared above and left of the frame
   * after a there-and-back.
   *
   * clone(true) copies the node graph and shares the geometries, materials and
   * textures by reference, so this costs a few hundred objects rather than a
   * second copy of a 5MB scan. It also means the fit below writes to a node
   * nothing else can be holding, so two slots showing the same park — which a
   * larger collection will allow — cannot fight over one transform.
   */
  const object = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    // Photogrammetry exports arrive with transparency and depth settings that
    // drop faces at grazing angles — the same fix the park viewers apply. The
    // culling one matters here: Stockwell's materials are single-sided and its
    // meshes carry no NORMAL attribute, so without this it renders as holes.
    object.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(m => {
        const mat = m as THREE.MeshStandardMaterial;
        mat.side = THREE.DoubleSide;
        mat.transparent = false;
        mat.depthWrite = true;
        if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
        mat.needsUpdate = true;
      });
    });
    onReady(object);
  }, [object, onReady, sizeKey]);

  return <primitive object={object} />;
}

// ── The word ──────────────────────────────────────────────────────────────
/**
 * Draws the park name into a 2D canvas and hangs it in the scene on a plane.
 *
 * Why a canvas texture rather than troika (drei's <Text>), which is in the
 * tree already: this way the type is set by the browser, in the same MSCHN
 * variable font the rest of the page has already downloaded, with the same
 * weight and the same negative tracking. It is not an approximation of
 * the HTML type — it is the HTML type's own rasteriser. troika would mean
 * shipping a second, static copy of the font (MSCHN-MItalic.otf, 134KB) purely
 * for this module, and re-deriving the weight and tracking by hand against an
 * SDF. The bitmap has no downside here because the plane is billboarded and
 * therefore never seen at an angle or at an unplanned scale.
 *
 * It is drawn at one texel per device pixel, so it is as crisp as DOM text,
 * and redrawn when the canvas size or DPR changes.
 *
 * White in the texture, tinted by the material, so following the theme is one
 * colour assignment rather than a re-render of the type.
 */
function ParkWord({ text, back, matRef, startAt = 1 }: {
  text: string;
  /** How far behind the origin the plane hangs, in world units. Passed in
   *  rather than derived from a radius here, because with two objects on the
   *  stage the word belongs to neither of them. */
  back: number;
  /** The Scene animates opacity through this during a crossfade — sixty
   *  React renders a second to fade a title would re-render the scene graph
   *  for something one number can do. */
  matRef?: React.RefObject<THREE.MeshBasicMaterial | null>;
  /** What the plane starts at. The incoming title begins invisible so the
   *  crossfade has somewhere to come from. */
  startAt?: number;
}) {
  const store = useStore();
  const size = useThree(s => s.size);
  const dpr = useThree(s => s.viewport.dpr);
  const invalidate = useThree(s => s.invalidate);
  const mesh = useRef<THREE.Mesh>(null);

  const [tex, setTex] = useState<{ map: THREE.CanvasTexture; aspect: number } | null>(null);
  const colour = useThemeColour();

  const targetPx = Math.round(size.width * dpr * WORD_WIDTH);

  useEffect(() => {
    if (targetPx <= 0) return;
    let dead = false;
    let made: THREE.CanvasTexture | null = null;

    (async () => {
      const built = await buildWordTexture(text, targetPx);
      if (dead) { built.map.dispose(); return; }
      made = built.map;
      setTex(built);
      invalidate();
    })();

    return () => { dead = true; made?.dispose(); };
  }, [text, targetPx, invalidate]);

  // Sized and placed in world units so it lands where it was designed to on
  // screen: pushed back past the object, then scaled up to compensate for the
  // extra distance, which is why the word does not shrink as it moves behind.
  useEffect(() => {
    const m = mesh.current;
    if (!m || !tex) return;
    const camera = store.getState().camera as THREE.PerspectiveCamera;

    const dist = camera.position.length() + back;
    const worldH = 2 * dist * Math.tan(((FOV_DEG * Math.PI) / 180) / 2);
    const worldW = worldH * (size.width / size.height);

    // Width first, because the brief is that the name fits the viewport. Then
    // the height ceiling, which only ever binds for a short name.
    let w = worldW * WORD_WIDTH;
    const maxH = worldH * WORD_MAX_HEIGHT;
    if (w / tex.aspect > maxH) w = maxH * tex.aspect;
    m.scale.set(w, w / tex.aspect, 1);

    // Straight back along the view axis, and turned to face the camera, so it
    // reads as flat screen typography rather than as a sign standing in a
    // scene. Static: nothing ever moves it.
    const forward = camera.position.clone().normalize().multiplyScalar(-1);
    m.position.copy(forward.multiplyScalar(back));
    m.quaternion.copy(camera.quaternion);
    invalidate();
  }, [store, tex, back, size.width, size.height, invalidate]);

  if (!tex) return null;

  return (
    <mesh ref={mesh} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
      {/* depthTest on is the entire effect: the scan is opaque and drawn
          first, so wherever it is nearer, these pixels are discarded and the
          word is genuinely behind it. depthWrite off because the plane is
          transparent and has no business occluding anything itself. */}
      <meshBasicMaterial
        ref={matRef}
        opacity={startAt}
        map={tex.map}
        color={colour}
        transparent
        depthTest
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** The page's own --foreground, so the word is dark on the light ground and
 *  light on the dark one from the same texture. */
function useThemeColour(): string {
  const [colour, setColour] = useState("#f0f0eb");

  useEffect(() => {
    const read = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue("--foreground").trim();
      if (v) setColour(v);
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", read);
    return () => { obs.disconnect(); scheme.removeEventListener("change", read); };
  }, []);

  return colour;
}

/**
 * One texel per device pixel, and the bitmap is the ink rather than the
 * advance: measured small, then drawn at the size that makes the letterforms
 * exactly as wide as they will be on screen.
 *
 * Cropping is impossible by construction because the texture is cut to the
 * measured bounding box, including any overhang past the last glyph's advance,
 * and the plane is then scaled to that box. A name is never
 * fitted to a font size chosen at some other viewport.
 */
async function buildWordTexture(text: string, targetPx: number) {
  const label = text.toUpperCase();
  // UPRIGHT. The system rule is upright MSCHN at maximum fitted size, and this
  // string is the only thing that decides it. It said "italic 500" before,
  // carried over unthinkingly from the old RandomPark CSS, so both parks
  // rendered oblique. Requesting italic here is also the one way to get a
  // *synthesised* skew: the first family in the stack is a locally-installed
  // static cut, and if it has no italic instance the browser fakes one by
  // shearing the upright. Asking for normal removes both problems at once.
  //
  // The stack matches --font-display exactly, so this is the same face the rest
  // of the page sets.
  const face = (px: number) => "500 " + px + "px 'MSCHN Medium', MSCHN, Rubik, Arial, sans-serif";
  const track = (g: CanvasRenderingContext2D) => {
    // Matches the display type's tracking. Not supported everywhere; harmless
    // where it is not, since the same context does the measuring.
    try { (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "-0.02em"; } catch { /* ignore */ }
  };

  // Without this the first draw can land on the fallback face — MSCHN is
  // font-display: swap, so it is not necessarily ready when this module is.
  try { await document.fonts.load(face(200), label); await document.fonts.ready; } catch { /* whatever resolved */ }

  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) throw new Error("no 2d context");

  const PROBE_PX = 100;
  probe.font = face(PROBE_PX);
  track(probe);
  const pm = probe.measureText(label);
  // The real ink width, not the advance: a glyph can overhang its own advance
  // and a capital can start left of the origin. Measuring the advance instead
  // is what lets a name spill past the gutter it was supposed to respect.
  const inkW = pm.actualBoundingBoxLeft + pm.actualBoundingBoxRight;
  const px = Math.min(4096 / (inkW / PROBE_PX), (targetPx / inkW) * PROBE_PX);

  const c = document.createElement("canvas");
  const g = c.getContext("2d");
  if (!g) throw new Error("no 2d context");
  g.font = face(px);
  track(g);

  const m = g.measureText(label);
  const left = m.actualBoundingBoxLeft;
  const asc = m.actualBoundingBoxAscent;
  c.width = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight);
  c.height = Math.ceil(asc + m.actualBoundingBoxDescent);

  // Resizing the canvas resets the context, so everything is set again. The
  // origin is offset by the measured bearings, which is what puts the ink
  // flush against all four edges.
  g.font = face(px);
  track(g);
  g.fillStyle = "#ffffff";
  g.textBaseline = "alphabetic";
  g.fillText(label, left, asc);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.minFilter = THREE.LinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.generateMipmaps = false;
  return { map, aspect: c.width / c.height };
}

// ── Camera ────────────────────────────────────────────────────────────────
/**
 * One camera, set from the viewport and never from the object.
 *
 * The fit that used to live here has not gone away — it moved into fitObject
 * below, which solves the same convergence for the object's scale instead of
 * for the camera's distance. Same sampling, same FRAMING, same answer on
 * screen; the difference is that the answer is now a property of each object
 * rather than of the stage, so two of them can be on it at once and neither
 * changes size while it travels.
 */
function FixedCamera() {
  const store = useStore();
  const size = useThree(s => s.size);
  const invalidate = useThree(s => s.invalidate);

  useEffect(() => {
    const camera = store.getState().camera as THREE.PerspectiveCamera;
    const elev = (ELEVATION_DEG * Math.PI) / 180;
    camera.fov = FOV_DEG;
    camera.aspect = size.width / size.height;
    camera.near = Math.max(0.01, CAM_DIST * 0.02);
    // Deep enough to hold an object that has travelled a frame-width sideways
    // as well as the word plane hanging behind it.
    camera.far = CAM_DIST * 12;
    camera.position.set(0, CAM_DIST * Math.sin(elev), CAM_DIST * Math.cos(elev));
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    invalidate();
  }, [store, size.width, size.height, invalidate]);

  return null;
}

/** How wide the frame is in world units at the origin's depth, which is how
 *  far an object has to travel to be gone. */
function frameWidth(aspect: number): number {
  const vFov = (FOV_DEG * Math.PI) / 180;
  return 2 * CAM_DIST * Math.tan(vFov / 2) * aspect;
}

/**
 * The scale and vertical offset that put this object in the frame the way the
 * camera fit used to.
 *
 * The method is the one the camera fit used and the reasoning behind it is
 * unchanged: sample the rim of the cylinder the object sweeps, project those
 * points through the real camera, read the screen box back, and correct. It is
 * measured rather than derived because the camera looks down at 20 degrees and
 * the near edge of a wide object projects further from centre than an
 * orthographic formula predicts — on the ledge that was 64px of drift.
 *
 * What changed is the unknown. It used to move the camera until the object
 * fitted; it now scales the object until it fits a camera that cannot move.
 */
function fitObject(
  camera: THREE.PerspectiveCamera,
  radius: number,
  halfHeight: number,
  artScale: number,
): { scale: number; dy: number } {
  const vFov = (FOV_DEG * Math.PI) / 180;
  const elev = (ELEVATION_DEG * Math.PI) / 180;

  // Unit rim, scaled inside the loop — so the samples cost one multiply per
  // pass rather than a rebuild.
  const rim: [number, number, number][] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    rim.push([Math.cos(a) * radius, halfHeight, Math.sin(a) * radius]);
    rim.push([Math.cos(a) * radius, -halfHeight, Math.sin(a) * radius]);
  }

  // Starts from the object's own world size so a 4-unit scan and a 10-unit one
  // both begin near the answer rather than converging from opposite ends.
  let scale = radius > 0 ? 1 / radius : 1;
  let dy = 0;
  const v = new THREE.Vector3();

  for (let pass = 0; pass < 6; pass++) {
    const drop = halfHeight * 2 * OBJECT_DROP * scale;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y, z] of rim) {
      v.set(x * scale, y * scale + dy - drop, z * scale).project(camera);
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }
    const need = Math.max((maxX - minX) / 2, (maxY - minY) / 2);
    if (need <= 0) break;
    // Move what is actually drawn onto the frame's centre. The object moves now
    // rather than the camera's aim, so the correction is the same magnitude
    // with the opposite sign.
    dy -= ((maxY + minY) / 2) * (CAM_DIST * Math.tan(vFov / 2)) / Math.cos(elev);
    scale *= (artScale / FRAMING) / need;
  }

  return { scale, dy };
}

// ── Turntable ─────────────────────────────────────────────────────────────
/**
 * The render loop, and the only thing in the module that costs anything at
 * idle. It derives the rotation from real elapsed time and then asks R3F for a
 * frame; the pacing constant governs how often a frame is drawn, never how
 * fast the object turns.
 *
 * When `running` goes false the rAF is cancelled outright rather than left
 * spinning on a flag — offscreen means no work, not cheap work.
 */
function Turntable({ target, running, motion }: {
  target: React.RefObject<THREE.Group | null>;
  running: boolean;
  motion: Motion;
}) {
  const invalidate = useThree(s => s.invalidate);

  useEffect(() => {
    const group = target.current;
    if (!group) return;

    if (!running) {
      // Held still, but still drawn once — a paused exhibit is a visible one.
      invalidate();
      return;
    }

    let raf = 0;
    let last = performance.now();
    let tick = 0;
    // Orbit accumulates; the sweep is a function of elapsed time. Both are
    // driven by the clock rather than by frame count, so the motion takes the
    // same wall-clock time on a slow device as on a fast one.
    let turned = group.rotation.y;
    let elapsed = 0;

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      if (++tick < VSYNCS_PER_FRAME) return;
      tick = 0;
      const dt = (now - last) / 1000;
      last = now;
      elapsed += dt;

      if (motion === "pingpong") {
        group.rotation.y = SWEEP_RAD * Math.sin((elapsed * Math.PI * 2) / SWEEP_S);
      } else {
        turned += SPEED * dt;
        group.rotation.y = turned;
      }
      invalidate();
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running, target, invalidate, motion]);

  return null;
}

// ── Scene ─────────────────────────────────────────────────────────────────

/** One exhibit: which scan, which name, and how it behaves. */
export type StageSlot = {
  key: string;
  src: string;
  word: string;
  motion: Motion;
  /** Art direction on the size the geometry implies; see DEFAULT_OBJECT_SCALE. */
  scale?: number;
};

/**
 * A scan, fitted to the fixed camera and turning on its own axis.
 *
 * Its own group, so the slide can move the track underneath it without
 * touching the rotation — the turntable spins the inner group, the track
 * translates the outer one, and neither has to know about the other.
 */
function ObjectSlot({ slot, x, running, reduced, onReady }: {
  slot: StageSlot;
  /** Where this slot sits on the track, in world units. */
  x: number;
  running: boolean;
  reduced: boolean;
  onReady: (key: string) => void;
}) {
  const store = useStore();
  const size = useThree(s => s.size);
  const invalidate = useThree(s => s.invalidate);
  const spin = useRef<THREE.Group>(null);
  const [fitted, setFitted] = useState(false);

  const handleReady = useCallback((obj: THREE.Object3D) => {
    // Measured from the object back at its own origin and its own scale, not
    // from wherever the last mount left it. useGLTF caches the parsed scene by
    // URL and hands back the same Object3D every time, so once the module could
    // be browsed this had to be idempotent: without the reset, stepping away
    // and back re-centred an already-centred scene and re-scaled an
    // already-scaled one, and the object walked out of frame a step at a time.
    obj.position.set(0, 0, 0);
    obj.scale.set(1, 1, 1);
    obj.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(obj);
    const centre = box.getCenter(new THREE.Vector3());
    const dims = box.getSize(new THREE.Vector3());
    // The turn is about Y, so the swept radius is the diagonal of the
    // horizontal footprint — not half the largest dimension.
    const radius = Math.hypot(dims.x, dims.z) / 2;
    const halfHeight = dims.y / 2;

    const camera = store.getState().camera as THREE.PerspectiveCamera;
    const { scale, dy } = fitObject(
      camera, radius, halfHeight, slot.scale ?? DEFAULT_OBJECT_SCALE);

    // Centred on the turntable's axis first — the GLBs are authored around
    // their own origins, not their centroids, so turning one as-authored
    // swings it through an arc instead of rotating it on the spot. Then
    // dropped below the word's centre line, and scaled: position is in the
    // parent's units, so the centring offset scales with the object.
    obj.position.copy(centre).multiplyScalar(-1);
    obj.position.y -= dims.y * OBJECT_DROP;
    obj.position.multiplyScalar(scale);
    obj.scale.setScalar(scale);

    const group = spin.current;
    if (group) {
      group.position.y = dy;
      group.rotation.y = reduced ? STATIC_ANGLE : 0;
    }
    setFitted(true);
    onReady(slot.key);
    invalidate();
    // Not size-dependent: it reads the camera when it runs, and the camera is
    // already current. What re-runs it on resize is Model's own sizeKey.
  }, [store, slot.key, slot.scale, reduced, onReady, invalidate]);

  return (
    <group position-x={x}>
      <group ref={spin}>
        <Suspense fallback={null}>
          <Model src={slot.src} onReady={handleReady} sizeKey={`${size.width}x${size.height}`} />
        </Suspense>
      </group>
      <Turntable
        target={spin}
        motion={slot.motion}
        running={running && !reduced && fitted}
      />
    </group>
  );
}

function Scene({
  current, incoming, dir, running, reduced, onReady, onSlideEnd,
}: {
  current: StageSlot;
  /** The object being stepped to, mounted a frame-width off the edge and held
   *  there until both it and the outgoing one can move together. Null when
   *  the stage is settled. */
  incoming: StageSlot | null;
  /** 1 stepping forward — the incoming object enters from the right and the
   *  outgoing one leaves to the left. -1 reverses both. */
  dir: 1 | -1;
  running: boolean;
  reduced: boolean;
  onReady?: (key: string) => void;
  onSlideEnd?: () => void;
}) {
  const size = useThree(s => s.size);
  const invalidate = useThree(s => s.invalidate);
  const track = useRef<THREE.Group>(null);
  const curMat = useRef<THREE.MeshBasicMaterial>(null);
  const incMat = useRef<THREE.MeshBasicMaterial>(null);
  const [ready, setReady] = useState<Record<string, boolean>>({});

  const aspect = size.height > 0 ? size.width / size.height : 1;
  const travel = frameWidth(aspect) * SLIDE_CLEARANCE;

  const markReady = useCallback((key: string) => {
    setReady(r => (r[key] ? r : { ...r, [key]: true }));
    onReady?.(key);
  }, [onReady]);

  // Both fitted and both drawable before anything moves. Starting the slide on
  // one of them means the other arrives mid-travel, which is the stale layer
  // the brief rules out.
  const pairReady = !!ready[current.key] && (!incoming || !!ready[incoming.key]);

  /**
   * The slide.
   *
   * Both objects are already in the scene, already the right size and already
   * turning before this runs; it only translates the track they share. So they
   * travel together at one speed and neither changes shape, size or rotation
   * on the way — the flat ease is the only thing shaping the motion.
   *
   * The word planes are deliberately not on the track. They are the ground the
   * objects cross rather than passengers on it, so they hold still and
   * crossfade.
   */
  useEffect(() => {
    const group = track.current;
    if (!group || !incoming || !pairReady) return;

    const to = -dir * travel;
    let raf = 0;
    const t0 = performance.now();

    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / SLIDE_MS);
      const e = easeInOut(t);
      group.position.x = to * e;
      if (curMat.current) curMat.current.opacity = 1 - e;
      if (incMat.current) incMat.current.opacity = e;
      invalidate();
      if (t < 1) { raf = requestAnimationFrame(frame); return; }
      onSlideEnd?.();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [incoming, pairReady, dir, travel, invalidate, onSlideEnd]);

  /**
   * Back to rest, in the same commit that drops the outgoing object.
   *
   * A step ends with the track one frame-width off centre and the object that
   * arrived declared at that same offset, so zeroing both together is a no-op
   * on screen. A layout effect is what keeps it one: a paint between the two
   * would show the new object sitting a screen away from where it belongs.
   */
  useLayoutEffect(() => {
    const group = track.current;
    if (!group || incoming) return;
    group.position.x = 0;
    if (curMat.current) curMat.current.opacity = 1;
    invalidate();
  }, [incoming, current.key, invalidate]);

  const lights = useMemo(() => (
    <>
      {/* No Environment: drei's presets fetch an HDR from a third-party CDN,
          which is a network dependency this module should not put on the
          homepage. Three lights, and the fill keeps the far side off black. */}
      <ambientLight intensity={1.15} />
      <directionalLight position={[-2, 3, 2]} intensity={1.6} />
      <directionalLight position={[3, 1.5, -1.5]} intensity={0.45} />
    </>
  ), []);

  // Behind everything the objects do, and taken from the frame rather than
  // from whichever object happens to be showing — with two of them on the
  // stage the word belongs to neither.
  const back = frameWidth(aspect) * 0.25 * WORD_DEPTH;

  return (
    <>
      {lights}
      <FixedCamera />

      {/* Drawn before the words, and opaque, so they own the depth buffer where
          they stand and the type is genuinely behind them rather than masked. */}
      <group ref={track}>
        <ObjectSlot
          key={current.key}
          slot={current}
          x={0}
          running={running}
          reduced={reduced}
          onReady={markReady}
        />
        {incoming && (
          <ObjectSlot
            key={incoming.key}
            slot={incoming}
            x={dir * travel}
            running={running}
            reduced={reduced}
            onReady={markReady}
          />
        )}
      </group>

      <ParkWord key={current.key} text={current.word} back={back} matRef={curMat} />
      {incoming && (
        <ParkWord key={incoming.key} text={incoming.word} back={back} matRef={incMat} startAt={0} />
      )}
    </>
  );
}

// ── Export ────────────────────────────────────────────────────────────────
export default function FoundObjectStage({
  current, incoming, dir, running, reduced, onReady, onSlideEnd,
}: {
  current: StageSlot;
  incoming: StageSlot | null;
  dir: 1 | -1;
  /** On screen, and allowed to move. */
  running: boolean;
  /** prefers-reduced-motion — hold a good angle instead of turning. */
  reduced: boolean;
  onReady?: (key: string) => void;
  onSlideEnd?: () => void;
}) {
  return (
    <Canvas
      frameloop="demand"
      // Capped rather than device-native: this is an ambient object behind
      // type, and a 3x phone display would otherwise shade nine times the
      // pixels of a 1x one for a difference nobody is looking for here.
      dpr={[1, 1.5]}
      camera={{ fov: FOV_DEG, position: [0, 1, 4] }}
      gl={{ antialias: true, alpha: true, logarithmicDepthBuffer: true }}
      style={{ position: "absolute", inset: 0 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NoToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        // The module has no ground of its own; the page is the ground.
        gl.setClearAlpha(0);
      }}
    >
      <Scene
        current={current}
        incoming={incoming}
        dir={dir}
        running={running}
        reduced={reduced}
        onReady={onReady}
        onSlideEnd={onSlideEnd}
      />
    </Canvas>
  );
}
