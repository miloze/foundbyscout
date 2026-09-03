"use client";

import { useState } from "react";
import ParksGridView from "@/components/ParksGridView";
import { useExploreState, useUrlParam } from "@/components/parksGridState";

// Test harness for the Grid view. Not a design surface — it exists so the grid
// can be built, scaled and looked at without touching /parks or anything the
// List and Map views render.
//
//   ?multiply=20   duplicate the real rows 20x, for scroll and layout-shift
//                  testing against an archive far larger than today's
//   ?gap=0         gutter in px; 0 is edge to edge. The handover leaves this
//                  deliberately unresolved, to be settled by eye rather than
//                  in code review — this is the knob for settling it
//   ?density=small opens straight into a density (also persisted from /parks)

function toNumber(raw: string | null, fallback: number, min: number): number {
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) && n >= min ? Math.round(n) : fallback;
}

export default function GridPreviewHarness() {
  const { density, setDensity } = useExploreState();
  const [search, setSearch] = useState("");

  // The URL is the initial value; the selects take over once touched. Written
  // this way so neither has to be synced into the other by an effect.
  const urlGap = useUrlParam("gap");
  const urlMultiply = useUrlParam("multiply");
  const [ratioPick, setRatioPick] = useState<string>("");
  const [gapPick, setGapPick] = useState<number | null>(null);
  const [multiplyPick, setMultiplyPick] = useState<number | null>(null);
  // -1 is "leave it to --park-image-gap", the shipped default.
  const gap = gapPick ?? (urlGap === null ? -1 : toNumber(urlGap, -1, 0));
  const multiply = multiplyPick ?? toNumber(urlMultiply, 1, 1);

  return (
    <div style={{ padding: "0 0 120px" }}>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center",
        padding: "12px 16px", borderBottom: "1px solid var(--border)",
        fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)",
      }}>
        <input
          type="text" placeholder="SEARCH" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            height: 28, minWidth: 160, padding: "0 10px",
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 14, color: "var(--accent)",
            fontFamily: "var(--font-mono)", fontSize: 11,
            textTransform: "uppercase", letterSpacing: "0.03em",
          }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          GUTTER
          <select value={gap} onChange={e => setGapPick(Number(e.target.value))}
            style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: 11, padding: "4px 6px" }}>
            <option value={-1}>token (--park-image-gap)</option>
            {[0, 1, 2, 4, 8, 16].map(g => <option key={g} value={g}>{g}px{g === 0 ? " (edge to edge)" : ""}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          TILE RATIO
          <select value={ratioPick} onChange={e => setRatioPick(e.target.value)}
            style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: 11, padding: "4px 6px" }}>
            <option value="">shipped (--pgv-ratio)</option>
            <option value="2 / 1">2:1 — wide, crops 20%</option>
            <option value="16 / 10">16:10 — shipped, matches master + cards</option>
            <option value="3 / 2">3:2</option>
            <option value="4 / 3">4:3 — previous</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          SYNTHETIC SCALE
          <select value={multiply} onChange={e => setMultiplyPick(Number(e.target.value))}
            style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)", fontFamily: "var(--font-mono)", fontSize: 11, padding: "4px 6px" }}>
            {[1, 4, 10, 20, 60].map(m => <option key={m} value={m}>{m}x</option>)}
          </select>
        </label>
      </div>

      <ParksGridView
        search={search}
        density={density}
        onDensityChange={setDensity}
        gap={gap === -1 ? undefined : gap}
        ratio={ratioPick || undefined}
        multiply={multiply}
      />
    </div>
  );
}
