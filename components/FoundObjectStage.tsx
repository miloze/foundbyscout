"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const SPEED = (Math.PI * 2) / REVOLUTION_S;

export type Motion = "orbit" | "pingpong";

// ── Model ─────────────────────────────────────────────────────────────────
function Model({ src, onReady }: { src: string; onReady: (o: THREE.Object3D) => void }) {
  const { scene } = useGLTF(src);

  useEffect(() => {
    // Photogrammetry exports arrive with transparency and depth settings that
    // drop faces at grazing angles — the same fix the park viewers apply. The
    // culling one matters here: Stockwell's materials are single-sided and its
    // meshes carry no NORMAL attribute, so without this it renders as holes.
    scene.traverse(child => {
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
    onReady(scene);
  }, [scene, onReady]);

  return <primitive object={scene} />;
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
function ParkWord({ text, radius, depth }: { text: string; radius: number; depth: number }) {
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

    const back = radius * depth;
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
  }, [store, tex, radius, depth, size.width, size.height, invalidate]);

  if (!tex) return null;

  return (
    <mesh ref={mesh} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
      {/* depthTest on is the entire effect: the scan is opaque and drawn
          first, so wherever it is nearer, these pixels are discarded and the
          word is genuinely behind it. depthWrite off because the plane is
          transparent and has no business occluding anything itself. */}
      <meshBasicMaterial
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
 * Frames the cylinder the object sweeps through a full turn, rather than the
 * silhouette it happens to present at rest — otherwise a wide object clips its
 * own corners a few seconds in. Recomputed on resize because the horizontal
 * fit depends on the aspect ratio, and this box is a very different shape at
 * 1440 and at 390.
 */
function Framing({ radius, halfHeight, scale }: {
  radius: number; halfHeight: number; scale: number;
}) {
  // Reached through the store rather than as a hook return: the camera has to
  // be mutated (R3F offers no declarative way to set a derived position), and
  // the compiler rightly objects to writing through a hook's value.
  const store = useStore();
  const size = useThree(s => s.size);
  const invalidate = useThree(s => s.invalidate);

  useEffect(() => {
    if (radius <= 0) return;
    const camera = store.getState().camera as THREE.PerspectiveCamera;
    const elev = (ELEVATION_DEG * Math.PI) / 180;
    const vFov = (FOV_DEG * Math.PI) / 180;
    const aspect = size.width / size.height;
    const drop = halfHeight * 2 * OBJECT_DROP;

    /**
     * The fit is measured, not derived from a formula.
     *
     * It used to be analytic — radius*sin(elev) + halfHeight*cos(elev) — which
     * is an orthographic answer to a perspective question. The camera looks
     * down at 20 degrees, so the near edge of a wide object is closer to it
     * than the far edge and projects further from centre: the silhouette sits
     * lower in frame than its own centre suggests. On the ledge that was 64px
     * of unaccounted drift at 1440, and it spent the entire bottom margin —
     * measured clearance was 12px at the bottom against 147px at the top.
     *
     * So instead: sample the rim of the cylinder the object sweeps, project
     * those points through the real camera, and read the screen box back.
     * Then correct the distance for the extent and the aim for the centre, and
     * repeat. It converges in a few passes, runs once per resize, and is right
     * for any silhouette rather than for the one it was tuned against.
     */
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      pts.push(new THREE.Vector3(x, halfHeight - drop, z));
      pts.push(new THREE.Vector3(x, -halfHeight - drop, z));
    }

    camera.fov = FOV_DEG;
    camera.aspect = aspect;

    // A rough starting point; the loop below does the actual work.
    let dist = (radius * 2) / Math.tan(vFov / 2);
    let aim = 0;
    const v = new THREE.Vector3();

    for (let pass = 0; pass < 5; pass++) {
      camera.near = Math.max(0.01, dist * 0.02);
      camera.far = (dist + radius * 4) * 4;
      camera.position.set(0, dist * Math.sin(elev) + aim, dist * Math.cos(elev));
      camera.lookAt(0, aim, 0);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of pts) {
        v.copy(p).project(camera);
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
      }

      // Normalised device coordinates: the frame is -1..1 on both axes, so the
      // half-extent the object needs is directly comparable to 1.
      const need = Math.max((maxX - minX) / 2, (maxY - minY) / 2);
      // Bring the vertical centre of what is actually drawn onto the frame's
      // centre, in world units along the camera's own up axis.
      aim += ((maxY + minY) / 2) * (dist * Math.tan(vFov / 2)) / Math.cos(elev);
      dist *= (need * FRAMING) / scale;
    }

    camera.near = Math.max(0.01, dist * 0.02);
    camera.far = (dist + radius * 4) * 4;
    camera.position.set(0, dist * Math.sin(elev) + aim, dist * Math.cos(elev));
    camera.lookAt(0, aim, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [store, size.width, size.height, radius, halfHeight, scale, invalidate]);

  return null;
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
function Scene({ src, word, motion, scale, running, reduced, onLoaded }: {
  src: string; word: string; motion: Motion; scale: number;
  running: boolean; reduced: boolean; onLoaded?: () => void;
}) {
  const spin = useRef<THREE.Group>(null);
  const invalidate = useThree(s => s.invalidate);
  const [fit, setFit] = useState({ radius: 0, halfHeight: 0 });

  /**
   * Centres the object on the turntable's axis and measures what it sweeps.
   *
   * The GLBs are authored around their own origins, not their centroids, so
   * turning one as-authored swings it through an arc instead of rotating it on
   * the spot. Everything here is measured from the loaded scene rather than
   * hardcoded, which is why the same code frames Bloblands (4.2 units across,
   * Z-up with a correcting node quaternion) and Stockwell (10 units across,
   * already Y-up, two meshes) without a per-object number.
   */
  const handleReady = useCallback((obj: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(obj);
    const centre = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    obj.position.sub(centre);
    // Below the word's centre line. Applied to the model inside the turntable
    // group so the group still rotates about its own axis rather than orbiting
    // an offset one.
    obj.position.y -= size.y * OBJECT_DROP;

    setFit({
      // The turn is about Y, so the swept radius is the diagonal of the
      // horizontal footprint — not half the largest dimension.
      radius: Math.hypot(size.x, size.z) / 2,
      halfHeight: size.y / 2,
    });

    if (spin.current) spin.current.rotation.y = reduced ? STATIC_ANGLE : 0;
    onLoaded?.();
    invalidate();
  }, [reduced, onLoaded, invalidate]);

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

  return (
    <>
      {lights}

      {/* Drawn before the word, and opaque, so it owns the depth buffer where
          it stands. */}
      <group ref={spin}>
        <Suspense fallback={null}>
          <Model src={src} onReady={handleReady} />
        </Suspense>
      </group>

      {fit.radius > 0 && <ParkWord text={word} radius={fit.radius} depth={WORD_DEPTH} />}

      <Framing radius={fit.radius} halfHeight={fit.halfHeight} scale={scale} />
      <Turntable target={spin} motion={motion} running={running && !reduced && fit.radius > 0} />
    </>
  );
}

// ── Export ────────────────────────────────────────────────────────────────
export default function FoundObjectStage({
  src, word, motion, scale = DEFAULT_OBJECT_SCALE, running, reduced, onLoaded,
}: {
  src: string;
  /** The park name, set in the scene behind the object. */
  word: string;
  motion: Motion;
  /** Art direction on the derived size: above 1 bigger, below 1 smaller. */
  scale?: number;
  /** On screen, and allowed to move. */
  running: boolean;
  /** prefers-reduced-motion — hold a good angle instead of turning. */
  reduced: boolean;
  onLoaded?: () => void;
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
        src={src}
        word={word}
        motion={motion}
        scale={scale}
        running={running}
        reduced={reduced}
        onLoaded={onLoaded}
      />
    </Canvas>
  );
}
