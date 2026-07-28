"use client";

// Shared viewer chrome — the B&W/colour toggle and the 3D enter/exit control
// render identically on the inline hero and inside the fullscreen modal, so the
// cluster can't drift into two separately-maintained variants. Lives in its own
// module because ParkHeroShell already imports ParkViewerModal; importing icons
// back the other way would be circular.

export function BwIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
      {active && <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />}
    </svg>
  );
}

export function ArIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2l8 4.5v9L12 22l-8-6.5V6.5z" />
      <path d="M12 2v20M4 6.5l8 5.5 8-5.5" />
    </svg>
  );
}

// Same mark as ArIcon with a slash through it — sits in the same slot the
// "open in 3D" button occupied, so exiting is where entering was. The cube is
// dimmed so the slash stays legible against it rather than tangling with the
// cube's own edges.
export function ArExitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g opacity="0.5">
        <path d="M12 2l8 4.5v9L12 22l-8-6.5V6.5z" />
        <path d="M12 2v20M4 6.5l8 5.5 8-5.5" />
      </g>
      <line x1="4" y1="20" x2="20" y2="4" strokeWidth="2" />
    </svg>
  );
}

export function ViewerCluster({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      background: "rgba(20,19,15,0.55)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      border: "1px solid rgba(255,255,255,0.18)",
      overflow: "hidden",
    }}>
      {children}
      <style>{`
        @media (max-width: 767px) {
          .fbs-cluster-btn { width: 44px !important; height: 44px !important; }
        }
      `}</style>
    </div>
  );
}

export function ViewerClusterDivider() {
  return <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.18)" }} />;
}

export function ViewerClusterButton({ onClick, title, active = false, children }: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="fbs-cluster-btn"
      style={{
        width: 40, height: 40,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "none", border: "none", cursor: "pointer",
        color: active ? "var(--accent)" : "#fff",
      }}
    >
      {children}
    </button>
  );
}
