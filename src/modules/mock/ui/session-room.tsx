"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, type Resolver, useForm } from "react-hook-form";
import { type z } from "zod";
import { Ban, Flag, Loader2, Pause, Play, RefreshCw, RotateCcw, UserX, X } from "lucide-react";

import { FormField, applyServerErrors } from "@/components/rhf";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { SELF_RATINGS, SELF_RATING_LABELS } from "@/lib/domain";
import { cn } from "@/lib/utils";

import {
  blockPartnerAction,
  cancelSessionAction,
  replaceQuestionAction,
  reportNoShowAction,
  reportPartnerAction,
  setMeetingLinkAction,
  submitFeedbackAction,
  swapQuestionAction,
} from "../actions";
import {
  FEEDBACK_AREAS,
  FEEDBACK_AREA_LABELS,
  FeedbackInputSchema,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
} from "../schemas";

type ActionLike = { ok: boolean; error?: string };

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionLike>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong");
      else {
        after?.();
        router.refresh();
      }
    });
  return { pending, error, run };
}

function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <p className="text-sm text-destructive" role="alert">
      {error}
    </p>
  ) : null;
}

/* ------------------------------ meeting link ----------------------------- */

export function MeetingLinkForm({ sessionId, link }: { sessionId: string; link: string | null }) {
  const [editing, setEditing] = useState(!link);
  const [value, setValue] = useState(link ?? "");
  const { pending, error, run } = useAction();
  if (!editing && link) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild>
          <a href={link} target="_blank" rel="noopener noreferrer">
            Join meeting
          </a>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Change link
        </Button>
      </div>
    );
  }
  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () => setMeetingLinkAction(sessionId, value),
          () => setEditing(false),
        );
      }}
    >
      <label htmlFor="meeting-link" className="text-sm font-medium">
        Meeting link
      </label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="meeting-link"
          type="url"
          className="min-w-64 flex-1"
          placeholder="https://meet.google.com/…"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Save link
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Create a Google Meet or Zoom meeting and paste the link. Your partner sees it here.
      </p>
      <ErrorText error={error} />
    </form>
  );
}

/* --------------------------------- timer -------------------------------- */

/** Two 30-minute turns. Local only: nothing is saved. */
export function InterviewTimer({ myName, partnerName }: { myName: string; partnerName: string }) {
  const TURN = 30 * 60;
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setElapsed((value) => Math.min(value + 1, TURN * 2)), 1000);
    return () => clearInterval(timer);
  }, [running, TURN]);
  const turn = elapsed < TURN ? 0 : 1;
  const left = (turn === 0 ? TURN : TURN * 2) - elapsed;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <div className="grid">
        <span className="text-xs text-muted-foreground">
          Turn {turn + 1} of 2 ·{" "}
          {turn === 0 ? `${myName} ask the questions` : `${partnerName} asks the questions`}
        </span>
        <span className="font-mono text-2xl tabular-nums" aria-live="off">
          {mm}:{ss}
        </span>
      </div>
      <div className="ml-auto flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRunning((value) => !value)}
          aria-label={running ? "Pause timer" : "Start timer"}
        >
          {running ? <Pause /> : <Play />} {running ? "Pause" : "Start"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setElapsed(turn === 0 ? TURN : TURN * 2)}
          aria-label="Next turn"
        >
          Next turn
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRunning(false);
            setElapsed(0);
          }}
          aria-label="Reset timer"
        >
          <RotateCcw />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------- questions ------------------------------ */

export function QuestionTools({
  sessionId,
  questionId,
  alternatives,
  disabled,
}: {
  sessionId: string;
  questionId: string;
  alternatives: { id: string; prompt: string }[];
  disabled: boolean;
}) {
  const { pending, error, run } = useAction();
  if (disabled) return null;
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => run(() => swapQuestionAction(sessionId, questionId))}
        >
          <RefreshCw /> Swap
        </Button>
        {alternatives.length > 0 && (
          <NativeSelect
            aria-label="Choose a different question"
            className="h-8 max-w-72 text-xs"
            value=""
            disabled={pending}
            onChange={(event) => {
              const next = event.target.value;
              if (next) run(() => replaceQuestionAction(sessionId, questionId, next));
            }}
          >
            <option value="">Choose another question…</option>
            {alternatives.map((item) => (
              <option key={item.id} value={item.id}>
                {item.prompt.length > 90 ? `${item.prompt.slice(0, 90)}…` : item.prompt}
              </option>
            ))}
          </NativeSelect>
        )}
      </div>
      <ErrorText error={error} />
    </div>
  );
}

/* ------------------------------- feedback ------------------------------- */

type FeedbackValues = z.input<typeof FeedbackInputSchema>;

export function FeedbackForm({
  sessionId,
  partnerName,
  questions,
}: {
  sessionId: string;
  partnerName: string;
  questions: { id: string; prompt: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<FeedbackValues>({
    resolver: zodResolver(FeedbackInputSchema) as unknown as Resolver<FeedbackValues>,
    defaultValues: {
      ratings: {
        communication: "",
        problemSolving: "",
        technicalDepth: "",
        structure: "",
      } as unknown as FeedbackValues["ratings"],
      questions: questions.map((question) => ({
        questionId: question.id,
        rating: "" as unknown as "NAILED",
      })),
      strengths: "",
      improvements: "",
    },
  });
  const errors = form.formState.errors;
  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      setMessage(null);
      const result = await submitFeedbackAction(sessionId, values);
      if (!result.ok) {
        applyServerErrors(result, form.setError);
        setMessage(result.error);
        return;
      }
      router.refresh();
    }),
  );
  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-medium">
          How did {partnerName} do? (1 = weak, 5 = excellent)
        </legend>
        {FEEDBACK_AREAS.map((area) => (
          <Controller
            key={area}
            control={form.control}
            name={`ratings.${area}`}
            render={({ field }) => (
              <div className="grid gap-1" role="radiogroup" aria-labelledby={`rating-${area}`}>
                <span id={`rating-${area}`} className="text-sm">
                  {FEEDBACK_AREA_LABELS[area]}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label
                      key={value}
                      className={cn(
                        "flex size-9 cursor-pointer items-center justify-center rounded-md border text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                        String(field.value) === String(value) &&
                          "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={`ratings.${area}`}
                        value={value}
                        checked={String(field.value) === String(value)}
                        onChange={() => field.onChange(value)}
                      />
                      {value}
                    </label>
                  ))}
                </div>
                {errors.ratings?.[area] && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors.ratings[area]?.message}
                  </p>
                )}
              </div>
            )}
          />
        ))}
      </fieldset>
      {questions.length > 0 && (
        <fieldset className="grid gap-3">
          <legend className="mb-1 text-sm font-medium">Each question you asked</legend>
          {questions.map((question, index) => (
            <div key={question.id} className="grid gap-1">
              <label htmlFor={`fb-q-${index}`} className="text-sm">
                {question.prompt}
              </label>
              <NativeSelect
                id={`fb-q-${index}`}
                className="max-w-48"
                {...form.register(`questions.${index}.rating`)}
              >
                <option value="">How did it go?</option>
                {SELF_RATINGS.map((rating) => (
                  <option key={rating} value={rating}>
                    {SELF_RATING_LABELS[rating]}
                  </option>
                ))}
              </NativeSelect>
              {errors.questions?.[index]?.rating && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.questions[index]?.rating?.message}
                </p>
              )}
            </div>
          ))}
        </fieldset>
      )}
      <FormField id="fb-strengths" label="What went well" error={errors.strengths}>
        {(props) => <Textarea {...props} rows={3} {...form.register("strengths")} />}
      </FormField>
      <FormField id="fb-improve" label="What to work on" error={errors.improvements}>
        {(props) => <Textarea {...props} rows={3} {...form.register("improvements")} />}
      </FormField>
      <p className="text-xs text-muted-foreground">
        Only {partnerName} sees your notes. Ratings feed their private score; missed questions go
        into their review.
      </p>
      {message && (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Send feedback
      </Button>
    </form>
  );
}

/* ---------------------------- session actions ---------------------------- */

export function SessionActions({
  sessionId,
  partnerName,
  canCancel,
  lateCancel,
  canReportNoShow,
  isBlocked,
}: {
  sessionId: string;
  partnerName: string;
  canCancel: boolean;
  lateCancel: boolean;
  canReportNoShow: boolean;
  isBlocked: boolean;
}) {
  const { pending, error, run } = useAction();
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              const warning = lateCancel
                ? "It is less than 2 hours to the start, so cancelling now counts as a no-show. Cancel anyway?"
                : "Cancel this mock interview?";
              if (window.confirm(warning)) run(() => cancelSessionAction(sessionId));
            }}
          >
            <X /> Cancel session
          </Button>
        )}
        {canReportNoShow && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Report that ${partnerName} did not join?`)) {
                run(() => reportNoShowAction(sessionId));
              }
            }}
          >
            <UserX /> {partnerName} did not join
          </Button>
        )}
        <ReportDialog sessionId={sessionId} partnerName={partnerName} />
        {!isBlocked && (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Block ${partnerName}? You will never be matched again.`)) {
                run(() => blockPartnerAction(sessionId));
              }
            }}
          >
            <Ban /> Block
          </Button>
        )}
      </div>
      <ErrorText error={error} />
    </div>
  );
}

function ReportDialog({ sessionId, partnerName }: { sessionId: string; partnerName: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>("INAPPROPRIATE");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const { pending, error, run } = useAction();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDone(false);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Flag /> Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {partnerName}</DialogTitle>
          <DialogDescription>A moderator reviews every report.</DialogDescription>
        </DialogHeader>
        {done ? (
          <p className="text-sm">Thanks. We will look into it.</p>
        ) : (
          <div className="grid gap-3">
            <label htmlFor="report-reason" className="text-sm font-medium">
              Reason
            </label>
            <NativeSelect
              id="report-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value as typeof reason)}
            >
              {REPORT_REASONS.map((item) => (
                <option key={item} value={item}>
                  {REPORT_REASON_LABELS[item]}
                </option>
              ))}
            </NativeSelect>
            <label htmlFor="report-note" className="text-sm font-medium">
              What happened (optional)
            </label>
            <Textarea
              id="report-note"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <ErrorText error={error} />
          </div>
        )}
        <DialogFooter>
          {done ? (
            <Button onClick={() => setOpen(false)}>Close</Button>
          ) : (
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () => reportPartnerAction(sessionId, { reason, note }),
                  () => setDone(true),
                )
              }
            >
              {pending && <Loader2 className="animate-spin" />} Send report
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
