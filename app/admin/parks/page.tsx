import { createServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import PublishToggle from "./PublishToggle";

type SortField = "order" | "name" | "date";
type SortDir = "asc" | "desc";

const SORT_COLUMN: Record<SortField, string> = {
  order: "sort_order",
  name: "name",
  date: "created_at",
};

const DEFAULT_DIR: Record<SortField, SortDir> = {
  order: "asc",
  name: "asc",
  date: "desc",
};

function SortLink({ field, label, currentSort, currentDir }: {
  field: SortField; label: string; currentSort: SortField; currentDir: SortDir;
}) {
  const isActive = currentSort === field;
  const nextDir: SortDir = isActive ? (currentDir === "asc" ? "desc" : "asc") : DEFAULT_DIR[field];
  return (
    <Link
      href={`/admin/parks?sort=${field}&dir=${nextDir}`}
      style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "6px 12px", fontFamily: "var(--font-mono)", fontSize: 9,
        textTransform: "uppercase", letterSpacing: "0.1em", textDecoration: "none",
        background: isActive ? "var(--foreground)" : "var(--card)",
        color: isActive ? "var(--background)" : "var(--muted)",
        border: "1px solid var(--border)",
      }}
    >
      {label}
      {isActive && <span>{currentDir === "asc" ? "↑" : "↓"}</span>}
    </Link>
  );
}

export default async function AdminParksPage({ searchParams }: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort, dir } = await searchParams;
  const currentSort: SortField = sort === "name" || sort === "date" ? sort : "order";
  const currentDir: SortDir = dir === "asc" || dir === "desc" ? dir : DEFAULT_DIR[currentSort];

  const db = createServerClient();
  const [{ data: parks }, { count: totalCount }] = await Promise.all([
    db
      .from("parks")
      .select("slug, name, postcode, borough, type, is_free, published, created_at, catalogue_id")
      .order(SORT_COLUMN[currentSort], { ascending: currentDir === "asc" }),
    // Unfiltered total — always the full table, independent of sort/filter state.
    db.from("parks").select("id", { count: "exact", head: true }),
  ]);

  // Derived, not persisted: the index is just this view's row position, so it
  // can never drift from catalogue_id — recomputed fresh on every sort/filter
  // change instead of living in a second, reconcilable source of truth.
  const displayedParks = (parks ?? []).map((park, i) => ({ ...park, index: i + 1 }));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--muted)", marginBottom: 8 }}>Admin</p>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", fontWeight: 300, textTransform: "uppercase", letterSpacing: "-0.02em" }}>Parks</h1>
        </div>
        <Link href="/admin/parks/new" style={{ padding: "10px 24px", background: "var(--accent)", color: "#fff", fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", textDecoration: "none" }}>
          + Add park
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <SortLink field="order" label="Homepage order" currentSort={currentSort} currentDir={currentDir} />
          <SortLink field="name" label="Name" currentSort={currentSort} currentDir={currentDir} />
          <SortLink field="date" label="Date added" currentSort={currentSort} currentDir={currentDir} />
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }}>
          {displayedParks.length} of {totalCount ?? displayedParks.length} parks
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {displayedParks.map(park => (
          <div key={park.slug} style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", width: 24, flexShrink: 0, textAlign: "right" }}>
              {park.index}
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{park.name}</p>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {park.catalogue_id ? `${park.catalogue_id} · ` : ""}{park.postcode} · {park.borough} · {park.type}
              </p>
            </div>
            <PublishToggle slug={park.slug} published={park.published} />
            <Link href={`/admin/parks/${park.slug}`} style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--foreground)", textDecoration: "none" }}>
              Edit →
            </Link>
            <Link href={`/parks/${park.slug}`} target="_blank" style={{ fontFamily: "var(--font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", textDecoration: "none" }}>
              View
            </Link>
          </div>
        ))}

        {displayedParks.length === 0 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em" }}>No parks yet — add your first one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
