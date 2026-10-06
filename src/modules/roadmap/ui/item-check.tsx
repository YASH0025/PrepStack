"use client";

import { useOptimistic, useTransition } from "react";

import { Checkbox } from "@/components/ui/checkbox";

import { setRoadmapItemStatusAction } from "../actions";

/** Done checkbox for a roadmap item, updated optimistically. */
export function RoadmapItemCheck({
  itemId,
  done,
  label,
}: {
  itemId: string;
  done: boolean;
  label: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(done);
  const [, startTransition] = useTransition();
  return (
    <Checkbox
      checked={optimistic}
      aria-label={optimistic ? `Mark "${label}" not done` : `Mark "${label}" done`}
      onCheckedChange={(checked) => {
        const next = checked === true;
        startTransition(async () => {
          setOptimistic(next);
          await setRoadmapItemStatusAction(itemId, next);
        });
      }}
    />
  );
}
