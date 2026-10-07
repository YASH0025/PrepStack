import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page";
import { getContentService } from "@/modules/content/service";

export const metadata: Metadata = {
  title: "Interview topics for developers",
  description:
    "Concise guides and level-calibrated interview questions for frontend, backend and full-stack developers.",
  alternates: { canonical: "/topics" },
};

export default async function PublicTopicsPage() {
  const content = getContentService();
  const [tracks, topics] = await Promise.all([
    content.activeTracks(),
    content.topics({ publishedOnly: true }),
  ]);
  return (
    <>
      <PageHeader
        title="Interview topics"
        description="What to know, how deep to go for your experience, and the questions interviewers ask."
      />
      <div className="grid gap-10">
        {tracks.map((track) => {
          const trackTopics = topics.filter((topic) => topic.trackId === track.id);
          if (trackTopics.length === 0) return null;
          const categories = [...new Set(trackTopics.map((topic) => topic.category))];
          return (
            <section key={track.id} className="grid gap-4" aria-labelledby={`track-${track.id}`}>
              <h2 id={`track-${track.id}`} className="text-lg font-semibold">
                {track.name}
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <div key={category} className="grid content-start gap-2">
                    <h3 className="text-sm font-medium text-muted-foreground">{category}</h3>
                    <ul className="grid gap-1 text-sm">
                      {trackTopics
                        .filter((topic) => topic.category === category)
                        .map((topic) => (
                          <li key={topic.id}>
                            <Link href={`/topics/${topic.slug}`} className="hover:underline">
                              {topic.name}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
