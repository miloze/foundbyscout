import * as THREE from "three";

// The scans are lifted so their ground plane sits here in world space, not at
// y=0. Every under-the-floor guard is relative to this — the orbit target is
// pinned to it and the polar limit stays above horizontal from there, so the
// camera can't get beneath the deck. Move the mesh and this moves with it.
export const MODEL_FLOOR_Y = 4;

// ── House defaults for the hero's orbit ───────────────────────────────────
// These bound what a *visitor* may do, and nothing else. They are no longer
// imposed on the frame an author composed: a park's stored camera_pos and
// camera_target widen its own limits just far enough to contain them (see
// limitsForAuthoredFrame), so the opening frame is always reachable.
//
// That distinction is the whole fix. These numbers used to be applied to the
// authored frame too, which meant a hero angle tuned under ?debug=1 — where
// none of them are active — could be silently corrected on the hero's first
// frame. The correction preserved the view direction and moved only the
// framing, which is why it read as "right angle, wrong height" rather than as
// an obviously broken camera.
export const PAN_LIMIT         = 12;
export const TARGET_MIN_Y      = MODEL_FLOOR_Y;
export const TARGET_MAX_Y      = MODEL_FLOOR_Y + 4;
export const HERO_MIN_DISTANCE = 10;
export const HERO_MAX_DISTANCE = 70;
export const HERO_MIN_POLAR    = Math.PI / 7;
export const HERO_MAX_POLAR    = Math.PI * 0.42;

// The one limit an authored frame cannot widen. At 90° the camera sits exactly
// in the target's horizontal plane; past it the orbit cone passes under the
// deck and the scan is seen from below. Everything else here is taste, this is
// the structural floor.
export const HARD_MAX_POLAR = Math.PI * 0.495; // ~89.1°

export type HeroLimits = {
  panLimit:    number;
  targetMinY:  number;
  targetMaxY:  number;
  minDistance: number;
  maxDistance: number;
  minPolar:    number;
  maxPolar:    number;
  /** Radians. ±Infinity — OrbitControls' own default — for an open-air park,
   *  where there is nothing behind the scan to orbit into. */
  minAzimuth:  number;
  maxAzimuth:  number;
};

// ── Enclosed parks ────────────────────────────────────────────────────────
// Most scans are outdoors: there is no "outside" to see, so free orbit is
// safe and these are all null. An interior — Southbank's undercroft, and
// whatever gets scanned next — has a ceiling, a back wall and an open side,
// and photogrammetry gives it no exterior. Orbit too high or too far round and
// the viewer is looking at the back of the room's shell, which reads as a
// broken model rather than as a place.
//
// The fix is OrbitControls' own angle limits rather than anything that
// inspects geometry: the camera simply cannot be dragged past the window, it
// stops at the edge, and it can always be dragged back. Raycasting the camera
// against the mesh each frame is the escalation if a rectangular window cannot
// be made to fit a particular room — not the starting point.
//
// DEGREES, not radians. These are tuned by eye against the scan in the same
// pass as camera_pos, and the debug panel reports the live angles in the same
// unit so a good frame can be read off and pasted. The `Deg` suffix is load
// bearing: `minAzimuthAngle` is an OrbitControls prop name and anyone reading
// it would reasonably assume radians, which is a silent 57x error.
export type CameraBounds = {
  minAzimuthDeg?: number | null;
  maxAzimuthDeg?: number | null;
  minPolarDeg?:   number | null;
  maxPolarDeg?:   number | null;
  /** Overrides the 10–70 house range. A room has a far wall, so zooming out
   *  has to stop before the camera reaches it. */
  minDistance?:   number | null;
  maxDistance?:   number | null;
};

const RAD = (deg: number) => deg * Math.PI / 180;
export const DEG = (rad: number) => rad * 180 / Math.PI;

/** Does this park bound its azimuth on both sides? That is the question the
 *  automatic rotation asks: a park with a full circle to play with rotates one
 *  way forever, a bounded one has to turn round at the ends. */
export const hasAzimuthSweep = (L: HeroLimits) =>
  Number.isFinite(L.minAzimuth) && Number.isFinite(L.maxAzimuth) && L.maxAzimuth > L.minAzimuth;

export const DEFAULT_HERO_LIMITS: HeroLimits = {
  panLimit:    PAN_LIMIT,
  targetMinY:  TARGET_MIN_Y,
  targetMaxY:  TARGET_MAX_Y,
  minDistance: HERO_MIN_DISTANCE,
  maxDistance: HERO_MAX_DISTANCE,
  minPolar:    HERO_MIN_POLAR,
  maxPolar:    HERO_MAX_POLAR,
  minAzimuth:  -Infinity,
  maxAzimuth:   Infinity,
};

export const polarOf = (v: THREE.Vector3) => {
  const r = v.length();
  return r > 1e-6 ? Math.acos(THREE.MathUtils.clamp(v.y / r, -1, 1)) : HERO_MIN_POLAR;
};

// Widen the house defaults just far enough to contain the frame the author
// composed, so the hero can open on it verbatim. A park that stays inside the
// defaults keeps them exactly; one that reaches past them extends the visitor's
// range only in the direction the author already chose to go — you can never
// end up somewhere the author did not stand.
//
// HARD_MAX_POLAR is the exception and is applied last: no stored value gets to
// put the camera under the deck.
export function limitsForAuthoredFrame(
  camPos: THREE.Vector3,
  target: THREE.Vector3,
  bounds?: CameraBounds | null,
): HeroLimits {
  const v     = camPos.clone().sub(target);
  const dist  = v.length();
  const polar = polarOf(v);
  const base: HeroLimits = {
    panLimit:    Math.max(PAN_LIMIT, Math.abs(target.x), Math.abs(target.z)),
    targetMinY:  Math.min(TARGET_MIN_Y, target.y),
    targetMaxY:  Math.max(TARGET_MAX_Y, target.y),
    minDistance: Math.min(HERO_MIN_DISTANCE, dist),
    maxDistance: Math.max(HERO_MAX_DISTANCE, dist),
    minPolar:    Math.max(0, Math.min(HERO_MIN_POLAR, polar)),
    maxPolar:    Math.min(HARD_MAX_POLAR, Math.max(HERO_MAX_POLAR, polar)),
    minAzimuth:  -Infinity,
    maxAzimuth:   Infinity,
  };
  if (!bounds) return base;

  // Authored bounds REPLACE the house numbers rather than widening them, which
  // is the opposite of how the frame above is treated — and deliberately so.
  // Widening exists to guarantee the composed opening frame is reachable; that
  // is a floor on the visitor's range. These are a ceiling on it, and a ceiling
  // that can be widened by the very frame it is meant to contain would be no
  // ceiling at all. If a park's stored camera_pos sits outside its own bounds
  // the debug panel says so, which is the right place to find out.
  //
  // HARD_MAX_POLAR still wins: no stored value puts the camera under the deck.
  const n = (x: number | null | undefined) => (x == null ? null : x);
  return {
    ...base,
    minAzimuth:  n(bounds.minAzimuthDeg) != null ? RAD(bounds.minAzimuthDeg!) : base.minAzimuth,
    maxAzimuth:  n(bounds.maxAzimuthDeg) != null ? RAD(bounds.maxAzimuthDeg!) : base.maxAzimuth,
    minPolar:    n(bounds.minPolarDeg)   != null
      ? THREE.MathUtils.clamp(RAD(bounds.minPolarDeg!), 0, HARD_MAX_POLAR)
      : base.minPolar,
    maxPolar:    n(bounds.maxPolarDeg)   != null
      ? THREE.MathUtils.clamp(RAD(bounds.maxPolarDeg!), 0, HARD_MAX_POLAR)
      : base.maxPolar,
    minDistance: n(bounds.minDistance)   != null ? bounds.minDistance! : base.minDistance,
    maxDistance: n(bounds.maxDistance)   != null ? bounds.maxDistance! : base.maxDistance,
  };
}

export const clampTarget = (t: THREE.Vector3, L: HeroLimits) => new THREE.Vector3(
  THREE.MathUtils.clamp(t.x, -L.panLimit, L.panLimit),
  THREE.MathUtils.clamp(t.y, L.targetMinY, L.targetMaxY),
  THREE.MathUtils.clamp(t.z, -L.panLimit, L.panLimit),
);

// What the hero will actually show, given a camera and target composed
// anywhere. Mirrors the order the hero applies them in, which matters:
//
//   1. PanClamp pulls the target back inside its box and translates the camera
//      by the *same* delta. That is why an out-of-range target reads as "the
//      angle is right but everything sits too low" rather than as a wrong
//      angle — a shared translation leaves the view direction untouched and
//      moves only where the frame is centred.
//   2. OrbitControls then applies its own radius and polar limits around that
//      corrected target.
//
// Pure — it reads the vectors and returns new ones, so callers can use it to
// preview or to warn without disturbing the live camera. Given the park's own
// limits, the authored frame is a fixed point: constrained comes back false.
export function heroFrame(
  camPos: THREE.Vector3,
  target: THREE.Vector3,
  L: HeroLimits = DEFAULT_HERO_LIMITS,
) {
  const tgt = clampTarget(target, L);
  const pos = camPos.clone().add(tgt.clone().sub(target));

  const sph = new THREE.Spherical().setFromVector3(pos.clone().sub(tgt));
  sph.radius = THREE.MathUtils.clamp(sph.radius, L.minDistance, L.maxDistance);
  sph.phi    = THREE.MathUtils.clamp(sph.phi,    L.minPolar,    L.maxPolar);
  // Azimuth only bites on an enclosed park; open air leaves these at ±Infinity
  // and clamp() is then the identity.
  sph.theta  = THREE.MathUtils.clamp(sph.theta,  L.minAzimuth,  L.maxAzimuth);
  sph.makeSafe();

  const out = tgt.clone().add(new THREE.Vector3().setFromSpherical(sph));
  // 0.005 world units — below anything that reads on screen, and well above
  // the float noise that would otherwise flag every frame as "constrained".
  const moved = out.distanceTo(camPos) > 0.005 || tgt.distanceTo(target) > 0.005;
  return { position: out, target: tgt, constrained: moved };
}
