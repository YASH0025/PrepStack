"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { deleteCardAction, resetCardDueAction } from "../actions";

/** Row actions for a review card: make it due today, or delete it. */
export function CardActions({ cardId, due }: { cardId: string; due: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      {!due && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Review today"
          title="Review today"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await resetCardDueAction(cardId);
              router.refresh();
            })
          }
        >
          <RotateCcw />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Delete card"
        title="Delete card"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Delete this card and its review history?")) return;
          startTransition(async () => {
            await deleteCardAction(cardId);
            router.refresh();
          });
        }}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
