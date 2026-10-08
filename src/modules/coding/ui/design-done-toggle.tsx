"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

import { setDesignDoneAction } from "../actions";

/** Marks a ScaleLab problem as practised (private, for your own tracking). */
export function DesignDoneToggle({
  problemId,
  title,
  initialDone,
}: {
  problemId: string;
  title: string;
  initialDone: boolean;
}) {
  const [done, setDone] = React.useState(initialDone);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="grid gap-1">
      <Button
        type="button"
        size="sm"
        variant={done ? "secondary" : "outline"}
        aria-pressed={done}
        aria-label={done ? `Mark ${title} as not done` : `Mark ${title} as done`}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await setDesignDoneAction(problemId, !done);
            if (result.ok) setDone(result.data.done);
            else setError(result.error);
          })
        }
      >
        <Check className={done ? "" : "opacity-40"} /> {done ? "Done" : "Mark done"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
