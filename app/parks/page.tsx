import ParksDirectoryAccordion from "@/components/ParksDirectoryAccordion";

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
      <link href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,400;0,500;0,700;0,900;1,700;1,900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <ParksDirectoryAccordion />
    </div>
  );
}
