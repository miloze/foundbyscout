"use client";

import { useEffect, useRef } from "react";

// NOT CURRENTLY MOUNTED. Taken out of app/layout.tsx as a post effect that is
// not intrinsic to the look, and kept here to come back to. Re-enable by
// importing it and rendering <Grain /> in the layout again — nothing else is
// needed, and the performance work below is already done.
//
// Noise is built once into a small pool of tiles and then repeated across the
// viewport, rather than generated per pixel per frame.
//
// The per-frame version cost 64.6ms a frame at 1440x900 and 157.6ms at
// 2560x1440 — against a 16.7ms budget for the whole 60fps frame. It allocated
// a full-viewport ImageData and called Math.random() once per pixel every
// frame: 1.3M randoms and 5.2MB of garbage per frame at 1440x900, rising with
// the square of the viewport. That saturated the main thread on its own, which
// is what pinned the CPU at ~100% on pages carrying a WebGL scene and produced
// multi-hundred-millisecond rAF violations once a major GC landed in a frame.
//
// Reusing the buffer (49.3ms) or packing the writes into a Uint32Array
// (42.2ms) does not rescue it — the per-pixel random is irreducible at
// viewport resolution. Uploading a ready-made buffer costs 0.8ms, so the
// generation was the entire cost. Tiling removes it: 0.007ms a frame.
//
// The tiles are viewport-independent, so a resize does not rebuild them.
const TILE = 256;   // edge of one noise tile, px
const POOL = 8;     // distinct fields cycled through

export default function Grain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let running = false;
    let frame = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // One tile per frame until the pool is full, rather than all of them up
    // front: building the whole pool synchronously is ~50ms of jank landing
    // exactly at page load. Spread this way it is under a millisecond a frame
    // for the first eight frames, and the grain is drawing from frame one.
    const pool: CanvasPattern[] = [];
    const addTile = () => {
      const t = document.createElement("canvas");
      t.width = TILE;
      t.height = TILE;
      const tc = t.getContext("2d");
      if (!tc) return;
      const img = tc.createImageData(TILE, TILE);
      const d = img.data;
      // Per-channel writes, not a packed Uint32: this runs eight times in the
      // life of the page, so clarity beats speed, and it stays correct
      // whatever the platform's byte order.
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
      }
      tc.putImageData(img, 0, 0);
      const p = ctx.createPattern(t, "repeat");
      if (p) pool.push(p);
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      // A zero-sized viewport — minimised window, a hidden/backgrounded tab,
      // some virtual-desktop and monitor-switch paths — makes createImageData
      // throw IndexSizeError. This runs inside a requestAnimationFrame
      // callback, so the throw escapes React's error handling entirely and
      // takes the whole page down to the error boundary. Skip the frame and
      // pick up again when the window has a size.
      if (w === 0 || h === 0) {
        animId = requestAnimationFrame(draw);
        return;
      }

      if (pool.length < POOL) addTile();

      // A different field each frame, shifted by a sub-tile offset, so the
      // grain still boils the way per-frame noise did. Without the offset a
      // pool this small would read as a short repeating cycle.
      const pattern = pool[frame++ % pool.length];
      const ox = (Math.random() * TILE) | 0;
      const oy = (Math.random() * TILE) | 0;
      ctx.setTransform(1, 0, 0, 1, -ox, -oy);
      ctx.fillStyle = pattern;
      // Oversized by a tile so the offset cannot expose an unpainted edge.
      ctx.fillRect(0, 0, w + TILE, h + TILE);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      animId = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running) return;
      running = true;
      animId = requestAnimationFrame(draw);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(animId);
    };

    // Chrome throttles background rAF rather than stopping it, so a hidden tab
    // kept drawing. Page Visibility stops it outright.
    const onVisibility = () => { if (document.hidden) stop(); else start(); };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    if (!document.hidden) start();

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9999,
        opacity: 0.03,
        mixBlendMode: "overlay",
      }}
      aria-hidden="true"
    />
  );
}
