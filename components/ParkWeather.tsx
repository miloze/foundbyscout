"use client";

import { useEffect, useState } from "react";

// ── Surface conditions ─────────────────────────────────────────────────────
// An *estimate*, inferred from recent rainfall at the park's coordinates, and
// the labels say so. Nobody is standing at Bloblands looking at the concrete;
// Open-Meteo is reporting precipitation and this is reading a likely surface
// state off it. "Damp" was stated as though observed, which is a claim the
// data cannot support.
//
// Three things this gets wrong before this pass, all of them the same mistake
// in different clothes — treating absence as information:
//
//  1. `precipitation ?? 0` made a missing reading indistinguishable from a
//     reading of zero, so a failed or malformed response displayed "Dry". A
//     park is never called dry because we could not find out.
//  2. The timestamp was `new Date()` at the moment the fetch resolved — the
//     time the page was opened, not the time the weather was measured. It read
//     as freshness and was not.
//  3. Nothing expired. An hours-old reading kept its confident label.

type Reading =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "ok"; state: "dry" | "damp" | "wet"; observedAt: Date };

const DOT: Record<"dry" | "damp" | "wet", string> = {
  dry:  "#4caf6e",
  damp: "#f0a830",
  wet:  "var(--accent)",
};

const STATE_WORD: Record<"dry" | "damp" | "wet", string> = {
  dry: "dry", damp: "damp", wet: "wet",
};

// Open-Meteo's "current" block is hourly. Past this, the reading no longer
// describes now — an estimate from four hours ago is not wrong so much as no
// longer about the present, and showing it with a live-looking dot invites a
// reader to trust it. Three hours also matches the window the damp/dry call
// itself looks back over, so the two agree about what "recent" means.
const STALE_AFTER_MS = 3 * 60 * 60 * 1000;

// How far ahead of the browser's clock a reading may sit before it is treated
// as not a reading at all. See the check that uses it.
const FUTURE_TOLERANCE_MS = 10 * 60 * 1000;

const LONDON = "Europe/London";

/** The park's local calendar day, so "is this from today?" is asked in the
 *  park's timezone rather than the reader's. */
function londonDay(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    timeZone: LONDON, year: "numeric", month: "2-digit", day: "2-digit",
  });
}

/** "15:50", or "08 Sep, 15:50" when the reading is not from today. A time on
 *  its own silently implies today, which is exactly the ambiguity this pass is
 *  removing — so the date appears the moment that stops being true. */
function formatObserved(at: Date, now: Date): string {
  const time = at.toLocaleTimeString("en-GB", {
    timeZone: LONDON, hour: "2-digit", minute: "2-digit",
  });
  if (londonDay(at) === londonDay(now)) return time;
  const date = at.toLocaleDateString("en-GB", {
    timeZone: LONDON, day: "2-digit", month: "short",
  });
  return `${date}, ${time}`;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export default function ParkWeather({ lat, lng }: { lat: number; lng: number }) {
  // Whether this park can be asked about at all is knowable at render time, so
  // it is derived rather than pushed into state from inside the effect — which
  // is the cascading-render pattern React lints against.
  const coordsValid = isNum(lat) && isNum(lng);
  const [fetched, setFetched] = useState<Reading>({ kind: "loading" });
  const reading: Reading = coordsValid ? fetched : { kind: "unavailable" };

  useEffect(() => {
    if (!coordsValid) return;
    let cancelled = false;

    // timeformat=unixtime so `current.time` is an instant rather than a naive
    // "2026-09-08T15:00" that JS would read in the *browser's* timezone. The
    // park is in the UK and the reader may not be; an epoch second means the
    // same moment either way, and the formatting above puts it back into
    // London time for display.
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=precipitation&hourly=precipitation` +
      `&timezone=Europe%2FLondon&timeformat=unixtime&past_hours=3&forecast_hours=1`
    )
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(data => {
        if (cancelled) return;

        // Every field is checked rather than defaulted. A response that is
        // missing the reading, or carries something that is not a number, is
        // an absence of data — not a dry park.
        const nowMm = data?.current?.precipitation;
        const at    = data?.current?.time;
        const hourly = data?.hourly?.precipitation;
        if (!isNum(nowMm) || !isNum(at)) { setFetched({ kind: "unavailable" }); return; }

        const observedAt = new Date(at * 1000);
        if (Number.isNaN(observedAt.getTime())) { setFetched({ kind: "unavailable" }); return; }
        // Never label a reading that has not happened yet. The request asks for
        // a forecast hour as well as past ones, and a timestamp landing ahead
        // of now — whether from the forecast side, a double-applied timezone
        // offset, or a clock out of step — would be presented as "Updated" and
        // read as fresher than anything. The tolerance is for ordinary clock
        // skew between the browser and the API, not for forecasts: an hour
        // ahead fails it, a minute ahead does not.
        if (observedAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
          setFetched({ kind: "unavailable" });
          return;
        }
        // Stale readings are reported as unavailable, not as a stale label:
        // the "Updated" line beneath still says when it was from, so the
        // reason is on screen rather than implied.
        if (Date.now() - observedAt.getTime() > STALE_AFTER_MS) {
          setFetched({ kind: "unavailable" });
          return;
        }

        // Only the past hours count as "recent rain" — the request also asks
        // for one forecast hour, and rain that has not fallen yet cannot have
        // wetted anything.
        const past: number[] = Array.isArray(hourly) ? hourly.slice(0, 3).filter(isNum) : [];
        const recentRain = past.some(p => p > 0.1);

        const state = nowMm > 0.1 ? "wet" : recentRain ? "damp" : "dry";
        setFetched({ kind: "ok", state, observedAt });
      })
      .catch(() => { if (!cancelled) setFetched({ kind: "unavailable" }); });

    return () => { cancelled = true; };
  }, [lat, lng, coordsValid]);

  if (reading.kind === "loading") {
    return <WeatherBlock dot="var(--muted)" label="Checking conditions…" />;
  }

  if (reading.kind === "unavailable") {
    return (
      <WeatherBlock
        dot="var(--muted)"
        label="Conditions unavailable"
        // No "Updated" line: there is nothing to date. An unavailable reading
        // with a timestamp beside it reads as though something were known.
        title="Conditions are estimated from rainfall data. No recent reading is available for this park."
      />
    );
  }

  const { state, observedAt } = reading;
  return (
    <WeatherBlock
      dot={DOT[state]}
      label={`Estimated ${STATE_WORD[state]}`}
      meta={`Updated ${formatObserved(observedAt, new Date())}`}
      // "measured" was wrong and worth correcting: nothing measured the
      // surface. Rainfall was measured; the surface is inferred from it. The
      // wording now says which of the two the timestamp belongs to.
      //
      // Kept out of the visible text to hold the two-line block the hero's
      // information group is sized for — if it should be on screen, it is one
      // line to add here.
      title={`Estimated from rainfall data at ${formatObserved(observedAt, new Date())}.`}
    />
  );
}

function WeatherBlock({
  dot, label, meta, title,
}: {
  dot: string; label: string; meta?: string; title?: string;
}) {
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }} title={title}>
      {/* 2px padding + 1px border on an 11px/16.5px line box = 22.5px, the
          same height as the field tags beside it and as the home hero's
          chips. Only the height is shared — the 20px radius stays, because
          the rounded pill is what marks this as live state rather than
          catalogue metadata. */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "2px 10px",
        // Overridable per context rather than fixed: the hero fills this to
        // match the metadata chips beside it (none of them see-through), while
        // the directory accordion keeps the lighter original.
        background: "var(--fbs-weather-bg, rgba(0,0,0,0.35))",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 20,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "#fff", whiteSpace: "nowrap",
        }}>
          {label}
        </span>
      </div>
      {meta && (
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 9,
          letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)",
          paddingLeft: 10, whiteSpace: "nowrap",
        }}>
          {meta}
        </span>
      )}
    </div>
  );
}
