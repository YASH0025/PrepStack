import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

// Reports and topics change at runtime, so this is generated per request.
export const dynamic = "force-dynamic";

/**
 * Only public pages are crawlable; everything signed-in is disallowed.
 * Passport share links are not listed here on purpose: they send an
 * X-Robots-Tag noindex header (next.config.ts), which crawlers can only see
 * if they are allowed to fetch the page.
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.APP_URL.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/topics", "/reports"],
      disallow: [
        "/today",
        "/roadmap",
        "/practice",
        "/interviews",
        "/intel",
        "/profile",
        "/notifications",
        "/admin",
        "/onboarding",
        "/api",
        "/login",
        "/signup",
        "/reset-password",
        "/forgot-password",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
