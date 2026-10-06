"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { Inline, RichText } from "@/components/rich-text";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { submitDiagnosticAction } from "../actions";
import { type ClientDiagnosticQuestion, type SelfGrade } from "../schemas";

interface AnswerState {
  response: string;
  selfGrade: SelfGrade | null;
  revealed: boolean;
}

const SELF_GRADES: { value: SelfGrade; label: string }[] = [
  { value: "YES", label: "Mine covers it" },
  { value: "PARTLY", label: "Partly" },
  { value: "NO", label: "Not really" },
];

/**
 * Runs the diagnostic one question at a time. MCQ answers are graded on the
 * server (the correct option is never sent to the browser). Open answers are
 * compared with a model answer and self-graded honestly.
 */
export function DiagnosticRunner({
  questions,
  resultsPath,
}: {
  questions: ClientDiagnosticQuestion[];
  /** Where to go after submitting; "{id}" is replaced with the attempt id. */
  resultsPath: string;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const question = questions[index];
  if (!question) return null;
  const state = answers[question.id] ?? { response: "", selfGrade: null, revealed: false };
  const update = (patch: Partial<AnswerState>) =>
    setAnswers((current) => ({ ...current, [question.id]: { ...state, ...patch } }));

  const answeredCount = questions.filter((item) => {
    const answer = answers[item.id];
    return item.format === "MCQ"
      ? answer?.response !== undefined && answer.response !== ""
      : answer?.selfGrade;
  }).length;
  const isLast = index === questions.length - 1;
  const openNeedsGrade = question.format === "OPEN" && state.revealed && !state.selfGrade;

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await submitDiagnosticAction({
        answers: questions.map((item) => ({
          questionId: item.id,
          response: answers[item.id]?.response ?? "",
          selfGrade: answers[item.id]?.selfGrade ?? null,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(resultsPath.replace("{id}", result.data.attemptId));
    });
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span>{answeredCount} answered</span>
        </div>
        <Progress value={((index + 1) / questions.length) * 100} aria-label="Diagnostic progress" />
      </div>

      <section aria-labelledby="diagnostic-question" className="grid gap-4">
        <Badge variant="outline">{question.topicName}</Badge>
        <div id="diagnostic-question" className="text-lg font-medium">
          <RichText source={question.prompt} className="text-base" />
        </div>

        {question.format === "MCQ" ? (
          <fieldset className="grid gap-2">
            <legend className="sr-only">Choose one answer</legend>
            {question.options.map((option, optionIndex) => {
              const selected = state.response === String(optionIndex);
              return (
                <label
                  key={optionIndex}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50",
                    selected ? "border-primary bg-primary/5" : "hover:bg-accent/50",
                  )}
                >
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    className="mt-0.5 accent-primary"
                    checked={selected}
                    onChange={() => update({ response: String(optionIndex) })}
                  />
                  <span>
                    <Inline text={option} />
                  </span>
                </label>
              );
            })}
          </fieldset>
        ) : (
          <div className="grid gap-3">
            <label htmlFor="open-answer" className="text-sm font-medium">
              Your answer (a few sentences is enough)
            </label>
            <Textarea
              id="open-answer"
              rows={6}
              value={state.response}
              disabled={state.revealed}
              onChange={(event) => update({ response: event.target.value })}
            />
            {!state.revealed ? (
              <Button
                type="button"
                variant="outline"
                className="w-fit"
                onClick={() => update({ revealed: true })}
              >
                {state.response.trim() ? "Compare with model answer" : "I don't know, show answer"}
              </Button>
            ) : (
              <div className="grid gap-3 rounded-lg border bg-muted/40 p-4">
                <p className="text-sm font-medium">Model answer</p>
                <RichText source={question.modelAnswer ?? ""} />
                {state.response.trim() ? (
                  <fieldset className="grid gap-2">
                    <legend className="text-sm font-medium">
                      Be honest: how well did your answer cover it?
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {SELF_GRADES.map((grade) => (
                        <Button
                          key={grade.value}
                          type="button"
                          size="sm"
                          variant={state.selfGrade === grade.value ? "default" : "outline"}
                          aria-pressed={state.selfGrade === grade.value}
                          onClick={() => update({ selfGrade: grade.value })}
                        >
                          {grade.label}
                        </Button>
                      ))}
                    </div>
                  </fieldset>
                ) : (
                  <p className="text-xs text-muted-foreground">Counted as not yet known.</p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0 || pending}
        >
          <ArrowLeft /> Back
        </Button>
        {isLast ? (
          <Button type="button" onClick={submit} disabled={pending || openNeedsGrade}>
            {pending && <Loader2 className="animate-spin" />}
            Finish and see results
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setIndex((value) => value + 1)}
            disabled={openNeedsGrade}
          >
            {question.format === "MCQ" && state.response === "" ? "Skip" : "Next"} <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}
