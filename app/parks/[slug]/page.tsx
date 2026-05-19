import Link from "next/link";
import { notFound } from "next/navigation";
import ParkHeroViewer from "@/components/ParkHeroViewer";
import ParkWeather from "@/components/ParkWeather";
import ParkBusy from "@/components/ParkBusy";
import EditorialGallery from "@/components/EditorialGallery";
import GalleryModelSlotClient from "@/components/GalleryModelSlotClient";
import { createServerClient } from "@/lib/supabase-server";

// ── Types ──────────────────────────────────────────────────────────────────
type Transport  = { type: "tube"|"rail"|"bus"|"tram"; name: string; detail: string };
type GlanceItem = { icon: string; value: string; label: string; available: boolean };
type Facility   = { icon: string; name: string; status: string; available: boolean };
type HoursRow   = { days: string; time: string };
type Social     = { platform: "instagram"|"facebook"|"youtube"|"tiktok"|"website"; url: string; label?: string };


// ── Helpers ────────────────────────────────────────────────────────────────
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size }}>{name}</span>;
}

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


function SocialIcon({ platform }: { platform: Social["platform"] }) {
  const paths: Record<string, string> = {
    instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
    facebook:  "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    youtube:   "M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z",
    tiktok:    "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
    website:   "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  };
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ display: "block" }}>
      <path d={paths[platform]} />
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export const dynamic = "force-dynamic";

export default async function ParkPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ debug?: string }> }) {
  const { slug } = await params;
  const { debug } = await searchParams;
  const isDebug = debug === "1";

  const db = createServerClient();
  const { data: park } = await db
    .from("parks")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!park) notFound();

  // Dev fallback: use local static images when the DB has no gallery yet.
  // Slot order matches EditorialGallery: full, wide-left, narrow-right, sq-left(model), sq-right, full, full
  const bloblandsDevImages = slug === "bloblands" ? [
    { src: "/images/parks/bloblands/hero-01.webp",    alt: "Bloblands skatepark overview" },
    { src: "/images/parks/bloblands/gallery-01.webp", alt: "Bloblands graffiti wall" },
    { src: "/images/parks/bloblands/gallery-02.webp", alt: "Skater at Bloblands" },
    { src: "",                                         alt: "" }, // slot 3 — replaced by 3D model
    { src: "/images/parks/bloblands/gallery-04.webp", alt: "Bloblands concrete obstacle" },
    { src: "/images/parks/bloblands/gallery-03.webp", alt: "Bloblands panoramic" },
  ] : null;

  const galleryImages = park.gallery_images?.length
    ? (park.gallery_images as string[]).map((src) => ({ src, alt: "" }))
    : bloblandsDevImages ?? [];

  // Model file: use DB value or fall back to the known local path for bloblands
  const modelFile = slug === "bloblands" ? "/images/parks/bloblands/volcano.glb" : (park.model_file || null);

  const bleed = "calc(-1 * clamp(16px, 4vw, 56px))";

  return (
    <article>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div style={{
        position: "relative",
        height: "78vh",
        minHeight: 340, overflow: "hidden",
        background: "var(--background)",
        marginLeft: bleed, marginRight: bleed,
      }}>
        {park.model_file ? (
          <ParkHeroViewer
            modelFile={park.model_file}
            heroImage={park.hero_image}
            useContourModel={park.use_contour_model}
            cameraPos={park.camera_pos?.length ? park.camera_pos : undefined}
            cameraTarget={park.camera_target?.length ? park.camera_target : undefined}
            modelRotation={park.model_rotation?.length ? park.model_rotation : undefined}
            pingPong={park.ping_pong ?? undefined}
            autoRotate={park.auto_rotate ?? false}
            debug={isDebug}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.025) 59px, rgba(255,255,255,0.025) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.025) 59px, rgba(255,255,255,0.025) 60px)" }} />
        )}

        {/* Always-on gradient so the title reads over any hero content */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 60%)", pointerEvents: "none", zIndex: 1 }} />

        {/* Postcode badge */}
        <div style={{ position: "absolute", top: "clamp(20px, 4vw, 36px)", left: "clamp(16px, 4vw, 56px)", width: 80, height: 80, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, pointerEvents: "none" }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 300, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>{(park.postcode ?? "").split(" ")[0]}</span>
        </div>

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "clamp(20px, 4vw, 36px)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, pointerEvents: "none", zIndex: 3 }}>
          <div>
            <Link href="/parks" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", display: "inline-block", marginBottom: 12, pointerEvents: "auto" }}>← All Parks</Link>
            <h1 style={{ fontSize: "clamp(40px, 8vw, 84px)", lineHeight: 0.92, color: "var(--foreground)", letterSpacing: "-0.02em", fontWeight: 300 }}>{park.name}</h1>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.08em", marginTop: 10 }}>{park.address.join(", ")} · {park.postcode}</p>
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <ParkWeather lat={park.lat} lng={park.lng} />
              <ParkBusy lit={park.is_covered} />
            </div>
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN: ABOUT + SIDEBAR ──────────────────────────────── */}
      <div data-park-cols style={{ display: "grid", gridTemplateColumns: "1fr 300px" }}>

        {/* Left */}
        <div style={{ paddingRight: 48, borderRight: "1px solid var(--border)" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", paddingTop: 32, marginBottom: 16 }}>At a glance</p>
          <div data-glance-grid style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, marginBottom: 40 }}>
            {park.glance.map((item: GlanceItem) => (
              <div key={item.label} style={{ background: "var(--card)", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10, opacity: item.available ? 1 : 0.38 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: item.available ? "var(--accent)" : "var(--muted)" }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)", lineHeight: 1.2 }}>{item.value}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginTop: 4 }}>{item.label}</div>
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>About</p>
          <div style={{ fontSize: 15, lineHeight: 1.75, color: "var(--foreground)", marginBottom: 32, paddingBottom: 32, borderBottom: "1px solid var(--border)" }}>
            {park.description.map((p: string, i: number) => <p key={i} style={{ marginTop: i > 0 ? 14 : 0 }}>{p}</p>)}
          </div>

          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", lineHeight: 1.8, paddingBottom: 40 }}>
            Opened {park.opened}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ paddingLeft: 36, paddingTop: 32 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>Getting there</p>
          <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--foreground)", marginBottom: 16 }}>
              {park.address.map((l: string, i: number) => <span key={i}>{l}<br /></span>)}
              <span style={{ color: "var(--muted)" }}>{park.postcode}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {park.transport.map((t: Transport, i: number) => (
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

          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Opening times</p>
          <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid var(--border)" }}>
            {park.hours.map((row: HoursRow, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < park.hours.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted)" }}>{row.days}</span>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{row.time}</span>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Built by</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--foreground)", lineHeight: 1.8, letterSpacing: "0.04em" }}>
            {park.builder}<br />
            <span style={{ color: "var(--muted)" }}>{park.managed_by}</span>
          </p>
          {park.socials && park.socials.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              {park.socials.map((s: Social, i: number) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label || s.platform}
                  className="fbs-social-link"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 10px",
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  <SocialIcon platform={s.platform} />
                  {s.label || s.platform}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── PHOTO GALLERY ────────────────────────────────────────────── */}
      {galleryImages.length > 0 && (
        <section style={{ paddingBottom: 64, borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16, paddingTop: 64 }}>Photos</p>
          <EditorialGallery
            images={galleryImages}
            slotOverrides={modelFile ? {
              3: <GalleryModelSlotClient modelFile={modelFile} debug={isDebug} />,
            } : undefined}
          />
        </section>
      )}

      {/* ── SCOUT NOTES ──────────────────────────────────────────────── */}
      <section style={{ paddingTop: 64, paddingBottom: 64, borderBottom: "1px solid var(--border)" }}>
        <div data-scout-notes style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(3rem, 6vw, 6rem)" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 20 }}>Scout Notes</p>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 300, letterSpacing: "-0.03em", textTransform: "uppercase", lineHeight: 0.95, marginBottom: "1.5rem", color: "var(--foreground)" }}>
              What to expect
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--muted)", marginBottom: 16 }}>
              Field notes and first-hand observations from the Scout team coming soon. Expect honest coverage of sessions, conditions, locals, and the wider scene.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--muted)" }}>
              Know this park well? Get in touch — we want real accounts from the people who skate it.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, background: "var(--border)" }}>
            {[
              { label: "Best for",    value: "Intermediate – Advanced" },
              { label: "Busy times",  value: "Weekends, after school" },
              { label: "Vibe",        value: "Community – relaxed" },
              { label: "Nearest shop",value: "Coming soon" },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "var(--background)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLIPS PLACEHOLDER ────────────────────────────────────────── */}
      <section style={{ paddingTop: 64, paddingBottom: 64 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)" }}>Clips</p>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--border)" }}>Coming soon</span>
        </div>
        <div data-clips-grid style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, background: "var(--border)" }}>
          {[null, null, null].map((_, i) => (
            <div key={i} style={{ background: "var(--card)", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .fbs-social-link:hover { color: var(--foreground) !important; border-color: var(--foreground) !important; }
        @media (max-width: 760px) {
          [data-park-cols] { grid-template-columns: 1fr !important; }
          [data-park-cols] > div:first-child { padding-right: 0 !important; border-right: none !important; border-bottom: 1px solid var(--border); padding-bottom: 32px; }
          [data-park-cols] > div:last-child { padding-left: 0 !important; }
          [data-glance-grid] { grid-template-columns: repeat(2, 1fr) !important; }
          [data-scout-notes] { grid-template-columns: 1fr !important; }
          [data-photo-strip] { grid-template-columns: 1fr 1fr !important; }
          [data-clips-grid]  { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

    </article>
  );
}
