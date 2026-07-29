import ParksDirectoryAccordion from "@/components/ParksDirectoryAccordion";
import FooterWordmark from "@/components/FooterWordmark";

export const metadata = {
  title: "Parks — Found By Scout",
  description: "Every skatepark in the UK, catalogued.",
  robots: { index: true, follow: true },
};

export default function ParksPage() {
  return (
    <div style={{ margin: "0 clamp(-16px, -4vw, -56px)", minHeight: "100vh" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <ParksDirectoryAccordion />

      {/* Cropped to a band rather than the mark's full 341px height: this page
          is sized to the viewport, so the full block would push the map out of
          view and the reveal would have little scroll to run on. Raised from
          100px so more of the mark reads. window={1} keeps the reveal to that
          band, so the page's short scroll still drives it. */}
      <FooterWordmark maxHeight={170} window={1} />
    </div>
  );
}
