// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW ONLY — /preview/editorial
//
// Shows the proposed Scout editorial layer composed onto the real Bloblands
// page, using the live hero, the live 3D viewer, the live gallery layout and
// the live sidebar data straight from Supabase.
//
// Nothing here is wired into the site: /parks/bloblands is untouched, there is
// no schema change, and no existing file was modified to build this. The
// editorial copy below is the published copy from the Bloblands dossier,
// hard-coded to stand in for the proposed `editorial` jsonb column.
//
// Delete this folder and components/editorial/ to remove the preview entirely.
// ─────────────────────────────────────────────────────────────────────────────

import ParkHeroShell from "@/components/ParkHeroShell";
import EditorialSection from "@/components/editorial/EditorialSection";
import ScoutNotes from "@/components/editorial/ScoutNotes";
import EditorialAccordion from "@/components/editorial/EditorialAccordion";
import FooterWordmark from "@/components/FooterWordmark";
import GalleryWithCallouts, { GalleryRow, GallerySlot, GalleryColumn } from "@/components/EditorialGallery";
import { createServerClient } from "@/lib/supabase-server";
import { modelUrl, resolveModelUrl } from "@/lib/assets";

export const dynamic = "force-dynamic";

type Transport  = { type: "tube" | "rail" | "bus" | "tram"; name: string; detail: string };
type GlanceItem = { icon: string; value: string; label: string; available: boolean };
type HoursRow   = { days: string; time: string };

// ── Stand-in for the proposed `editorial` jsonb column ──────────────────────
// Copy is taken verbatim from SCOUT_Editorial_Example_Bloblands.md → "Published Copy".
const EDITORIAL = {
  introduction: [
    "Bloblands is a skatepark shaped as much by its past as its present. Built within a former paddling pool, it retains the iconic concrete volcano that once occupied the site, giving the park an unmistakable identity. The unusual mix of transitions, preserved features and community character rewards repeat visits, revealing new lines and details long after the first session.",
  ],
  feature: {
    title: "The Volcano",
    body: [
      "Every skatepark has a defining feature. At Bloblands it isn't simply the volcano itself, but how it influences movement through the entire park.",
      "Rather than acting as an obstacle, it quietly redirects lines, encourages creative approaches and gives the park a rhythm unlike more conventional layouts. It remains both a visual landmark and the feature that ties the park's past to its present.",
    ],
  },
  notes: [
    "The obvious line isn't necessarily the best one. The volcano opens alternative routes that become more rewarding with each visit.",
    "The preserved volcano gives the park an identity that couldn't be recreated if it were designed from scratch today.",
    "After rain, lower areas can remain damp for longer than expected.",
    "The mini-ramp reflects the park's DIY spirit, reportedly poured using leftover concrete from the main build.",
    "Despite its modest footprint, the park offers more variety than its size initially suggests.",
  ],
  origins: {
    teaser: "A paddling pool became one of the UK's most distinctive local skateparks.",
    body: [
      "Bloblands occupies the footprint of a former paddling pool, preserving one of its defining elements: the concrete volcano. Rather than removing this feature during redevelopment, it was incorporated into the skatepark, creating an environment where old and new coexist.",
      "The result is a park whose identity comes as much from thoughtful reuse as it does from fresh construction, giving Bloblands a sense of history that remains visible in every session.",
    ],
  },
  local: [
    "Weekday mornings offer the quietest sessions.",
    "The park feels surprisingly busy with only a handful of skaters.",
    "Bring a camera on an overcast day — the retained volcano photographs particularly well.",
    "Exploring alternative lines reveals the park's character far better than repeating the obvious lap.",
  ],
  // Image callouts, keyed by the gallery slot they belong to. In the real
  // implementation these two keys sit on the slot object inside gallery_rows.
  callouts: {
    0: { label: "Landmark", caption: "The preserved volcano remains the heart of the park." },
    2: { label: "Flow",     caption: "The strongest lines reveal themselves gradually." },
    7: { label: "Setting",  caption: "Layers of old and new concrete define the character of Bloblands." },
  } as Record<number, { label: string; caption: string }>,
};

function TransportBadge({ type }: { type: Transport["type"] }) {
  const bg: Record<string, string> = { tube: "#e32017", rail: "var(--foreground)", bus: "#e32017", tram: "#84b817" };
  const fg: Record<string, string> = { tube: "#fff", rail: "var(--background)", bus: "#fff", tram: "#fff" };
  const label: Record<string, string> = { tube: "LU", rail: "RL", bus: "B", tram: "T" };
  return (
    <div style={{ background: bg[type], color: fg[type], width: 26, height: 26, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0 }}>
      {label[type]}
    </div>
  );
}

/** Inject the callouts into the live gallery_rows, leaving every other key alone. */
function withCallouts(rows: GalleryRow[]): GalleryRow[] {
  const decorate = (slot: GallerySlot): GallerySlot => {
    const c = EDITORIAL.callouts[slot.slot];
    return c ? { ...slot, label: c.label, caption: c.caption } : slot;
  };
  return rows.map(row =>
    row.map(item =>
      "slots" in item
        ? ({ slots: (item as GalleryColumn).slots.map(decorate) } as GalleryColumn)
        : decorate(item as GallerySlot)
    )
  );
}

export default async function EditorialPreviewPage({ searchParams }: { searchParams: Promise<{ debug?: string }> }) {
  const { debug } = await searchParams;
  const isDebug = debug === "1";
  const slug = "bloblands";

  const db = createServerClient();
  const { data: park } = await db.from("parks").select("*").eq("slug", slug).single();

  if (!park) {
    return <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: 40 }}>Bloblands not found.</p>;
  }

  const galleryImages = (park.gallery_images ?? []).map((src: string) => ({ src, alt: "" }));
  const galleryRows: GalleryRow[] = withCallouts(park.gallery_rows ?? []);

  const modelFile = resolveModelUrl(park.model_file, slug, "high") ?? modelUrl(slug, "high");
  const modelFileLow = resolveModelUrl(park.model_file_low, slug, "low") ?? undefined;
  const modelFileMobile = resolveModelUrl(park.model_file_mobile, slug, "low") ?? undefined;

  const sidebarLabel = { fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "var(--muted)", marginBottom: 12 };

  return (
    <article>
      {/* ── Preview banner — not part of the proposal ──────────────────── */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "var(--accent)", color: "#fff", padding: "8px 14px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        <strong style={{ fontWeight: 700 }}>Preview</strong>
        <span style={{ opacity: 0.9, letterSpacing: "0.06em", textTransform: "none", fontSize: 10 }}>
          Proposed editorial layer on live Bloblands data. /parks/bloblands is unchanged. Nothing saved to the database.
        </span>
      </div>

      {/* ── HERO — existing component, unchanged ───────────────────────── */}
      <ParkHeroShell
        modelFile={modelFile}
        modelFileLow={modelFileLow}
        modelFileMobile={modelFileMobile}
        heroImage={park.hero_image}
        preloadImageUrl={park.preload_image_url ?? `/images/parks/${slug}/glb-preload.png`}
        cameraPos={park.camera_pos?.length ? park.camera_pos : undefined}
        cameraTarget={park.camera_target?.length ? park.camera_target : undefined}
        modelRotation={park.model_rotation?.length ? park.model_rotation : undefined}
        pingPong={park.ping_pong ?? undefined}
        autoRotate={false}
        debug={isDebug}
        ambientIntensity={park.viewer_settings?.ambientIntensity}
        directionalIntensity={park.viewer_settings?.directionalIntensity}
        environmentPreset={park.viewer_settings?.environmentPreset}
        environmentIntensity={park.viewer_settings?.environmentIntensity}
        catalogueId={park.catalogue_id ?? undefined}
        name={park.name}
        address={park.address}
        location={park.location}
        postcode={park.postcode}
        lat={park.lat}
        lng={park.lng}
        opened={park.opened}
        scanned={park.scanned}
      />

      {/* ── EDITORIAL BAND — editorial left, practical facts right ───────
          The facts sidebar moves up here out of the photo grid. It fills the
          633×531 void that sat beside the editorial, and it puts the practical
          answers (free? covered? open when? how do I get there?) next to the
          copy that makes you want them, rather than 1,300px further down.

          Columns are 680 + 280 with the slack pushed into the gutter, so the
          measure stays readable and the gap reads as intentional white space
          rather than an unfilled column. */}
      <div className="fbs-editorial-band">
        <div>
          <EditorialSection label="Introduction" body={EDITORIAL.introduction} />
          <EditorialSection
            label="Feature story"
            title={EDITORIAL.feature.title}
            body={EDITORIAL.feature.body}
          />
          <ScoutNotes notes={EDITORIAL.notes} />
        </div>

        <div className="park-photos-sidebar">
          <div>
            <p style={sidebarLabel}>At a glance</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {(park.glance ?? []).map((item: GlanceItem) => (
                <div key={item.label} style={{ background: "var(--card)", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 8, opacity: item.available ? 1 : 0.38 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: item.available ? "var(--accent)" : "var(--muted)" }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--foreground)", lineHeight: 1.2 }}>{item.value}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginTop: 3 }}>{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <p style={sidebarLabel}>Getting there</p>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--foreground)", marginBottom: 14 }}>
              {(park.address ?? []).map((l: string, i: number) => <span key={i}>{l}<br /></span>)}
              <span style={{ color: "var(--muted)" }}>{park.postcode}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(park.transport ?? []).map((t: Transport, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <TransportBadge type={t.type} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2, color: "var(--foreground)" }}>{t.name}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", marginTop: 2, letterSpacing: "0.04em" }}>{t.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <p style={sidebarLabel}>Opening times</p>
            {(park.hours ?? []).map((row: HoursRow, i: number, hours: HoursRow[]) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < hours.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>{row.days}</span>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{row.time}</span>
              </div>
            ))}
          </div>

          <div style={{ paddingTop: 24, borderTop: "1px solid var(--border)" }}>
            <p style={sidebarLabel}>Built by</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--foreground)", lineHeight: 1.8, letterSpacing: "0.04em" }}>
              {park.builder}
            </p>
          </div>
        </div>
      </div>

      {/* ── PHOTOS — now full width ──────────────────────────────────────
          With the sidebar moved up, the gallery takes the whole measure:
          993px → 1313px, a third wider. Photography is the primary
          storytelling medium, so it gets the widest column on the page. */}
      <section style={{ paddingTop: 64, paddingBottom: 64, borderBottom: "1px solid var(--border)" }}>
        <p style={{ ...sidebarLabel, marginBottom: 16 }}>Photos</p>
        <GalleryWithCallouts rows={galleryRows} images={galleryImages} modelFile={modelFile} debug={isDebug} />
      </section>

      {/* ── ORIGINS / LOCAL KNOWLEDGE — accordions ─────────────────────── */}
      <div style={{ paddingTop: 40, paddingBottom: 72 }}>
        <EditorialAccordion
          label="Origins"
          teaser={EDITORIAL.origins.teaser}
          body={EDITORIAL.origins.body}
        />
        <EditorialAccordion
          label="Local knowledge"
          teaser="Busy times, drainage and what to bring."
          items={EDITORIAL.local}
        />
      </div>

      {/* ── FOOTER WORDMARK ──────────────────────────────────────────────
          Rises into place as the foot of the page comes into view. Sits here
          in the preview so it stays page-scoped; shipping it site-wide means
          mounting it in app/layout.tsx above the <footer>. */}
      <FooterWordmark />

      <style>{`
        /* Editorial left at a readable measure, facts right at the sidebar's
           established 280px, slack absorbed by the gutter between them.
           Collapses at the same 768px breakpoint as .park-photos-grid so the
           page has one responsive rhythm, not two. */
        .fbs-editorial-band{
          display:grid;
          grid-template-columns:minmax(0, 680px) 280px;
          justify-content:space-between;
          gap:40px;
          align-items:start;
          padding-bottom:8px;
          border-bottom:1px solid var(--border);
        }
        /* Note: the stacked sections set their padding inline, which beats a
           stylesheet rule — spacing at the foot of this column is owned by
           ScoutNotes (64px), not by anything here. */
        /* Sticky is inherited from .park-photos-sidebar, where it earned its
           keep beside a 4,000px gallery. Here the facts sit next to a 1,128px
           editorial column — only 247px of slack — so sticking gains nothing
           and the block visibly detaches and drifts against the copy opposite.
           Both columns now scroll together. */
        .fbs-editorial-band .park-photos-sidebar{
          position:static; top:auto;
          /* Drop the column by EditorialSection's own 40px top padding so the
             AT A GLANCE and INTRODUCTION eyebrows share a baseline. Both are
             10px/17px, so this offset is the whole difference. Keep in step if
             that padding ever changes. */
          padding-top:40px;
        }
        @media (max-width: 768px){
          .fbs-editorial-band{ grid-template-columns:1fr; gap:48px; }
        }
      `}</style>
    </article>
  );
}
