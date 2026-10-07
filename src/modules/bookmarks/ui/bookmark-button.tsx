"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Bookmark } from "lucide-react";

import { Button } from "@/components/ui/button";

import { toggleBookmarkAction } from "../actions";

/** Private "save for later" toggle. Only the user can see their bookmarks. */
export function BookmarkButton({
  reportId,
  bookmarked,
}: {
  reportId: string;
  bookmarked: boolean;
}) {
  const [saved, setSaved] = useState(bookmarked);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={optimistic}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          const result = await toggleBookmarkAction(reportId);
          if (result.ok) setSaved(result.data.bookmarked);
        })
      }
    >
      <Bookmark className={optimistic ? "fill-current" : undefined} />
      {optimistic ? "Saved" : "Save"}
    </Button>
  );
}
