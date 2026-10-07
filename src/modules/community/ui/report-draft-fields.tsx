"use client";

import { Controller, type UseFormReturn, useFieldArray } from "react-hook-form";
import { Trash2 } from "lucide-react";

import { FormField } from "@/components/rhf";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
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

import { OUTCOMES, OUTCOME_LABELS, type ReportDraft } from "../schemas";

const DIFFICULTY = [1, 2, 3, 4, 5];

type DraftForm = UseFormReturn<ReportDraft>;

/**
 * Editable fields of a public report draft. Shared by the author's share form
 * and the moderators' edit-for-anonymity form.
 */
export function ReportDraftFields({
  form,
  topicNames,
  onQuestionRemoved,
  lockCompany = false,
}: {
  form: DraftForm;
  topicNames: Record<string, string>;
  onQuestionRemoved?: () => void;
  /** Authors share about their tracked company; only moderators may change it. */
  lockCompany?: boolean;
}) {
  const { register, control, formState } = form;
  const errors = formState.errors;
  const rounds = form.getValues("rounds");
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="report-company"
          label="Company"
          hint={lockCompany ? "From your tracker." : undefined}
          error={errors.companyName}
        >
          {(props) => <Input {...props} readOnly={lockCompany} {...register("companyName")} />}
        </FormField>
        <FormField id="report-role" label="Role" error={errors.roleTitle}>
          {(props) => <Input {...props} {...register("roleTitle")} />}
        </FormField>
        <FormField id="report-band" label="Experience" error={errors.experienceBand}>
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
          id="report-month"
          label="Month"
          hint="Only the month and year are shared."
          error={errors.monthYear}
        >
          {(props) => <Input {...props} type="month" {...register("monthYear")} />}
        </FormField>
        <FormField id="report-outcome" label="Outcome" error={errors.outcome}>
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
          id="report-difficulty"
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
        id="report-tech"
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
        id="report-summary"
        label="Summary (optional)"
        hint="The process, what surprised you, tips for the next candidate. No names."
        error={errors.summary}
      >
        {(props) => <Textarea {...props} rows={3} {...register("summary")} />}
      </FormField>

      {rounds.map((round, roundIndex) => (
        <RoundFields
          key={roundIndex}
          form={form}
          roundIndex={roundIndex}
          roundType={round.type}
          topicNames={topicNames}
          onQuestionRemoved={onQuestionRemoved}
        />
      ))}
    </>
  );
}

function RoundFields({
  form,
  roundIndex,
  roundType,
  topicNames,
  onQuestionRemoved,
}: {
  form: DraftForm;
  roundIndex: number;
  roundType: ReportDraft["rounds"][number]["type"];
  topicNames: Record<string, string>;
  onQuestionRemoved?: () => void;
}) {
  const { register, control, formState } = form;
  const errors = formState.errors;
  const questions = useFieldArray({ control, name: `rounds.${roundIndex}.questions` });
  return (
    <fieldset className="grid gap-4 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">{ROUND_TYPE_LABELS[roundType]} round</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={`report-r${roundIndex}-difficulty`} label="Round difficulty">
          {(props) => (
            <NativeSelect
              {...props}
              {...register(`rounds.${roundIndex}.difficulty`, { valueAsNumber: true })}
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
          id={`report-r${roundIndex}-duration`}
          label="Duration (minutes)"
          hint="Rounded to 15 minutes."
          error={errors.rounds?.[roundIndex]?.durationMinutes}
        >
          {(props) => (
            <Input
              {...props}
              type="number"
              min={15}
              step={15}
              {...register(`rounds.${roundIndex}.durationMinutes`, {
                setValueAs: toNullableNumber,
              })}
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
          const fieldErrors = errors.rounds?.[roundIndex]?.questions?.[index];
          return (
            <div key={field.id} className="grid gap-2 rounded-md border p-3">
              <FormField
                id={`report-r${roundIndex}-q-${index}`}
                label={`Question ${index + 1}`}
                error={fieldErrors?.text}
              >
                {(props) => (
                  <Textarea
                    {...props}
                    rows={2}
                    {...register(`rounds.${roundIndex}.questions.${index}.text`)}
                  />
                )}
              </FormField>
              <div className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor={`report-r${roundIndex}-q-${index}-type`}>Type</Label>
                  <NativeSelect
                    id={`report-r${roundIndex}-q-${index}-type`}
                    {...register(`rounds.${roundIndex}.questions.${index}.type`)}
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
                    <Label htmlFor={`report-r${roundIndex}-q-${index}-topic`}>
                      Topic (optional)
                    </Label>
                    <Input
                      id={`report-r${roundIndex}-q-${index}-topic`}
                      {...register(`rounds.${roundIndex}.questions.${index}.topicLabel`, {
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
                    onQuestionRemoved?.();
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
  );
}
