"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PublishToggle({ slug, published }: { slug: string; published: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(published);

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/admin/parks/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !live }),
    });
    if (res.ok) {
      setLive(v => !v);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      style={{
        fontFamily: "var(--font-mono)", fontSize: 8, padding: "3px 8px",
        border: `1px solid ${live ? "var(--accent)" : "var(--border)"}`,
        color: live ? "var(--accent)" : "var(--muted)",
        textTransform: "uppercase", letterSpacing: "0.1em",
        background: "none", cursor: busy ? "default" : "pointer",
        opacity: busy ? 0.5 : 1, transition: "all 0.15s",
      }}
    >
      {live ? "Live" : "Draft"}
    </button>
  );
}
