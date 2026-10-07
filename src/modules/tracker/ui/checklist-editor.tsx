"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/misc";

import { updateChecklistAction } from "../actions";
import { type ChecklistItem } from "../schemas";

/** Prep checklist for a round: check off, add and remove items. Saved immediately. */
export function ChecklistEditor({ roundId, items }: { roundId: string; items: ChecklistItem[] }) {
  const [list, setList] = useState(items);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();
  const doneCount = list.filter((item) => item.done).length;

  const persist = (next: ChecklistItem[]) => {
    setList(next);
    startTransition(async () => {
      const result = await updateChecklistAction(roundId, next);
      if (!result.ok) setList(list);
    });
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <Progress
          value={list.length ? (doneCount / list.length) * 100 : 0}
          aria-label="Checklist progress"
        />
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {doneCount}/{list.length}
        </span>
      </div>
      <ul className="grid gap-1.5">
        {list.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 text-sm">
            <Checkbox
              id={`check-${item.id}`}
              checked={item.done}
              onCheckedChange={(checked) =>
                persist(
                  list.map((entry) =>
                    entry.id === item.id ? { ...entry, done: checked === true } : entry,
                  ),
                )
              }
            />
            <label
              htmlFor={`check-${item.id}`}
              className={item.done ? "flex-1 text-muted-foreground line-through" : "flex-1"}
            >
              {item.label}
            </label>
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label={`Remove "${item.label}"`}
              onClick={() => persist(list.filter((entry) => entry.id !== item.id))}
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const label = draft.trim();
          if (!label) return;
          persist([...list, { id: crypto.randomUUID(), label: label.slice(0, 200), done: false }]);
          setDraft("");
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a checklist item"
          aria-label="New checklist item"
          className="h-8"
        />
        <Button type="submit" size="sm" variant="outline" disabled={!draft.trim()}>
          <Plus /> Add
        </Button>
      </form>
    </div>
  );
}
