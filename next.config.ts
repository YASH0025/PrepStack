import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle in .next/standalone, so the app can run in Docker later.
  output: "standalone",
  // Runtime data (including PRIVATE user files) and secrets must never be
  // traced into the deployable bundle; DATA_DIR is a mounted volume at runtime.
  // (Route traces only; scripts/clean-standalone.mjs also strips the
  // instrumentation trace's copy after every build.)
  outputFileTracingExcludes: {
    "**": ["./data/**", "./.e2e-data/**", "./test-results/**", "./.env*"],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Private passport share links: never indexed, never cached, no referrer.
        source: "/passport/:token*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
  reactStrictMode: true,
};

export default nextConfig;
