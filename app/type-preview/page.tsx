// Local-only type study for choosing the park-title weight. Not linked from
// nav, noindex, safe to delete once a weight is picked.
//
// IMPORTANT: the MSCHN cuts below resolve from fonts installed on the local
// machine — public/fonts/MSCHN.* doesn't exist, so this page renders correctly
// only for someone who has MSCHN installed. Everyone else sees Rubik for every
// row, which makes the page look broken but isn't. Whichever weight wins, the
// licensed file has to land in public/fonts before visitors can see it.
export const metadata = {
  title: "Type preview — park titles",
  robots: { index: false, follow: false },
};

// Each MSCHN weight is a separate installed family, not a font-weight value —
// the family ships as static cuts, so `font-weight: 300` on "MSCHN" does
// nothing and anything >=600 gets faked by the browser. Naming the family
// directly is the only way to get a real weight.
const CUTS = [
  { label: "Light",    stack: "'MSCHN Light', 'Rubik', sans-serif" },
  { label: "Regular",  stack: "'MSCHN', 'Rubik', sans-serif" },
  { label: "Medium",   stack: "'MSCHN Medium', 'Rubik', sans-serif" },
  { label: "SemiBold", stack: "'MSCHN SemiBold', 'Rubik', sans-serif" },
  { label: "Black",    stack: "'MSCHN Black', 'Rubik', sans-serif" },
];

const PARK = "Bloblands";
const DIR_NAME = "Crystal Palace/";
const DIR_POSTCODE = "SE19/";

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.18em",
  textTransform: "uppercase", color: "var(--muted)", marginBottom: 14,
};

export default function TypePreviewPage() {
  return (
    <div style={{ paddingBottom: 120 }}>
      <header style={{ padding: "32px 0 8px", borderBottom: "1px solid var(--border)", marginBottom: 40 }}>
        <p style={labelStyle}>Type preview — not live</p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 300, textTransform: "uppercase", marginBottom: 16 }}>
          Park title weight
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, maxWidth: "58ch", marginBottom: 28 }}>
          Each row is a real MSCHN cut installed locally, shown at hero scale and at
          directory scale. The last row is Rubik 300 for reference — what visitors
          without MSCHN installed currently see.
        </p>
      </header>

      {CUTS.map(cut => (
        <section key={cut.label} style={{ marginBottom: 64, borderBottom: "1px solid var(--border)", paddingBottom: 48 }}>
          <p style={labelStyle}>MSCHN {cut.label}</p>

          {/* Hero scale — matches ParkHeroMeta: uppercase, lh .9, tracking 0 */}
          <div style={{
            fontFamily: cut.stack,
            fontSize: "clamp(3rem, 9vw, 7rem)",
            lineHeight: 0.9,
            textTransform: "uppercase",
            letterSpacing: "0em",
            marginBottom: 32,
          }}>
            {PARK}
          </div>

          {/* Directory scale — matches the accordion trigger / list row at 18px */}
          <div style={{
            fontFamily: cut.stack,
            fontSize: 18, lineHeight: 1.15,
            textTransform: "uppercase", letterSpacing: "0.005em",
          }}>
            {DIR_NAME}<span style={{ color: "var(--accent)" }}>{DIR_POSTCODE}</span>
          </div>
        </section>
      ))}

      {/* Reference row */}
      <section>
        <p style={labelStyle}>Rubik 300 — current fallback</p>
        <div style={{
          fontFamily: "'Rubik', sans-serif", fontWeight: 300,
          fontSize: "clamp(3rem, 9vw, 7rem)", lineHeight: 0.9,
          textTransform: "uppercase", letterSpacing: "0em", marginBottom: 32,
        }}>
          {PARK}
        </div>
        <div style={{
          fontFamily: "'Rubik', sans-serif", fontWeight: 300,
          fontSize: 18, lineHeight: 1.15,
          textTransform: "uppercase", letterSpacing: "0.005em",
        }}>
          {DIR_NAME}<span style={{ color: "var(--accent)" }}>{DIR_POSTCODE}</span>
        </div>
      </section>
    </div>
  );
}
