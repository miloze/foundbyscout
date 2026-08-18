import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ["192.168.1.95"],
  experimental: {
    // Wraps App Router navigations in document.startViewTransition so React's
    // <ViewTransition> boundaries can animate across routes. Required for the
    // hero → park page content continuity; see lib/view-transitions.ts.
    // Still experimental in Next 16.2 — without it the <ViewTransition>
    // components render as plain pass-throughs and navigation is instant.
    viewTransition: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
