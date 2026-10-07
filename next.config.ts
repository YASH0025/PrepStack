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
  reactStrictMode: true,
};

export default nextConfig;
