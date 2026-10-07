import Link from "next/link";
import { CircleCheckBig, CircleDashed, Mic } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { STORY_STATUS_LABELS, type Story, type StoryStatus } from "../schemas";

const STATUS_STYLE: Record<
  StoryStatus,
  { icon: typeof Mic; variant: "muted" | "info" | "success" }
> = {
  DRAFT: { icon: CircleDashed, variant: "muted" },
  READY: { icon: CircleCheckBig, variant: "info" },
  PRACTICED: { icon: Mic, variant: "success" },
};

export function StoryStatusBadge({ status }: { status: StoryStatus }) {
  const { icon: Icon, variant } = STATUS_STYLE[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden /> {STORY_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Compact story entry used in lists, question matches and interview prep. */
export function StoryLink({
  story,
  competencyNames,
}: {
  story: Pick<Story, "id" | "title" | "status" | "competencies" | "usage" | "impact">;
  competencyNames: Map<string, string>;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/practice/stories/${story.id}`} className="font-medium hover:underline">
          {story.title}
        </Link>
        <StoryStatusBadge status={story.status} />
        {story.usage.length > 0 && (
          <span className="text-xs text-muted-foreground">
            used in {story.usage.length} round{story.usage.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {story.impact && <p className="text-xs text-muted-foreground">{story.impact}</p>}
      {story.competencies.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {story.competencies.map((slug) => (
            <Badge key={slug} variant="outline">
              {competencyNames.get(slug) ?? slug}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
