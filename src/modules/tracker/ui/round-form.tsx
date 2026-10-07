"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { type z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { FormField, applyServerErrors } from "@/components/rhf";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ROUND_TYPES, ROUND_TYPE_LABELS } from "@/lib/domain";

import { saveRoundAction } from "../actions";
import { durationMinutes, fromUtc } from "../domain/rounds";
import { type Application, MODE_LABELS, type Round, RoundInputSchema } from "../schemas";

type Values = z.input<typeof RoundInputSchema>;

export const REMINDER_OPTIONS = [
  { minutes: 24 * 60, label: "1 day before" },
  { minutes: 3 * 60, label: "3 hours before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 30, label: "30 minutes before" },
];

function defaults(
  applicationId: string,
  timezone: string,
  reminderMinutes: number[],
  round?: Round,
  slot?: { date: string; time: string },
): Values {
  const when = round ? fromUtc(round.startUtc, round.timezone) : null;
  return {
    applicationId: round?.applicationId ?? applicationId,
    type: round?.type ?? "TECHNICAL",
    title: round?.title ?? "",
    date: when?.date ?? slot?.date ?? "",
    startTime: when?.time ?? slot?.time ?? "11:00",
    durationMinutes: round ? durationMinutes(round.startUtc, round.endUtc) : 60,
    timezone: round?.timezone ?? timezone,
    mode: round?.mode ?? "VIDEO",
    meetingLink: round?.meetingLink ?? "",
    location: round?.location ?? "",
    people: round?.people ?? {
      hr: { name: "", email: "", phone: "", linkedin: "" },
      interviewers: [],
      panel: [],
    },
    reminderMinutes: round?.reminderMinutes ?? reminderMinutes,
    notes: round?.notes ?? "",
  };
}

/**
 * Schedule or edit an interview round. Times are entered in a timezone
 * (default: yours) and stored in UTC. HR and interviewer details are encrypted.
 */
export function RoundFormDialog({
  open,
  onOpenChange,
  applications,
  applicationId,
  round,
  timezone,
  reminderMinutes,
  slot,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applications: Pick<Application, "id" | "companyName" | "jobTitle">[];
  applicationId?: string;
  round?: Round;
  timezone: string;
  reminderMinutes: number[];
  /** Pre-filled date/time, e.g. from clicking an empty calendar slot. */
  slot?: { date: string; time: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const initial = () =>
    defaults(applicationId ?? applications[0]?.id ?? "", timezone, reminderMinutes, round, slot);
  const form = useForm<Values, unknown, z.output<typeof RoundInputSchema>>({
    resolver: zodResolver(RoundInputSchema),
    defaultValues: initial(),
  });
  const { register, control, formState } = form;
  const errors = formState.errors;
  const interviewers = useFieldArray({ control, name: "people.interviewers" });
  const mode = useWatch({ control, name: "mode" });

  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      setError(null);
      setWarning(null);
      const result = await saveRoundAction(round?.id ?? null, values);
      if (!result.ok) {
        setError(result.error);
        applyServerErrors(result, form.setError);
        return;
      }
      router.refresh();
      if (result.data.conflict) {
        setWarning("Saved, but this round overlaps another scheduled round. Check your calendar.");
        return;
      }
      onOpenChange(false);
    }),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          form.reset(initial());
          setWarning(null);
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {round ? `Edit round ${round.roundNumber}` : "Schedule a round"}
          </DialogTitle>
          <DialogDescription>
            Reminders default to 1 day and 1 hour before. HR and interviewer details stay encrypted
            and private.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {warning && (
            <Alert variant="warning">
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {!round && (
              <FormField
                id="applicationId"
                label="Application"
                className="sm:col-span-2"
                error={errors.applicationId}
              >
                {(c) => (
                  <NativeSelect {...c} {...register("applicationId")}>
                    {applications.map((application) => (
                      <option key={application.id} value={application.id}>
                        {application.companyName} · {application.jobTitle}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
            )}
            <FormField id="type" label="Round type" error={errors.type}>
              {(c) => (
                <NativeSelect {...c} {...register("type")}>
                  {ROUND_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {ROUND_TYPE_LABELS[type]}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField id="title" label="Title (optional)" error={errors.title}>
              {(c) => <Input {...c} placeholder="e.g. DSA round" {...register("title")} />}
            </FormField>
            <FormField id="date" label="Date" error={errors.date}>
              {(c) => <Input {...c} type="date" {...register("date")} />}
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="startTime" label="Start" error={errors.startTime}>
                {(c) => <Input {...c} type="time" {...register("startTime")} />}
              </FormField>
              <FormField id="durationMinutes" label="Minutes" error={errors.durationMinutes}>
                {(c) => (
                  <Input
                    {...c}
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    {...register("durationMinutes", { valueAsNumber: true })}
                  />
                )}
              </FormField>
            </div>
            <FormField
              id="timezone"
              label="Timezone of these times"
              hint="Use the interviewer's timezone if they sent the time in theirs."
              error={errors.timezone}
            >
              {(c) => <Input {...c} list="timezones" {...register("timezone")} />}
            </FormField>
            <FormField id="mode" label="Mode" error={errors.mode}>
              {(c) => (
                <NativeSelect {...c} {...register("mode")}>
                  {Object.entries(MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            {mode === "ONSITE" ? (
              <FormField
                id="location"
                label="Location"
                className="sm:col-span-2"
                error={errors.location}
              >
                {(c) => <Input {...c} {...register("location")} />}
              </FormField>
            ) : (
              <FormField
                id="meetingLink"
                label="Meeting link"
                className="sm:col-span-2"
                error={errors.meetingLink}
              >
                {(c) => (
                  <Input {...c} type="url" placeholder="https://" {...register("meetingLink")} />
                )}
              </FormField>
            )}
          </div>

          <datalist id="timezones">
            {(() => {
              try {
                return Intl.supportedValuesOf("timeZone").map((zone) => (
                  <option key={zone} value={zone} />
                ));
              } catch {
                return null;
              }
            })()}
          </datalist>

          <details className="rounded-lg border p-4" open={Boolean(round?.people.hr.name)}>
            <summary className="cursor-pointer text-sm font-medium">
              People (HR and interviewers)
            </summary>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="hr-name" label="HR / recruiter name">
                  {(c) => <Input {...c} {...register("people.hr.name")} />}
                </FormField>
                <FormField id="hr-email" label="HR email">
                  {(c) => <Input {...c} type="email" {...register("people.hr.email")} />}
                </FormField>
                <FormField id="hr-phone" label="HR phone">
                  {(c) => <Input {...c} type="tel" {...register("people.hr.phone")} />}
                </FormField>
                <FormField id="hr-linkedin" label="HR LinkedIn">
                  {(c) => <Input {...c} {...register("people.hr.linkedin")} />}
                </FormField>
              </div>
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-medium">Interviewers</legend>
                {interviewers.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <Input
                      aria-label="Interviewer name"
                      placeholder="Name"
                      {...register(`people.interviewers.${index}.name`)}
                    />
                    <Input
                      aria-label="Designation"
                      placeholder="Designation"
                      {...register(`people.interviewers.${index}.designation`)}
                    />
                    <Input
                      aria-label="LinkedIn"
                      placeholder="LinkedIn"
                      {...register(`people.interviewers.${index}.linkedin`)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove interviewer"
                      onClick={() => interviewers.remove(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                {errors.people?.interviewers && (
                  <p className="text-xs text-destructive">Every interviewer needs a name.</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => interviewers.append({ name: "", designation: "", linkedin: "" })}
                  disabled={interviewers.fields.length >= 10}
                >
                  <Plus /> Add interviewer
                </Button>
              </fieldset>
            </div>
          </details>

          <Controller
            control={control}
            name="reminderMinutes"
            render={({ field }) => (
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">Reminders</legend>
                <div className="flex flex-wrap gap-4">
                  {REMINDER_OPTIONS.map((option) => {
                    const checked = field.value?.includes(option.minutes) ?? false;
                    return (
                      <label key={option.minutes} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            field.onChange(
                              value === true
                                ? [...(field.value ?? []), option.minutes]
                                : (field.value ?? []).filter(
                                    (minutes) => minutes !== option.minutes,
                                  ),
                            )
                          }
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}
          />

          <FormField id="round-notes" label="Private notes" error={errors.notes}>
            {(c) => <Textarea {...c} rows={3} {...register("notes")} />}
          </FormField>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {warning ? "Close" : "Cancel"}
            </Button>
            <Button type="submit" disabled={pending || applications.length === 0}>
              {pending && <Loader2 className="animate-spin" />}
              {round ? "Save round" : "Schedule round"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
