"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Hides a sensitive value (e.g. salary) until the user chooses to show it. */
export function SecretValue({ value, label }: { value: string | null; label: string }) {
  const [shown, setShown] = useState(false);
  if (!value) return <span className="text-muted-foreground">–</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={shown ? "" : "tracking-widest"} aria-live="polite">
        {shown ? value : "••••••"}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-6"
        aria-label={shown ? `Hide ${label}` : `Show ${label}`}
        aria-pressed={shown}
        onClick={() => setShown((current) => !current)}
      >
        {shown ? <EyeOff /> : <Eye />}
      </Button>
    </span>
  );
}
