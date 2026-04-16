"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "dry" | "drying" | "wet" | "unknown";

const CONFIG: Record<Status, { label: string; dot: string }> = {
  loading: { label: "Checking…", dot: "var(--muted)"    },
  dry:     { label: "Dry",       dot: "#4caf6e"          },
  drying:  { label: "Damp",      dot: "#f0a830"          },
  wet:     { label: "Wet",       dot: "var(--accent)"    },
  unknown: { label: "Unknown",   dot: "var(--muted)"    },
};

function timestamp() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function ParkWeather({ lat, lng }: { lat: number; lng: number }) {
  const [status, setStatus]   = useState<Status>("loading");
  const [checkedAt, setCheckedAt] = useState("");

  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=precipitation&hourly=precipitation` +
      `&timezone=Europe%2FLondon&past_hours=3&forecast_hours=1`
    )
      .then(r => r.json())
      .then(data => {
        const now: number    = data.current?.precipitation ?? 0;
        const past: number[] = data.hourly?.precipitation ?? [];
        const recentRain = past.slice(0, 3).some((p: number) => p > 0.1);

        if (now > 0.1)       setStatus("wet");
        else if (recentRain) setStatus("drying");
        else                 setStatus("dry");
        setCheckedAt(timestamp());
      })
      .catch(() => { setStatus("unknown"); setCheckedAt(timestamp()); });
  }, [lat, lng]);

  const c = CONFIG[status];

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      {/* Pill */}
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
          color: "var(--foreground)",
        }}>
          {c.label}
        </span>
      </div>
      {/* Timestamp */}
      {checkedAt && (
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 9,
          letterSpacing: "0.08em", color: "var(--muted)",
          paddingLeft: 10,
        }}>
          {checkedAt}
        </span>
      )}
    </div>
  );
}
