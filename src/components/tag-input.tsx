"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Free-text tag input: type and press Enter or comma to add, Backspace on an
 * empty field removes the last tag. Designed for React Hook Form's Controller.
 */
export function TagInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  max = 30,
  invalid,
  describedBy,
  ariaLabel,
}: {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  onBlur?: () => void;
  placeholder?: string;
  max?: number;
  invalid?: boolean;
  describedBy?: string;
  /** Accessible name when there is no visible <label for={id}>. */
  ariaLabel?: string;
}) {
  const [draft, setDraft] = React.useState("");

  const add = (raw: string) => {
    const tag = raw.trim().slice(0, 60);
    if (!tag || value.length >= max) return;
    if (value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
  };

  return (
    <div
      className={cn(
        "flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30",
        invalid && "border-destructive",
      )}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            className="rounded-sm p-0.5 hover:bg-foreground/10"
            onClick={() => onChange(value.filter((existing) => existing !== tag))}
            aria-label={`Remove ${tag}`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Input
        id={id}
        value={draft}
        placeholder={value.length === 0 ? placeholder : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        className="h-6 min-w-32 flex-1 border-0 p-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft.trim()) {
            add(draft);
            setDraft("");
          }
          onBlur?.();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            add(draft);
            setDraft("");
          } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
      />
    </div>
  );
}
