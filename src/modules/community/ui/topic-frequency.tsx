import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { type TopicFrequency, rangeLabel, topTopics } from "../domain/frequency";

/**
 * Aggregated topic frequency with its sample size and date range. Below the
 * threshold it says "Not enough data yet" instead of showing numbers.
 */
export function TopicFrequencyPanel({
  title,
  frequency,
  minSample,
  topics,
}: {
  title: string;
  frequency: TopicFrequency;
  minSample: number;
  topics: Map<string, { name: string; slug: string }>;
}) {
  const enough = frequency.sampleSize >= minSample;
  const rows = topTopics(frequency, 20)
    .filter((row) => topics.has(row.topicId))
    .slice(0, 8);
  return (
    <section className="grid gap-3 rounded-lg border p-4" aria-labelledby="topic-frequency-title">
      <div className="flex items-start gap-2">
        <BarChart3 className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
        <div className="grid gap-0.5">
          <h2 id="topic-frequency-title" className="text-sm font-semibold">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {enough
              ? `Based on ${frequency.sampleSize} reports from ${rangeLabel(frequency.from, frequency.to)}.`
              : `Not enough data yet — ${frequency.sampleSize} of the ${minSample} reports needed.`}
          </p>
        </div>
      </div>
      {enough && rows.length > 0 && (
        <ul className="grid gap-2">
          {rows.map((row) => {
            const topic = topics.get(row.topicId);
            const share = Math.round((row.count / frequency.sampleSize) * 100);
            return (
              <li key={row.topicId} className="grid gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <Link href={`/practice/topics/${topic?.slug}`} className="hover:underline">
                    {topic?.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {row.count} of {frequency.sampleSize} ({share}%)
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted" aria-hidden>
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {enough && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">These reports have no tagged topics yet.</p>
      )}
    </section>
  );
}
