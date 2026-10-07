"use client";

import { useOptimistic, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Flag, Loader2, ThumbsUp } from "lucide-react";

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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { flagReportAction, toggleVoteAction } from "../actions";
import { FLAG_REASONS, FLAG_REASON_LABELS, type FlagInput, FlagInputSchema } from "../schemas";

export function VoteButton({
  reportId,
  voted,
  count,
}: {
  reportId: string;
  voted: boolean;
  count: number;
}) {
  const [state, setState] = useState({ voted, count });
  const [optimistic, setOptimistic] = useOptimistic(state);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  return (
    <div className="grid gap-1">
      <Button
        variant={optimistic.voted ? "default" : "outline"}
        size="sm"
        aria-pressed={optimistic.voted}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            setOptimistic({
              voted: !optimistic.voted,
              count: optimistic.count + (optimistic.voted ? -1 : 1),
            });
            const result = await toggleVoteAction(reportId);
            if (result.ok) setState(result.data);
            else setError(result.error);
          })
        }
      >
        <ThumbsUp /> Useful · {optimistic.count}
      </Button>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function FlagDialog({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<FlagInput>({
    resolver: zodResolver(FlagInputSchema),
    defaultValues: { reason: "PERSONAL_INFO", note: "" },
  });
  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      setMessage(null);
      const result = await flagReportAction(reportId, values);
      if (!result.ok) {
        applyServerErrors(result, form.setError);
        setMessage(result.error);
        return;
      }
      setDone(
        result.data.created
          ? "Thanks. A moderator will take a look."
          : "You have already reported this. A moderator will take a look.",
      );
    }),
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setDone(null);
          setMessage(null);
          form.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Flag /> Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this interview report</DialogTitle>
          <DialogDescription>
            Tell moderators what is wrong. Personal information is removed or hidden quickly.
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <Alert>
            <AlertDescription>{done}</AlertDescription>
          </Alert>
        ) : (
          <form id="flag-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
            <FormField id="flag-reason" label="Reason" error={form.formState.errors.reason}>
              {(props) => (
                <NativeSelect {...props} {...form.register("reason")}>
                  {FLAG_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {FLAG_REASON_LABELS[reason]}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField
              id="flag-note"
              label="Details (optional)"
              hint="Which part? Don't repeat the personal information here."
              error={form.formState.errors.note}
            >
              {(props) => <Textarea {...props} rows={3} {...form.register("note")} />}
            </FormField>
            {message && (
              <p className="text-sm text-destructive" role="alert">
                {message}
              </p>
            )}
          </form>
        )}
        <DialogFooter>
          {done ? (
            <Button onClick={() => setOpen(false)}>Close</Button>
          ) : (
            <Button type="submit" form="flag-form" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Send report
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
