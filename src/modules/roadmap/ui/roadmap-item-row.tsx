import Link from "next/link";
import { BookOpen, ClipboardCheck, HelpCircle, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/misc";
import { DEPTHS, DEPTH_LABELS } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { type Topic } from "@/modules/content/schemas";

import { type RoadmapItem } from "../schemas";
import { RoadmapItemCheck } from "./item-check";

const KIND = {
  LEARN: { label: "Learn", icon: BookOpen, variant: "info" as const },
  REVISION: { label: "Revise", icon: RotateCcw, variant: "warning" as const },
  SELF_CHECK: { label: "Self-check", icon: ClipboardCheck, variant: "success" as const },
};

function depthName(level: number) {
  const depth = DEPTHS[level - 1];
  return depth ? DEPTH_LABELS[depth].label : null;
}

export function roadmapItemTitle(item: RoadmapItem, topics: Map<string, Topic>): string {
  if (item.kind === "SELF_CHECK") return `Weekly self-check (${item.coversTopicIds.length} topics)`;
  const name = (item.topicId && topics.get(item.topicId)?.name) || "Topic";
  return item.parts > 1 ? `${name} (part ${item.part} of ${item.parts})` : name;
}

/** One roadmap item: done checkbox, topic, kind, hours, depth target and the "why". */
export function RoadmapItemRow({
  item,
  topics,
  compact = false,
}: {
  item: RoadmapItem;
  topics: Map<string, Topic>;
  compact?: boolean;
}) {
  const kind = KIND[item.kind];
  const Icon = kind.icon;
  const topic = item.topicId ? topics.get(item.topicId) : undefined;
  const title = roadmapItemTitle(item, topics);
  const done = item.status === "DONE";
  const target = depthName(item.requiredDepth);

  return (
    <div className={cn("flex items-start gap-3 py-2", done && "opacity-60")}>
      <div className="pt-0.5">
        <RoadmapItemCheck itemId={item.id} done={done} label={title} />
      </div>
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {topic ? (
            <Link
              href={`/practice/topics/${topic.slug}`}
              className={cn("text-sm font-medium hover:underline", done && "line-through")}
            >
              {title}
            </Link>
          ) : (
            <span className={cn("text-sm font-medium", done && "line-through")}>{title}</span>
          )}
          <Badge variant={kind.variant}>
            <Icon aria-hidden /> {kind.label}
          </Badge>
        </div>
        {!compact && (
          <p className="text-xs text-muted-foreground">
            {item.hours}h{target && item.kind === "LEARN" ? ` · target depth: ${target}` : ""}
            {item.kind === "SELF_CHECK" && item.coversTopicIds.length > 0
              ? ` · ${item.coversTopicIds
                  .map((id) => topics.get(id)?.name)
                  .filter(Boolean)
                  .join(", ")}`
              : ""}
          </p>
        )}
      </div>
      {item.reasons.length > 0 && (
        <Popover>
          <PopoverTrigger
            className="rounded-sm p-1 text-muted-foreground hover:text-foreground"
            aria-label={`Why is "${title}" in my plan?`}
          >
            <HelpCircle className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 text-sm">
            <p className="mb-2 font-medium">Why this is in your plan</p>
            <ul className="grid list-disc gap-1 pl-4 text-muted-foreground">
              {item.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            {item.kind === "LEARN" && (
              <p className="mt-2 text-xs text-muted-foreground">
                Priority score {item.priorityScore}
              </p>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
