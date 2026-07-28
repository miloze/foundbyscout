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
          is sized to the viewport and only scrolls by ~138px, so the full block
          would push the map out of view and the reveal would have almost no
          scroll to run on. 100px matches the existing map-to-footer gap, and
          window={1} shortens the reveal to that band so the scroll there
          actually drives it. */}
      <FooterWordmark maxHeight={100} window={1} />
    </div>
  );
}
