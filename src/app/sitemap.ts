import type { MetadataRoute } from "next";

import { env } from "@/lib/env";
import { getCommunityService } from "@/modules/community/service";
import { getContentService } from "@/modules/content/service";

// Reports and topics change at runtime, so this is generated per request.
export const dynamic = "force-dynamic";

/** Public pages only: landing, topic guides and published community reports. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.APP_URL.replace(/\/$/, "");
  const [topics, reports] = await Promise.all([
    getContentService().topics({ publishedOnly: true }),
    getCommunityService().listPublished(),
  ]);
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/topics`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/reports`, changeFrequency: "daily", priority: 0.8 },
    ...topics.map((topic) => ({
      url: `${base}/topics/${topic.slug}`,
      lastModified: topic.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...reports.map((report) => ({
      url: `${base}/reports/${report.id}`,
      lastModified: report.updatedAt,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
