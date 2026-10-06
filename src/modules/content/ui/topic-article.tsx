import { AlertTriangle, ExternalLink, Lightbulb } from "lucide-react";

import { RichText } from "@/components/rich-text";
import { Section } from "@/components/page";
import { Badge } from "@/components/ui/badge";

import { type Resource, type Topic } from "../schemas";

/** Explanation, key concepts, common mistakes and resources for a topic. */
export function TopicArticle({ topic, resources }: { topic: Topic; resources: Resource[] }) {
  return (
    <div className="grid gap-8">
      {topic.explanation && (
        <Section title="Explanation">
          <RichText source={topic.explanation} />
        </Section>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {topic.keyConcepts.length > 0 && (
          <Section title="Key concepts">
            <ul className="grid gap-2 text-sm">
              {topic.keyConcepts.map((concept) => (
                <li key={concept} className="flex gap-2">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{concept}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {topic.commonMistakes.length > 0 && (
          <Section title="Common mistakes">
            <ul className="grid gap-2 text-sm">
              {topic.commonMistakes.map((mistake) => (
                <li key={mistake} className="flex gap-2">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden
                  />
                  <span>{mistake}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
      {resources.length > 0 && (
        <Section title="Resources">
          <ul className="grid gap-2">
            {resources.map((resource) => (
              <li key={resource.id}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 text-sm hover:underline"
                >
                  <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                  {resource.title}
                  <Badge variant="muted">{resource.kind.toLowerCase()}</Badge>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
