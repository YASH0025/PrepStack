"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { CheckCircle2, Eye, Keyboard } from "lucide-react";

import { isTypingTarget } from "@/components/app-shell/keyboard-shortcuts";
import { RichText } from "@/components/rich-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";

import { finishReviewSessionAction, reviewCardAction } from "../actions";
import { intervalFor } from "../domain/scheduler";
import {
  CARD_SOURCE_LABELS,
  type CardSource,
  RATINGS,
  RATING_LABELS,
  type Rating,
} from "../schemas";

export interface SessionCard {
  id: string;
  prompt: string;
  answer: string;
  sourceType: CardSource;
  box: number;
}

const RATING_HINT: Record<Rating, (box: number) => string> = {
  AGAIN: () => "tomorrow",
  HARD: (box) => `in ${intervalFor(box)}d`,
  GOOD: (box) => `in ${intervalFor(Math.min(5, box + 1))}d`,
  EASY: (box) => `in ${intervalFor(Math.min(5, box + 2))}d`,
};

const RATING_VARIANT: Record<Rating, "destructive" | "outline" | "default" | "secondary"> = {
  AGAIN: "destructive",
  HARD: "outline",
  GOOD: "default",
  EASY: "secondary",
};

/**
 * Review session: prompt → reveal → rate. Keyboard: Space/Enter reveals,
 * 1–4 rate Again/Hard/Good/Easy.
 */
export function ReviewSession({ cards }: { cards: SessionCard[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tally, setTally] = useState<Record<Rating, number>>({
    AGAIN: 0,
    HARD: 0,
    GOOD: 0,
    EASY: 0,
  });
  const [pending, startTransition] = useTransition();
  const card = cards[index];
  const done = index >= cards.length;

  const rate = useCallback(
    (rating: Rating) => {
      if (!card || !revealed || pending) return;
      startTransition(async () => {
        setError(null);
        const result = await reviewCardAction(card.id, rating);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setTally((current) => ({ ...current, [rating]: current[rating] + 1 }));
        setRevealed(false);
        setIndex((value) => value + 1);
        if (index + 1 >= cards.length) await finishReviewSessionAction();
      });
    },
    [card, revealed, pending, index, cards.length],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      const rating = RATINGS[Number(event.key) - 1];
      if (revealed && rating) {
        event.preventDefault();
        rate(rating);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, rate]);

  if (done) {
    const reviewed = Object.values(tally).reduce((sum, value) => sum + value, 0);
    return (
      <div
        className="mx-auto grid max-w-xl justify-items-center gap-4 rounded-xl border p-8 text-center"
        role="status"
      >
        <CheckCircle2 className="size-10 text-emerald-600" aria-hidden />
        <div className="grid gap-1">
          <p className="text-lg font-semibold">Session complete</p>
          <p className="text-sm text-muted-foreground">
            {reviewed} card{reviewed === 1 ? "" : "s"} reviewed · {tally.AGAIN} again · {tally.HARD}{" "}
            hard · {tally.GOOD} good · {tally.EASY} easy
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/today">Back to Today</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/practice/review">Review overview</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Card {index + 1} of {cards.length}
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            <Keyboard className="size-3.5" aria-hidden /> Space to reveal · 1–4 to rate
          </span>
        </div>
        <Progress value={(index / cards.length) * 100} aria-label="Session progress" />
      </div>

      <article className="grid gap-4 rounded-xl border p-5 sm:p-6" aria-live="polite">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{CARD_SOURCE_LABELS[card.sourceType]}</Badge>
          <Badge variant="muted">Box {card.box}</Badge>
        </div>
        <RichText source={card.prompt} className="text-base font-medium" />
        {revealed ? (
          <div className="rounded-lg bg-muted/40 p-4">
            <RichText source={card.answer || "_No answer recorded._"} />
          </div>
        ) : (
          <Button onClick={() => setRevealed(true)} className="w-fit" size="lg">
            <Eye /> Reveal answer
          </Button>
        )}
      </article>

      {revealed && (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">How well did you recall it?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RATINGS.map((rating, ratingIndex) => (
              <Button
                key={rating}
                variant={RATING_VARIANT[rating]}
                disabled={pending}
                onClick={() => rate(rating)}
                className="h-auto flex-col gap-0 py-2"
              >
                <span>
                  <kbd className="mr-1 font-mono text-xs opacity-70">{ratingIndex + 1}</kbd>
                  {RATING_LABELS[rating]}
                </span>
                <span className="text-xs font-normal opacity-80">
                  {RATING_HINT[rating](card.box)}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
