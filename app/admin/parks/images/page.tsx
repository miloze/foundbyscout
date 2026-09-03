import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import {
  auditParks, DIRECTORY_ASSET_SPEC,
  type ParkImageRow, type SlotAudit, type SlotStatus,
} from "@/lib/parkImages";

// Image checklist — a definitive done/not-done list for park photography,
// rather than spotting gaps by scrolling the Grid and noticing blank tiles.
// Behind /admin, so it is free to show real filesystem paths.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<SlotStatus, string> = {
  ok: "On file",
  placeholder: "Placeholder",
  missing: "Missing",
  empty: "Not set",
  remote: "Remote",
};

// Only the two states that need action are allowed to shout. Work already done
// should read quietly, or a mostly-finished archive looks like a wall of alarm.
const STATUS_STYLE: Record<SlotStatus, React.CSSProperties> = {
  ok:          { background: "transparent", color: "var(--muted)",  border: "1px solid var(--border)" },
  placeholder: { background: "transparent", color: "var(--accent)", border: "1px solid var(--accent)" },
  missing:     { background: "var(--accent)", color: "#fff",        border: "1px solid var(--accent)" },
  empty:       { background: "transparent", color: "var(--muted)",  border: "1px dashed var(--border)" },
  remote:      { background: "transparent", color: "var(--muted)",  border: "1px solid var(--border)" },
};

function StatusChip({ slot }: { slot: SlotAudit }) {
  return (
    <span
      title={slot.reason ?? slot.value ?? undefined}
      style={{
        display: "inline-flex", alignItems: "center",
        fontFamily: "var(--font-mono)", fontSize: 9, lineHeight: 1,
        textTransform: "uppercase", letterSpacing: "0.1em",
        padding: "5px 8px", whiteSpace: "nowrap",
        ...STATUS_STYLE[slot.status],
      }}
    >
      {STATUS_LABEL[slot.status]}
    </span>
  );
}

export default async function AdminParkImagesPage() {
  const db = createServerClient();
  const { data } = await db
    .from("parks")
    .select("slug, name, published, directory_image_url, hero_image, thumbnail, sort_order")
    .order("sort_order", { ascending: true });

  const audits = auditParks((data ?? []) as ParkImageRow[]);
  const slotKeys = audits[0]?.slots.map(s => ({ key: s.key, label: s.label })) ?? [];

  // Counted per slot so the summary says which job is outstanding, not just how
  // many boxes are unticked overall.
  const tally = slotKeys.map(({ key, label }) => {
    const slots = audits.map(a => a.slots.find(s => s.key === key)!);
    return {
      label,
      done: slots.filter(s => s.status === "ok" || s.status === "remote").length,
      total: slots.length,
      needsWork: slots.filter(s => s.status !== "ok" && s.status !== "remote"),
    };
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 8 }}>Admin</p>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em" }}>Park images</h1>
        </div>
        <Link href="/admin/parks" style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--foreground)", textDecoration: "none" }}>
          ← Parks
        </Link>
      </div>

      {/* Summary. "Placeholder" covers two different failures — a blank file,
          and a real photograph of a different park reused as stand-in art —
          so each row's reason is on the chip's tooltip and spelled out below. */}
      <div style={{ display: "flex", gap: 2, marginBottom: 8, flexWrap: "wrap" }}>
        {tally.map(t => (
          <div key={t.label} style={{ flex: "1 1 160px", background: "var(--card)", border: "1px solid var(--border)", padding: "14px 16px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)", marginBottom: 6 }}>{t.label}</p>
            <p style={{ fontSize: 20, fontWeight: 300 }}>
              <span style={{ color: t.done === t.total ? "var(--foreground)" : "var(--accent)" }}>{t.done}</span>
              <span style={{ color: "var(--muted)", fontSize: 14 }}> / {t.total}</span>
            </p>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 24 }}>
        Directory export — {DIRECTORY_ASSET_SPEC.ratio} crop, {DIRECTORY_ASSET_SPEC.width}×{DIRECTORY_ASSET_SPEC.height}. One asset serves the directory panel, map cards and every Grid density.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 20px 6px" }}>
          <span style={{ flex: 1 }} />
          {slotKeys.map(s => (
            <span key={s.key} style={{ width: 96, flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>
              {s.label}
            </span>
          ))}
        </div>

        {audits.map(park => (
          <div key={park.slug} style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                {park.name}
                {!park.published && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.1em", marginLeft: 8 }}>DRAFT</span>
                )}
              </p>
              {/* The paths that need a file, so an export session can work
                  straight off this list. */}
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.06em", wordBreak: "break-all" }}>
                {park.slots.filter(s => s.status !== "ok" && s.status !== "remote").length === 0
                  ? "Complete"
                  : park.slots
                      .filter(s => s.status !== "ok" && s.status !== "remote")
                      .map(s => `${s.expectedPath}${s.reason ? ` (${s.reason})` : ""}`)
                      .join("  ·  ")}
              </p>
            </div>
            {park.slots.map(slot => (
              <span key={slot.key} style={{ width: 96, flexShrink: 0 }}>
                <StatusChip slot={slot} />
              </span>
            ))}
            <Link href={`/admin/parks/${park.slug}`} style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--foreground)", textDecoration: "none", flexShrink: 0 }}>
              Edit →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
