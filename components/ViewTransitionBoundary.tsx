"use client";

import * as React from "react";

/**
 * Thin wrapper over React's <ViewTransition>, which Next 16.2's vendored React
 * (19.3.0-canary) exports but the installed react/@types/react 19.2 does not.
 * The namespace lookup rather than a named import is what keeps TypeScript and
 * the stable react package quiet, and it gives us a runtime fallback: if the
 * export ever disappears, or the flag in next.config.ts is turned off, this
 * renders the child untouched and navigation is simply instant. Nothing on the
 * page depends on the transition running.
 *
 * Requires `experimental: { viewTransition: true }` in next.config.ts — the
 * component exists without it, but the App Router won't wrap navigations in
 * document.startViewTransition, so no transition fires.
 */
type ViewTransitionProps = {
  name?: string;
  children: React.ReactNode;
};

const ReactViewTransition = (
  React as unknown as { ViewTransition?: React.ComponentType<ViewTransitionProps> }
).ViewTransition;

/** True when the browser and this React build can actually run a transition. */
export const viewTransitionsSupported =
  typeof document !== "undefined" &&
  typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === "function" &&
  ReactViewTransition != null;

export default function ViewTransitionBoundary({ name, children }: ViewTransitionProps) {
  if (!ReactViewTransition) return <>{children}</>;
  return <ReactViewTransition name={name}>{children}</ReactViewTransition>;
}
