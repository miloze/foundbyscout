import Link from "next/link";
import LogoutButton from "./LogoutButton";

const NAV = [
  { href: "/admin",            label: "Dashboard" },
  { href: "/admin/parks",      label: "Parks" },
  { href: "/admin/field-notes",label: "Field Notes" },
  { href: "/admin/curated-by", label: "Curated By" },
  { href: "/admin/music",      label: "Music" },
  { href: "/admin/uploads",    label: "Uploads" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--background)" }}>
      {/* Sidebar */}
      <aside style={{ width: 220, flexShrink: 0, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", padding: "28px 0" }}>
        <div style={{ padding: "0 24px 28px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 6 }}>
            Found By Scout
          </p>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
            Admin
          </p>
        </div>

        <nav style={{ flex: 1, padding: "16px 0" }}>
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{ display: "block", padding: "9px 24px", fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", textDecoration: "none" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
          <Link href="/" style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", textDecoration: "none", marginBottom: 10 }}>
            ← View site
          </Link>
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "40px 48px", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
