"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface PickerTopic {
  id: string;
  name: string;
  category: string;
}

/** Multi-select of topics grouped by category (at most `max`). */
export function TopicPicker({
  id,
  topics,
  value,
  onChange,
  max = 6,
  invalid,
  describedBy,
}: {
  id: string;
  topics: PickerTopic[];
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  const categories = [...new Set(topics.map((topic) => topic.category))];
  const toggle = (topicId: string, checked: boolean) => {
    if (checked && value.length >= max) return;
    onChange(checked ? [...value, topicId] : value.filter((item) => item !== topicId));
  };
  return (
    <div
      id={id}
      role="group"
      aria-describedby={describedBy}
      className={cn(
        "grid max-h-64 gap-3 overflow-y-auto rounded-md border p-3",
        invalid && "border-destructive",
      )}
    >
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {value.length} of {max} selected
      </p>
      {categories.map((category) => (
        <fieldset key={category} className="grid gap-1.5">
          <legend className="mb-1 text-xs font-medium text-muted-foreground">{category}</legend>
          {topics
            .filter((topic) => topic.category === category)
            .map((topic) => {
              const checkboxId = `${id}-${topic.id}`;
              const checked = value.includes(topic.id);
              return (
                <div key={topic.id} className="flex items-center gap-2">
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    disabled={!checked && value.length >= max}
                    onCheckedChange={(next) => toggle(topic.id, next === true)}
                  />
                  <Label htmlFor={checkboxId} className="font-normal">
                    {topic.name}
                  </Label>
                </div>
              );
            })}
        </fieldset>
      ))}
    </div>
  );
}
