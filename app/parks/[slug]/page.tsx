import Link from "next/link";
import { notFound } from "next/navigation";
import ParkHeroViewer from "@/components/ParkHeroViewer";
import ParkWeather from "@/components/ParkWeather";
import ParkBusy from "@/components/ParkBusy";
import { createServerClient } from "@/lib/supabase-server";

// ── Types ──────────────────────────────────────────────────────────────────
type Transport  = { type: "tube"|"rail"|"bus"|"tram"; name: string; detail: string };
type GlanceItem = { icon: string; value: string; label: string; available: boolean };
type Facility   = { icon: string; name: string; status: string; available: boolean };
type HoursRow   = { days: string; time: string };
type Spot       = { name: string; description: string; position: string; bounty: string; difficulty: "easy"|"medium"|"hard"|"open" };
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

const DIFF_COLOUR: Record<string, string> = { easy: "#2a7a3a", medium: "#b87a00", hard: "var(--accent)", open: "var(--muted)" };

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
export default async function ParkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const db = createServerClient();
  const { data: park } = await db
    .from("parks")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!park) notFound();

  const bleed = "calc(-1 * clamp(16px, 4vw, 56px))";

  return (
    <article>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div style={{
        position: "relative",
        height: park.use_contour_model ? "78vh" : "58vh",
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
          />
        ) : (
          <>
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.025) 59px, rgba(255,255,255,0.025) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.025) 59px, rgba(255,255,255,0.025) 60px)" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 60%)" }} />
          </>
        )}

        {/* Postcode badge */}
        <div style={{ position: "absolute", top: "clamp(20px, 4vw, 36px)", left: "clamp(20px, 4vw, 36px)", width: 80, height: 80, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, pointerEvents: "none" }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", maxWidth: 1100, margin: "0 auto" }}>

        {/* Left */}
        <div style={{ paddingRight: 48, borderRight: "1px solid var(--border)" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", paddingTop: 32, marginBottom: 16 }}>At a glance</p>
          <div data-glance-grid style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, marginBottom: 40 }}>
            {park.glance.map((item) => (
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
            {park.description.map((p, i) => <p key={i} style={{ marginTop: i > 0 ? 14 : 0 }}>{p}</p>)}
          </div>

          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>Surface</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 4, flexShrink: 0, background: "repeating-linear-gradient(45deg, #c0bdb7 0px, #c0bdb7 1px, #b0ada6 1px, #b0ada6 4px)" }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: "0.02em", textTransform: "uppercase" }}>{park.surface}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", marginTop: 4 }}>{park.surface_note}</div>
            </div>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em", lineHeight: 1.8, marginTop: 24, paddingBottom: 40 }}>
            Opened {park.opened}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ paddingLeft: 36, paddingTop: 32 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>Getting there</p>
          <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--foreground)", marginBottom: 16 }}>
              {park.address.map((l, i) => <span key={i}>{l}<br /></span>)}
              <span style={{ color: "var(--muted)" }}>{park.postcode}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {park.transport.map((t, i) => (
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
            {park.hours.map((row, i) => (
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
              {park.socials.map((s, i) => (
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

      {/* ── EDITORIAL GALLERY ─────────────────────────────────────────── */}
      <div style={{ marginLeft: bleed, marginRight: bleed, borderTop: "1px solid var(--border)" }}>
        <div style={{ padding: "32px clamp(16px, 4vw, 56px) 0", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)" }}>Photos</p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>Coming soon</p>
        </div>
        <div data-gallery-grid style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, marginTop: 16, paddingLeft: "clamp(16px, 4vw, 56px)", paddingRight: "clamp(16px, 4vw, 56px)", paddingBottom: 2 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: "4/3", background: "var(--card)", border: "1px solid var(--border)" }} />
          ))}
        </div>
      </div>

      {/* ── SPOTS & BOUNTIES ──────────────────────────────────────────── */}
      {park.spots.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 48, paddingBottom: 48, maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)" }}>Spots & Open Bounties</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>{park.spots.length} spots</p>
          </div>
          <div data-spots-grid style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
            {park.spots.map((spot) => (
              <div key={spot.name} style={{ background: "var(--card)", padding: "24px 22px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.01em" }}>{spot.name}</h3>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>{spot.position}</p>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: DIFF_COLOUR[spot.difficulty], flexShrink: 0, marginLeft: 8, paddingTop: 2 }}>{spot.difficulty}</span>
                </div>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--muted)", marginBottom: 20 }}>{spot.description}</p>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", padding: "3px 7px", borderRadius: 2 }}>Unclaimed</span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.4, color: "var(--foreground)", marginBottom: 14 }}>{spot.bounty}</p>
                  <button style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", background: "none", border: "1px solid var(--border)", padding: "7px 14px", cursor: "pointer" }}>
                    Submit your clip →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── COMMUNITY CLIPS ───────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--border)", marginLeft: bleed, marginRight: bleed }}>
        <div style={{ padding: "48px clamp(16px, 4vw, 56px)", maxWidth: `calc(1100px + clamp(16px, 4vw, 56px) * 2)`, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)" }}>Community Clips</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.06em" }}>0 submissions</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card)", padding: "56px 24px", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center" }}>No clips submitted yet. Be the first.</p>
            <button style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", background: "none", border: "1px solid var(--accent)", padding: "8px 18px", cursor: "pointer", marginTop: 8 }}>
              Submit a clip
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .fbs-social-link:hover { color: var(--foreground) !important; border-color: var(--foreground) !important; }
        @media (max-width: 760px) {
          /* Two-column info section → single column */
          article > div[style*="300px"] { grid-template-columns: 1fr !important; }
          article > div[style*="300px"] > div:first-child { padding-right: 0 !important; border-right: none !important; border-bottom: 1px solid var(--border); padding-bottom: 32px; }
          article > div[style*="300px"] > div:last-child { padding-left: 0 !important; }
          /* At-a-glance → 2 columns */
          [data-glance-grid] { grid-template-columns: repeat(2, 1fr) !important; }
          /* Spots grid → single column */
          [data-spots-grid] { grid-template-columns: 1fr !important; }
          /* Gallery placeholder → 2 columns */
          [data-gallery-grid] { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

    </article>
  );
}
