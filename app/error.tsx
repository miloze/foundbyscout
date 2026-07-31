"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Next.js renders this when a client component
 * below it throws — previously there was nothing here, so an uncaught error
 * left a blank page with no way out and no indication anything had failed.
 *
 * The viewers have their own boundary (see ViewerErrorBoundary) and degrade to
 * a still image without reaching this. This is the backstop for everything
 * else.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route] unhandled error:", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "60vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      maxWidth: 560,
      padding: "80px 0",
    }}>
      <p style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: "var(--accent)",
        margin: "0 0 16px",
      }}>
        Error
      </p>

      <h1 style={{
        fontFamily: "var(--font-display), Arial, sans-serif",
        fontWeight: 300,
        fontSize: "clamp(28px, 4.5vw, 44px)",
        lineHeight: 1.0,
        letterSpacing: "-0.01em",
        textTransform: "uppercase",
        color: "var(--foreground)",
        margin: "0 0 20px",
      }}>
        This page didn&apos;t load
      </h1>

      <p style={{
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.9,
        color: "var(--muted)",
        margin: "0 0 32px",
      }}>
        Something broke on our end, not yours. Try again — and if it keeps
        happening, the park is still listed in the directory.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={reset}
          style={{
            fontFamily: "var(--font-mono)", fontSize: 10,
            letterSpacing: "0.1em", textTransform: "uppercase",
            padding: "11px 18px", cursor: "pointer",
            background: "var(--accent)", border: "1px solid var(--accent)",
            color: "#fff",
          }}
        >
          Try again
        </button>
        <Link
          href="/parks"
          style={{
            fontFamily: "var(--font-mono)", fontSize: 10,
            letterSpacing: "0.1em", textTransform: "uppercase",
            padding: "11px 18px", textDecoration: "none",
            background: "transparent", border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        >
          All parks
        </Link>
      </div>

      {/* The digest is what correlates a user's report with the server logs.
          Useless to them, the only useful thing to us. */}
      {error.digest && (
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 9,
          letterSpacing: "0.06em", color: "var(--muted)",
          margin: "28px 0 0", opacity: 0.7,
        }}>
          Ref: {error.digest}
        </p>
      )}
    </div>
  );
}
