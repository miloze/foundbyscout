import ParksDirectoryAccordion from "@/components/ParksDirectoryAccordion";

// Local-only design preview — ported from the Parks Directory handoff notes.
// Not linked from Nav; not meant to replace the live /parks page yet.
export const metadata = {
  title: "Parks Directory — Preview",
  robots: { index: false, follow: false },
};

export default function DirectoryPreviewPage() {
  return (
    <div style={{ margin: "0 clamp(-16px, -4vw, -56px)", minHeight: "100vh" }}>
      {/* Scoped to this preview only — global layout loads Rubik at weight 300 only */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,400;0,500;0,700;0,900;1,700;1,900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{
        background: "var(--accent, #ff5841)", color: "#fff",
        fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.02em",
        padding: "8px 16px",
      }}>
        PREVIEW — local design exploration, not linked from nav, not live
      </div>
      <ParksDirectoryAccordion />
    </div>
  );
}