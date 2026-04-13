"use client";

import { useEffect, useRef } from "react";

export default function GlitchText({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function runGlitch() {
      const el = ref.current;
      if (!el) { timeout = setTimeout(runGlitch, 300); return; }

      const effects = shuffle(["tracking", "chroma", "scanline", "distort"]);
      const count   = 1 + Math.floor(Math.random() * 2);
      const chosen  = effects.slice(0, count);

      chosen.forEach(fx => el.classList.add(`glitch-${fx}`));

      const dur = 80 + Math.random() * 200;
      setTimeout(() => {
        chosen.forEach(fx => el.classList.remove(`glitch-${fx}`));
        // Fire again immediately with a tiny gap
        timeout = setTimeout(runGlitch, 100 + Math.random() * 200);
      }, dur);
    }

    runGlitch();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      <style>{`
        /* ── Chromatic aberration ── */
        .glitch-chroma {
          text-shadow: -4px 0 #ff5841, 4px 0 #ff9070, 0 0 8px rgba(255,88,65,0.2);
        }

        /* ── Tracking error: sliced horizontal displacement ── */
        @keyframes glitch-track {
          0%   { clip-path: inset(10% 0 80% 0); transform: translateX(-6px); }
          25%  { clip-path: inset(55% 0 30% 0); transform: translateX(5px);  }
          50%  { clip-path: inset(30% 0 55% 0); transform: translateX(-3px); }
          75%  { clip-path: inset(70% 0 5%  0); transform: translateX(7px);  }
          100% { clip-path: inset(0% 0 100% 0); transform: translateX(0);    }
        }
        .glitch-tracking::before,
        .glitch-tracking::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          color: inherit;
          font: inherit;
          letter-spacing: inherit;
        }
        .glitch-tracking { position: relative; }
        .glitch-tracking::before {
          animation: glitch-track 0.12s steps(3) both;
          color: #ff5841;
          opacity: 0.8;
        }
        .glitch-tracking::after {
          animation: glitch-track 0.16s steps(3) reverse both;
          color: #ff9070;
          opacity: 0.7;
        }

        /* ── Text distortion: sliced white text displaced ── */
        @keyframes glitch-d1 {
          0%   { clip-path: inset(8%  0 88% 0); transform: translateX(8px)  skewX(-3deg); }
          25%  { clip-path: inset(40% 0 50% 0); transform: translateX(-10px) skewX(4deg);  }
          50%  { clip-path: inset(65% 0 20% 0); transform: translateX(6px)  skewX(-2deg); }
          75%  { clip-path: inset(25% 0 65% 0); transform: translateX(-8px) skewX(3deg);  }
          100% { clip-path: inset(0%  0 100% 0); transform: translateX(0)   skewX(0deg);  }
        }
        @keyframes glitch-d2 {
          0%   { clip-path: inset(55% 0 35% 0); transform: translateX(-12px) skewX(5deg);  }
          33%  { clip-path: inset(15% 0 75% 0); transform: translateX(9px)   skewX(-4deg); }
          66%  { clip-path: inset(78% 0 12% 0); transform: translateX(-5px)  skewX(2deg);  }
          100% { clip-path: inset(0%  0 100% 0); transform: translateX(0)    skewX(0deg);  }
        }
        .glitch-distort { position: relative; }
        .glitch-distort::before,
        .glitch-distort::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          color: var(--foreground);
          font: inherit;
          letter-spacing: inherit;
          text-transform: inherit;
        }
        .glitch-distort::before { animation: glitch-d1 0.14s steps(4) both; }
        .glitch-distort::after  { animation: glitch-d2 0.18s steps(4) both; opacity: 0.85; }

        /* ── Scanline flash ── */
        @keyframes glitch-scan {
          0%   { background-position: 0 0;   opacity: 1;   }
          50%  { background-position: 0 40%; opacity: 0.6; }
          100% { background-position: 0 80%; opacity: 0;   }
        }
        .glitch-scanline::after {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent 0px, transparent 3px,
            rgba(255,255,255,0.06) 3px, rgba(255,255,255,0.06) 4px
          );
          animation: glitch-scan 0.15s steps(3) both;
          pointer-events: none;
        }
        .glitch-scanline { position: relative; overflow: hidden; }

      `}</style>
      <h1
        ref={ref}
        data-text={typeof children === "string" ? children : undefined}
        style={{ ...style }}
      >
        {children}
      </h1>
    </>
  );
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
