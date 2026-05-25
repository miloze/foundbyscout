"use client";

type Level = "quiet" | "getting busy" | "peak" | "dark";

const CONFIG: Record<Level, { label: string; dot: string }> = {
  "quiet":       { label: "Quiet",        dot: "#4caf6e" },
  "getting busy":{ label: "Getting busy", dot: "#f0a830" },
  "peak":        { label: "Peak",         dot: "var(--accent)" },
  "dark":        { label: "Dark",         dot: "#555555" },
};

// Peak hours by day: [start hour (24h), end hour]
// 0=Sun, 1=Mon, ..., 6=Sat
const PEAK: Record<number, [number, number][]> = {
  0: [[13, 18]],          // Sunday: 1pm–6pm
  1: [[16, 19]],          // Monday: 4pm–7pm
  2: [[16, 19]],
  3: [[16, 19]],
  4: [[16, 19]],
  5: [[14, 19], [10, 13]], // Friday: lunch + after work
  6: [[11, 18]],           // Saturday: 11am–6pm
};

const GETTING_BUSY: Record<number, [number, number][]> = {
  0: [[11, 13], [18, 20]],
  1: [[15, 16], [19, 20]],
  2: [[15, 16], [19, 20]],
  3: [[15, 16], [19, 20]],
  4: [[15, 16], [19, 20]],
  5: [[13, 14], [9, 10]],
  6: [[10, 11], [18, 20]],
};

function inRanges(hour: number, ranges: [number, number][]): boolean {
  return ranges.some(([s, e]) => hour >= s && hour < e);
}

function isDark(hour: number, month: number): boolean {
  // Rough UK sunset/sunrise by season
  const sunriseHour = month >= 4 && month <= 9 ? 6 : 8;
  const sunsetHour  = month >= 4 && month <= 9 ? 21 : 17;
  return hour < sunriseHour || hour >= sunsetHour;
}

function getLevel(lit: boolean): Level {
  const now   = new Date();
  const day   = now.getDay();
  const hour  = now.getHours();
  const month = now.getMonth(); // 0-indexed

  if (!lit && isDark(hour, month)) return "dark";
  if (inRanges(hour, PEAK[day] ?? []))         return "peak";
  if (inRanges(hour, GETTING_BUSY[day] ?? []))  return "getting busy";
  return "quiet";
}

export default function ParkBusy({ lit = false }: { lit?: boolean }) {
  const level = getLevel(lit);
  const c = CONFIG[level];

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px",
      background: "rgba(0,0,0,0.35)",
      backdropFilter: "blur(8px)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 20,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 10,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: "#fff",
      }}>
        {c.label}
      </span>
    </div>
  );
}
