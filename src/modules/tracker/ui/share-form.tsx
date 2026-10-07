"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Eye, Loader2, Send, ShieldCheck, Trash2 } from "lucide-react";

import { FormField, applyServerErrors } from "@/components/rhf";
import { TagInput } from "@/components/tag-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  BAND_LABELS,
  EXPERIENCE_BANDS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  ROUND_TYPE_LABELS,
} from "@/lib/domain";
import { toNullableNumber } from "@/lib/forms";
import {
  OUTCOMES,
  OUTCOME_LABELS,
  type ReportDraft,
  ReportDraftSchema,
} from "@/modules/community/schemas";
import { ReportView } from "@/modules/community/ui/report-view";

import { type ShareFindingSummary, previewShareAction, publishShareAction } from "../share-actions";

const FINDING_LABELS: Record<ShareFindingSummary["kind"], [string, string]> = {
  NAME: ["name", "names"],
  EMAIL: ["email address", "email addresses"],
  PHONE: ["phone number", "phone numbers"],
  LINK: ["link", "links"],
  AMOUNT: ["money amount", "money amounts"],
  DATE: ["exact date", "exact dates"],
};

function describeRemoved(removed: ShareFindingSummary[]): string {
  return removed
    .map(({ kind, count }) => `${count} ${FINDING_LABELS[kind][count === 1 ? 0 : 1]}`)
    .join(", ");
}

const DIFFICULTY = [1, 2, 3, 4, 5];

/**
 * Edit → preview (server scrub, exact public version) → confirm → publish.
 * Any edit after previewing hides the publish button until previewed again.
 */
export function ShareForm({
  roundId,
  initial,
  initiallyRemoved,
  topicNames,
}: {
  roundId: string;
  initial: ReportDraft;
  initiallyRemoved: ShareFindingSummary[];
  topicNames: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<{
    draft: ReportDraft;
    removed: ShareFindingSummary[];
  } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const form = useForm<ReportDraft>({
    resolver: zodResolver(ReportDraftSchema),
    defaultValues: initial,
  });
  const { register, control, formState, handleSubmit, reset, setError } = form;
  const errors = formState.errors;
  const questions = useFieldArray({ control, name: "rounds.0.questions" });
  const round = initial.rounds[0];

  // Any edit invalidates the preview, so what is confirmed is always what is published.
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ type }) => {
          if (type !== "change") return;
          setPreview(null);
          setConfirmed(false);
        },
      }),
    [form],
  );

  const onPreview = handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await previewShareAction(roundId, values);
      if (!result.ok) {
        applyServerErrors(result, setError);
        setMessage({ ok: false, text: result.error });
        return;
      }
      reset(result.data.draft);
      setPreview(result.data);
      setConfirmed(false);
      requestAnimationFrame(() =>
        document.getElementById("share-preview")?.scrollIntoView({ behavior: "smooth" }),
      );
    });
  });

  const onPublish = () => {
    if (!preview || !confirmed) return;
    startTransition(async () => {
      const result = await publishShareAction(roundId, preview.draft);
      if (!result.ok) {
        setPreview(null);
        setMessage({ ok: false, text: result.error });
        return;
      }
      setPreview(null);
      setMessage({
        ok: true,
        text: "Thanks for sharing! A moderator will review it before it appears in Interview Intel.",
      });
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6">
      {initiallyRemoved.length > 0 && (
        <Alert>
          <ShieldCheck aria-hidden />
          <AlertTitle>We already removed personal details</AlertTitle>
          <AlertDescription>
            Removed {describeRemoved(initiallyRemoved)}. People, salaries, contacts, notes, feedback
            and exact dates are never copied. Check the text below for anything else that could
            identify you or the interviewers.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={onPreview} className="grid gap-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="share-company" label="Company" error={errors.companyName}>
            {(props) => <Input {...props} {...register("companyName")} />}
          </FormField>
          <FormField id="share-role" label="Role" error={errors.roleTitle}>
            {(props) => <Input {...props} {...register("roleTitle")} />}
          </FormField>
          <FormField id="share-band" label="Experience" error={errors.experienceBand}>
            {(props) => (
              <NativeSelect {...props} {...register("experienceBand")}>
                {EXPERIENCE_BANDS.map((band) => (
                  <option key={band} value={band}>
                    {BAND_LABELS[band]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField
            id="share-month"
            label="Month"
            hint="Only the month and year are shared."
            error={errors.monthYear}
          >
            {(props) => <Input {...props} type="month" {...register("monthYear")} />}
          </FormField>
          <FormField id="share-outcome" label="Outcome" error={errors.outcome}>
            {(props) => (
              <NativeSelect {...props} {...register("outcome")}>
                {OUTCOMES.map((outcome) => (
                  <option key={outcome} value={outcome}>
                    {OUTCOME_LABELS[outcome]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField
            id="share-difficulty"
            label="Overall difficulty"
            error={errors.overallDifficulty}
          >
            {(props) => (
              <NativeSelect {...props} {...register("overallDifficulty", { valueAsNumber: true })}>
                {DIFFICULTY.map((value) => (
                  <option key={value} value={value}>
                    {value}/5
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
        </div>

        <FormField
          id="share-tech"
          label="Technologies"
          hint="Press Enter or comma to add."
          error={errors.technologies as { message?: string } | undefined}
        >
          {(props) => (
            <Controller
              control={control}
              name="technologies"
              render={({ field }) => (
                <TagInput
                  id={props.id}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  max={12}
                  invalid={props["aria-invalid"]}
                  describedBy={props["aria-describedby"]}
                />
              )}
            />
          )}
        </FormField>

        <FormField
          id="share-summary"
          label="Summary (optional)"
          hint="The process, what surprised you, tips for the next candidate. No names."
          error={errors.summary}
        >
          {(props) => <Textarea {...props} rows={3} {...register("summary")} />}
        </FormField>

        {round && (
          <fieldset className="grid gap-4 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">
              {ROUND_TYPE_LABELS[round.type]} round
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="share-round-difficulty" label="Round difficulty">
                {(props) => (
                  <NativeSelect
                    {...props}
                    {...register("rounds.0.difficulty", { valueAsNumber: true })}
                  >
                    {DIFFICULTY.map((value) => (
                      <option key={value} value={value}>
                        {value}/5
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </FormField>
              <FormField
                id="share-round-duration"
                label="Duration (minutes)"
                hint="Rounded to 15 minutes."
                error={errors.rounds?.[0]?.durationMinutes}
              >
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    min={15}
                    step={15}
                    {...register("rounds.0.durationMinutes", { setValueAs: toNullableNumber })}
                  />
                )}
              </FormField>
            </div>
            <div className="grid gap-3">
              <p className="text-sm font-medium">Questions</p>
              {questions.fields.length === 0 && (
                <p className="text-sm text-muted-foreground">No questions to share.</p>
              )}
              {questions.fields.map((field, index) => {
                const fixedTopic = field.topicId ? topicNames[field.topicId] : null;
                const fieldErrors = errors.rounds?.[0]?.questions?.[index];
                return (
                  <div key={field.id} className="grid gap-2 rounded-md border p-3">
                    <FormField
                      id={`share-q-${index}`}
                      label={`Question ${index + 1}`}
                      error={fieldErrors?.text}
                    >
                      {(props) => (
                        <Textarea
                          {...props}
                          rows={2}
                          {...register(`rounds.0.questions.${index}.text`)}
                        />
                      )}
                    </FormField>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="grid gap-1.5">
                        <Label htmlFor={`share-q-${index}-type`}>Type</Label>
                        <NativeSelect
                          id={`share-q-${index}-type`}
                          {...register(`rounds.0.questions.${index}.type`)}
                        >
                          {QUESTION_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {QUESTION_TYPE_LABELS[type]}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                      {fixedTopic ? (
                        <p className="pb-2 text-sm text-muted-foreground">Topic: {fixedTopic}</p>
                      ) : (
                        <div className="grid min-w-48 flex-1 gap-1.5">
                          <Label htmlFor={`share-q-${index}-topic`}>Topic (optional)</Label>
                          <Input
                            id={`share-q-${index}-topic`}
                            {...register(`rounds.0.questions.${index}.topicLabel`, {
                              setValueAs: (value: string | null) =>
                                value === null || value.trim() === "" ? null : value,
                            })}
                          />
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                        onClick={() => {
                          questions.remove(index);
                          setPreview(null);
                          setConfirmed(false);
                        }}
                      >
                        <Trash2 /> Don&apos;t share
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        )}

        {message && (
          <Alert variant={message.ok ? "default" : "destructive"}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-fit" disabled={pending}>
          {pending && !preview ? <Loader2 className="animate-spin" /> : <Eye />} Preview public
          version
        </Button>
      </form>

      {preview && (
        <section
          id="share-preview"
          className="grid gap-4 rounded-xl border-2 border-primary/40 p-4"
        >
          <div className="grid gap-1">
            <h2 className="text-base font-semibold">Exactly what others will see</h2>
            <p className="text-sm text-muted-foreground">
              {preview.removed.length > 0
                ? `We removed ${describeRemoved(preview.removed)} from your edits.`
                : "No further personal details found."}{" "}
              Your name, the interviewers and this round&apos;s private notes are not included, and
              nothing links this report back to you.
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4">
            <ReportView report={preview.draft} topicNames={topicNames} />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="share-confirm"
              checked={confirmed}
              onCheckedChange={(value) => setConfirmed(value === true)}
            />
            <Label htmlFor="share-confirm" className="leading-snug font-normal">
              I checked this report. It contains no names, contacts or other details that could
              identify me, the interviewers or anyone else.
            </Label>
          </div>
          <Button className="w-fit" onClick={onPublish} disabled={!confirmed || pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Send />} Publish anonymously
          </Button>
        </section>
      )}
    </div>
  );
}
