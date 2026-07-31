"use client";

import { Component, type ReactNode } from "react";

/**
 * Catches render-time throws from the 3D viewers and shows a fallback instead.
 *
 * This exists because of a real outage: R2's CORS allow-list was missing the
 * www origin, so every GLB fetch failed in the browser. `useGLTF` throws on a
 * failed fetch, and with nothing catching it React unwound the whole tree —
 * a blocked model took the entire park page down rather than leaving one
 * empty frame on an otherwise working page. The failure was invisible from
 * the server, which returns a perfectly good 200 either way.
 *
 * A viewer is decoration on a page that is mostly writing and photographs.
 * It should never be able to take the page with it.
 *
 * Class component because getDerivedStateFromError has no hook equivalent.
 */
type Props = {
  children: ReactNode;
  /** Rendered in place of the viewer once it has thrown. */
  fallback: ReactNode;
  /** Changing this clears the error and remounts — e.g. a new model URL. */
  resetKey?: string;
};

type State = { failed: boolean; resetKey?: string };

export default class ViewerErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) {
      return { failed: false, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error) {
    // Left as a console error on purpose — there is no error reporting wired
    // up, and swallowing this silently is how a broken viewer goes unnoticed.
    console.error("[viewer] failed to render, showing fallback:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
