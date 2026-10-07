"use client";

import { useState, useTransition } from "react";
import { Brain, Check } from "lucide-react";

import { Button } from "@/components/ui/button";

import { addStoryToReviewAction } from "../actions";

export function AddStoryToReview({ storyId, inReview }: { storyId: string; inReview: boolean }) {
  const [added, setAdded] = useState(inReview);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-1">
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={pending || added}
        onClick={() =>
          startTransition(async () => {
            const result = await addStoryToReviewAction(storyId);
            if (result.ok) setAdded(true);
            else setError(result.error);
          })
        }
      >
        {added ? <Check /> : <Brain />}
        {added ? "In your review queue" : "Add to review"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
