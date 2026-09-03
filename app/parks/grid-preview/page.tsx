import GridPreviewHarness from "./GridPreviewHarness";

// Isolated build surface for the Parks Grid view, following the same pattern as
// /parks/directory-preview. Not linked from Nav, not indexed. The Grid is built
// and validated here first so nothing on /parks — the header, the list, the map
// — has to move to accommodate it.
export const metadata = {
  title: "Parks Grid — Preview",
  robots: { index: false, follow: false },
};

export default function GridPreviewPage() {
  return (
    <div className="full-bleed" style={{ minHeight: "100vh" }}>
      {/* Scoped to this preview only — global layout loads Rubik at weight 300
          only, and the catalogue block needs 500/700. Same as the directory
          preview page. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{
        background: "var(--accent)", color: "#fff",
        fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.02em",
        padding: "8px 16px",
      }}>
        PREVIEW — Parks Grid, built in isolation. Not linked from nav, not live.
      </div>
      <GridPreviewHarness />
    </div>
  );
}
