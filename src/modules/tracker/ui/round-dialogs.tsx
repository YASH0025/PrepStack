"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowRight, Loader2 } from "lucide-react";

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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import {
  cancelRoundAction,
  recordRoundOutcomeAction,
  rescheduleRoundAction,
  setApplicationStatusAction,
} from "../actions";
import { type StatusSuggestion, durationMinutes, fromUtc } from "../domain/rounds";
import {
  APPLICATION_STATUS_LABELS,
  CancelRoundInputSchema,
  CompleteRoundInputSchema,
  ROUND_RESULTS,
  ROUND_RESULT_LABELS,
  RescheduleRoundInputSchema,
  type Round,
} from "../schemas";

/* Outcome ----------------------------------------------------------------------- */

type OutcomeValues = z.input<typeof CompleteRoundInputSchema>;

export function OutcomeDialog({
  round,
  open,
  onOpenChange,
  onScheduleNext,
}: {
  round: Round;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleNext?: (applicationId: string) => void;
}) {
  const router = useRouter();
  const [suggestion, setSuggestion] = useState<StatusSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<OutcomeValues>({
    resolver: zodResolver(CompleteRoundInputSchema),
    defaultValues: {
      roundId: round.id,
      status: "COMPLETED",
      result: round.result === "AWAITING" ? "AWAITING" : round.result,
    },
  });

  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      setError(null);
      const result = await recordRoundOutcomeAction(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      if (result.data.suggestion) setSuggestion(result.data.suggestion);
      else onOpenChange(false);
    }),
  );

  const applySuggestion = () =>
    startTransition(async () => {
      if (!suggestion) return;
      await setApplicationStatusAction(round.applicationId, suggestion.status);
      router.refresh();
      onOpenChange(false);
      if (suggestion.scheduleNext) onScheduleNext?.(round.applicationId);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setSuggestion(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record outcome · Round {round.roundNumber}</DialogTitle>
          <DialogDescription>
            Did the meeting happen, and what was the result? You can update the result later.
          </DialogDescription>
        </DialogHeader>
        {suggestion ? (
          <div className="grid gap-4">
            <Alert variant="success">
              <AlertDescription>
                {suggestion.reason} Move the application to{" "}
                <strong>{APPLICATION_STATUS_LABELS[suggestion.status]}</strong>
                {suggestion.scheduleNext ? " and schedule the next round?" : "?"}
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Not now
              </Button>
              <Button onClick={applySuggestion} disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                {suggestion.scheduleNext ? "Update and schedule next" : "Update status"}
                <ArrowRight />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <FormField id="outcome-status" label="Did it happen?">
              {(c) => (
                <NativeSelect {...c} {...form.register("status")}>
                  <option value="COMPLETED">Yes, completed</option>
                  <option value="NO_SHOW_THEM">No, the interviewer did not join</option>
                  <option value="NO_SHOW_ME">No, I could not join</option>
                </NativeSelect>
              )}
            </FormField>
            <FormField id="outcome-result" label="Result">
              {(c) => (
                <NativeSelect {...c} {...form.register("result")}>
                  {ROUND_RESULTS.map((value) => (
                    <option key={value} value={value}>
                      {ROUND_RESULT_LABELS[value]}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                Save outcome
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* Cancel ------------------------------------------------------------------------ */

type CancelValues = z.input<typeof CancelRoundInputSchema>;

export function CancelRoundDialog({
  round,
  open,
  onOpenChange,
}: {
  round: Round;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<CancelValues>({
    resolver: zodResolver(CancelRoundInputSchema),
    defaultValues: { roundId: round.id, reason: "", cancelledBy: "COMPANY" },
  });
  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await cancelRoundAction(values);
      if (!result.ok) {
        setError(result.error);
        applyServerErrors(result, form.setError);
        return;
      }
      router.refresh();
      onOpenChange(false);
    }),
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel round {round.roundNumber}</DialogTitle>
          <DialogDescription>Kept in your history with the reason.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <FormField id="cancelledBy" label="Cancelled by">
            {(c) => (
              <NativeSelect {...c} {...form.register("cancelledBy")}>
                <option value="COMPANY">The company</option>
                <option value="ME">Me</option>
              </NativeSelect>
            )}
          </FormField>
          <FormField id="cancel-reason" label="Reason" error={form.formState.errors.reason}>
            {(c) => <Textarea {...c} rows={3} {...form.register("reason")} />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Keep round
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Cancel round
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* Reschedule -------------------------------------------------------------------- */

const RescheduleFormSchema = RescheduleRoundInputSchema.extend({
  reason: z.string().trim().max(500),
});
type RescheduleValues = z.input<typeof RescheduleFormSchema>;

export function RescheduleRoundDialog({
  round,
  open,
  onOpenChange,
}: {
  round: Round;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const when = fromUtc(round.startUtc, round.timezone);
  const form = useForm<RescheduleValues, unknown, z.output<typeof RescheduleFormSchema>>({
    resolver: zodResolver(RescheduleFormSchema),
    defaultValues: {
      roundId: round.id,
      date: when.date,
      startTime: when.time,
      durationMinutes: durationMinutes(round.startUtc, round.endUtc),
      timezone: round.timezone,
      reason: "",
      cancelledBy: "COMPANY",
    },
  });
  const errors = form.formState.errors;
  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await rescheduleRoundAction(values);
      if (!result.ok) {
        setError(result.error);
        applyServerErrors(result, form.setError);
        return;
      }
      router.refresh();
      onOpenChange(false);
    }),
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule round {round.roundNumber}</DialogTitle>
          <DialogDescription>
            A new round is created and linked; this one is kept as Rescheduled in the history.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField id="rs-date" label="New date" error={errors.date}>
              {(c) => <Input {...c} type="date" {...form.register("date")} />}
            </FormField>
            <FormField id="rs-time" label="Start" error={errors.startTime}>
              {(c) => <Input {...c} type="time" {...form.register("startTime")} />}
            </FormField>
            <FormField id="rs-duration" label="Minutes" error={errors.durationMinutes}>
              {(c) => (
                <Input
                  {...c}
                  type="number"
                  min={5}
                  max={480}
                  {...form.register("durationMinutes", { valueAsNumber: true })}
                />
              )}
            </FormField>
          </div>
          <FormField id="rs-timezone" label="Timezone" error={errors.timezone}>
            {(c) => <Input {...c} {...form.register("timezone")} />}
          </FormField>
          <FormField id="rs-by" label="Requested by">
            {(c) => (
              <NativeSelect {...c} {...form.register("cancelledBy")}>
                <option value="COMPANY">The company</option>
                <option value="ME">Me</option>
              </NativeSelect>
            )}
          </FormField>
          <FormField id="rs-reason" label="Reason (optional)" error={errors.reason}>
            {(c) => <Input {...c} {...form.register("reason")} />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Reschedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
