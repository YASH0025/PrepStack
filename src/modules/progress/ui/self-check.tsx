"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { Inline, RichText } from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { checkSelfCheckAction } from "../actions";

export interface SelfCheckQuestion {
  id: string;
  prompt: string;
  options: string[];
}

interface Outcome {
  chosen: number;
  correct: boolean;
  correctIndex: number;
  explanation: string;
  addedToReview: boolean;
}

/** Quick multiple-choice self-check; answers are checked on the server. */
export function SelfCheck({ questions }: { questions: SelfCheckQuestion[] }) {
  return (
    <ol className="grid gap-4">
      {questions.map((question, index) => (
        <SelfCheckItem key={question.id} question={question} number={index + 1} />
      ))}
    </ol>
  );
}

function SelfCheckItem({ question, number }: { question: SelfCheckQuestion; number: number }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = (chosen: number) =>
    startTransition(async () => {
      setError(null);
      const result = await checkSelfCheckAction(question.id, chosen);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOutcome({ chosen, ...result.data });
    });

  return (
    <li className="grid gap-3 rounded-xl border p-4">
      <div className="flex gap-2 text-sm font-medium">
        <span className="text-muted-foreground">{number}.</span>
        <RichText source={question.prompt} />
      </div>
      <div className="grid gap-2" role="group" aria-label={`Options for question ${number}`}>
        {question.options.map((option, index) => {
          const isCorrect = outcome && index === outcome.correctIndex;
          const isWrongChoice = outcome && index === outcome.chosen && !outcome.correct;
          return (
            <button
              key={index}
              type="button"
              disabled={pending || outcome !== null}
              onClick={() => choose(index)}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors enabled:hover:bg-accent/60 disabled:cursor-default",
                isCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
                isWrongChoice && "border-destructive bg-destructive/10",
              )}
            >
              {isCorrect && (
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                  aria-label="Correct answer"
                />
              )}
              {isWrongChoice && (
                <XCircle
                  className="mt-0.5 size-4 shrink-0 text-destructive"
                  aria-label="Your answer"
                />
              )}
              <span>
                <Inline text={option} />
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {outcome && (
        <div className="grid gap-2 rounded-lg bg-muted/40 p-3 text-sm" role="status">
          <p className="font-medium">{outcome.correct ? "Correct." : "Not quite."}</p>
          {outcome.explanation && <RichText source={outcome.explanation} />}
          {!outcome.correct && (
            <p className="text-xs text-muted-foreground">
              {outcome.addedToReview
                ? "Added to your review queue so it comes back tomorrow."
                : "This question is already in your review queue."}
            </p>
          )}
          <Button variant="ghost" size="sm" className="w-fit" onClick={() => setOutcome(null)}>
            Try again
          </Button>
        </div>
      )}
    </li>
  );
}
