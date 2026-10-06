"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import { isTypingTarget } from "@/components/app-shell/keyboard-shortcuts";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

import { setTopicStatusAction } from "../actions";
import { TOPIC_STATUS_LABELS, type TopicStatus } from "../schemas";

const STATUSES = Object.keys(TOPIC_STATUS_LABELS) as TopicStatus[];

/** Status selector and "Mark done" button (keyboard shortcut: d). */
export function TopicStatusControl({ topicId, status }: { topicId: string; status: TopicStatus }) {
  const [current, setCurrent] = useState<TopicStatus>(status);
  const [pending, startTransition] = useTransition();

  const save = (next: TopicStatus) => {
    const previous = current;
    setCurrent(next);
    startTransition(async () => {
      const result = await setTopicStatusAction(topicId, next);
      if (!result.ok) setCurrent(previous);
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "d" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      if (current !== "COMPLETED") save("COMPLETED");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="topic-status" className="sr-only">
        Topic status
      </label>
      <NativeSelect
        id="topic-status"
        value={current}
        onChange={(event) => save(event.target.value as TopicStatus)}
        className="h-8 w-44"
        disabled={pending}
      >
        {STATUSES.map((value) => (
          <option key={value} value={value}>
            {TOPIC_STATUS_LABELS[value]}
          </option>
        ))}
      </NativeSelect>
      <Button
        size="sm"
        variant={current === "COMPLETED" ? "secondary" : "default"}
        disabled={pending || current === "COMPLETED"}
        onClick={() => save("COMPLETED")}
        title="Keyboard shortcut: d"
      >
        {pending ? <Loader2 className="animate-spin" /> : <Check />}
        {current === "COMPLETED" ? "Done" : "Mark done"}
      </Button>
    </div>
  );
}
