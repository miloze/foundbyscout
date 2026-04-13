"use client";

import { useEffect, useState, useRef } from "react";

const MESSAGES = [
  "It's sunny out. Go skate.",
  "Put the phone down. Go skate.",
  "Excuses excuses. Go skate.",
  "Scout says go skate.",
  "Dry pavement. No excuses.",
  "The park is empty right now.",
  "You could be skating.",
  "Stop scrolling. Go skate.",
  "No rain. No reason.",
  "The session starts when you do.",
  "Concrete doesn't care. Go skate.",
  "Everyone else already left. Go skate.",
];

const IDLE_MS = 30_000;

function pick(): string {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

export default function IdleSkate() {
  const [visible, setVisible] = useState(false);
  const [msg,     setMsg]     = useState("");
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setMsg(pick());
      setVisible(true);
    }, IDLE_MS);
  };

  const dismiss = () => { setVisible(false); reset(); };

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"];
    const handler = () => { setVisible(false); reset(); };
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    reset();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, handler));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  // Repeat the message enough times to fill double-width for a seamless loop
  const repeated = Array.from({ length: 10 }, (_, i) => (
    <span key={i} style={{ paddingRight: "0.55em" }}>
      {msg}<span style={{ color: "#ff5841" }}> · </span>
    </span>
  ));

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        pointerEvents: "auto",
        display: "flex", alignItems: "center",
        overflow: "hidden", cursor: "pointer",
      }}
    >
      <style>{`
        .idle-banner { background: #ffffff; }
        [data-theme="light"] .idle-banner { background: #2a2a2a; }
        @keyframes idle-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .idle-strip {
          display: flex;
          white-space: nowrap;
          font-family: var(--font-heading), sans-serif;
          font-size: clamp(3.5rem, 10vw, 9rem);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.03em;
          line-height: 1;
          color: var(--accent);
          animation: idle-marquee 14s linear infinite;
          will-change: transform;
        }
      `}</style>

      <div className="idle-banner" style={{ padding: "1.2em 0", width: "160%", marginLeft: "-30%", transform: "rotate(-8deg)", overflow: "hidden" }}>
        <div className="idle-strip" style={{ transform: "none", width: "100%", margin: 0 }}>
          {repeated}
        </div>
      </div>
    </div>
  );
}
