"use client";

import { lazy, Suspense } from "react";

const ParksDirectory = lazy(() => import("./ParksDirectory"));

export default function ParksMapDynamic() {
  return (
    <Suspense
      fallback={
        <div style={{ width: "100%", height: "calc(100vh - 120px)", background: "var(--background)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "fbs-spin 0.8s linear infinite" }} />
          <p style={{ marginTop: 12, fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Loading…</p>
          <style>{`@keyframes fbs-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <ParksDirectory />
    </Suspense>
  );
}
