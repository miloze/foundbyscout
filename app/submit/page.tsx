export const metadata = { title: "Submit a Park — Found By Scout" };

const OBSTACLE_OPTIONS = [
  "Bowl", "Bank", "Ledge", "Rail", "Manual pad", "Flat bar",
  "Kicker", "Quarter pipe", "Vert", "Pump track", "Spine", "Stairs", "Gap",
];

export default function SubmitPage() {
  return (
    <div className="px-6 py-12 md:px-12 max-w-2xl">
      <h1
        className="font-black uppercase mb-3"
        style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 0.95, letterSpacing: "-0.03em" }}
      >
        Submit a Park
      </h1>
      <p className="mb-10 text-sm" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
        Know a park that&apos;s not on the map? Fill this in and we&apos;ll review and add it within 48 hours.
      </p>

      <form className="flex flex-col gap-6">
        {/* Name */}
        <div>
          <label className="block text-xs uppercase mb-2" style={{ color: "var(--muted)", letterSpacing: "0.15em" }}>
            Park Name *
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 text-sm outline-none"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
        </div>

        {/* Postcode */}
        <div>
          <label className="block text-xs uppercase mb-2" style={{ color: "var(--muted)", letterSpacing: "0.15em" }}>
            Postcode *
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 text-sm outline-none"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
        </div>

        {/* Obstacles */}
        <div>
          <label className="block text-xs uppercase mb-3" style={{ color: "var(--muted)", letterSpacing: "0.15em" }}>
            Obstacles
          </label>
          <div className="flex flex-wrap gap-2">
            {OBSTACLE_OPTIONS.map((obs) => (
              <label key={obs} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <span
                  className="text-xs px-3 py-1.5 font-medium peer-checked:bg-[#e8ff00] peer-checked:text-black transition-colors cursor-pointer"
                  style={{ border: "1px solid var(--border)", color: "var(--muted)", letterSpacing: "0.05em" }}
                >
                  {obs}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Checkboxes */}
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Free entry", "is_free"],
            ["Covered", "is_covered"],
            ["Lit at night", "is_lit"],
            ["Parking nearby", "has_parking"],
            ["Toilets", "has_toilets"],
            ["Café nearby", "has_cafe"],
            ["BMX friendly", "bmx_friendly"],
            ["Scooter friendly", "scooter_friendly"],
          ].map(([label, name]) => (
            <label key={name} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name={name} className="w-4 h-4 accent-[#e8ff00]" />
              <span className="text-sm" style={{ color: "var(--foreground)" }}>{label}</span>
            </label>
          ))}
        </div>

        {/* Inclusive sessions */}
        <div>
          <label className="block text-xs uppercase mb-2" style={{ color: "var(--muted)", letterSpacing: "0.15em" }}>
            Special Sessions
          </label>
          <textarea
            placeholder="e.g. Women & non-binary nights every Tuesday, inline only Wednesdays..."
            rows={3}
            className="w-full px-4 py-3 text-sm outline-none resize-none"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
        </div>

        {/* Contact */}
        <div>
          <label className="block text-xs uppercase mb-2" style={{ color: "var(--muted)", letterSpacing: "0.15em" }}>
            Your email or Instagram (optional)
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 text-sm outline-none"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          />
        </div>

        <button
          type="submit"
          className="px-8 py-4 text-sm font-bold uppercase tracking-widest self-start"
          style={{ background: "var(--accent)", color: "#ffffff", letterSpacing: "0.15em" }}
        >
          Submit
        </button>
      </form>
    </div>
  );
}
