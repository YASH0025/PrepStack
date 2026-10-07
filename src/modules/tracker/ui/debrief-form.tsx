"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type Control,
  type UseFormRegister,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { type z } from "zod";
import { CircleCheck, CircleDot, CircleX, Loader2, Plus, Trash2 } from "lucide-react";

import { FormField, applyServerErrors } from "@/components/rhf";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  SELF_RATINGS,
  SELF_RATING_LABELS,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

import { saveDebriefAction } from "../actions";
import { type DebriefFormValues, emptyQuestion } from "../debrief-defaults";
import { DebriefInputSchema } from "../debrief-schemas";

type DebriefOutput = z.output<typeof DebriefInputSchema>;

export const OTHER_TOPIC = "__other__";

const RATING_STYLE = {
  NAILED: {
    icon: CircleCheck,
    className:
      "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
  },
  PARTIAL: {
    icon: CircleDot,
    className:
      "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100",
  },
  MISSED: {
    icon: CircleX,
    className: "border-red-500 bg-red-50 text-red-900 dark:bg-red-950/50 dark:text-red-100",
  },
} as const;

/** Two-minute private debrief: questions with self-ratings first, details optional. */
export function DebriefForm({
  roundId,
  defaults,
  topics,
  stories,
  isNew,
}: {
  roundId: string;
  defaults: DebriefFormValues;
  topics: { id: string; name: string; category: string }[];
  stories: { id: string; title: string }[];
  isNew: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<DebriefFormValues, unknown, DebriefOutput>({
    resolver: zodResolver(DebriefInputSchema),
    defaultValues: defaults,
  });
  const { register, control, formState } = form;
  const errors = formState.errors;
  const questions = useFieldArray({ control, name: "questions" });
  const categories = [...new Set(topics.map((topic) => topic.category))];

  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      setMessage(null);
      const result = await saveDebriefAction(roundId, values);
      if (!result.ok) {
        applyServerErrors(result, form.setError);
        setMessage({ ok: false, text: result.error });
        return;
      }
      form.reset(form.getValues());
      const cards = result.data.cardsAdded;
      setMessage({
        ok: true,
        text: `Debrief saved.${cards ? ` ${cards} question${cards === 1 ? "" : "s"} added to review.` : ""} Weak topics now feed your roadmap.`,
      });
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }),
  );

  return (
    <form onSubmit={submit} className="grid gap-8" noValidate>
      {message && (
        <Alert variant={message.ok ? "success" : "destructive"}>
          <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {message.text}
            {message.ok && (
              <Link
                href={`/interviews/calendar?round=${roundId}`}
                className="font-medium underline"
              >
                Back to the round
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      <section className="grid gap-4" aria-labelledby="debrief-questions">
        <div className="flex items-end justify-between gap-2">
          <div className="grid gap-0.5">
            <h2 id="debrief-questions" className="text-base font-semibold">
              Questions you were asked
            </h2>
            <p className="text-sm text-muted-foreground">
              Rate each honestly. Partial and missed questions can go straight into review.
            </p>
          </div>
        </div>
        {questions.fields.length === 0 && (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No questions yet. Add the ones you remember, even roughly.
          </p>
        )}
        <ol className="grid gap-4">
          {questions.fields.map((field, index) => (
            <QuestionFields
              key={field.id}
              index={index}
              control={control}
              register={register}
              topics={topics}
              categories={categories}
              stories={stories}
              error={errors.questions?.[index]?.text?.message}
              onRemove={() => questions.remove(index)}
              onTopicChange={(value) =>
                form.setValue(`questions.${index}.topicId`, value === OTHER_TOPIC ? "" : value, {
                  shouldDirty: true,
                })
              }
            />
          ))}
        </ol>
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => questions.append(emptyQuestion())}
        >
          <Plus /> Add a question
        </Button>
      </section>

      <section className="grid gap-4" aria-labelledby="debrief-overall">
        <h2 id="debrief-overall" className="text-base font-semibold">
          Overall
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <ScalePicker
            label="How did it go?"
            name="overallRating"
            low="Badly"
            high="Great"
            register={register}
            error={errors.overallRating?.message}
          />
          <ScalePicker
            label="Difficulty"
            name="difficulty"
            low="Easy"
            high="Very hard"
            register={register}
            error={errors.difficulty?.message}
          />
          <FormField
            id="debrief-duration"
            label="Actual duration (minutes)"
            error={errors.actualDurationMinutes}
          >
            {(c) => (
              <Input
                {...c}
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                {...register("actualDurationMinutes", {
                  setValueAs: toNullableNumber,
                })}
              />
            )}
          </FormField>
        </div>
        <FormField id="debrief-feedback" label="Interviewer feedback, if any (private, encrypted)">
          {(c) => <Textarea {...c} rows={2} {...register("interviewerFeedback")} />}
        </FormField>
      </section>

      <details className="group rounded-xl border p-4">
        <summary className="cursor-pointer text-base font-semibold">
          Problem details (optional)
        </summary>
        <div className="mt-4 grid gap-4">
          <FormField id="debrief-coding" label="Coding problem">
            {(c) => (
              <Textarea
                {...c}
                rows={3}
                placeholder="Problem statement, constraints, your approach"
                {...register("codingProblem")}
              />
            )}
          </FormField>
          <FormField id="debrief-design" label="System design prompt">
            {(c) => <Textarea {...c} rows={3} {...register("systemDesignPrompt")} />}
          </FormField>
          <FormField id="debrief-takehome" label="Take-home assignment">
            {(c) => <Textarea {...c} rows={3} {...register("takeHome")} />}
          </FormField>
        </div>
      </details>

      <details className="group rounded-xl border p-4" open={!isNew}>
        <summary className="cursor-pointer text-base font-semibold">
          Reflection (optional, private)
        </summary>
        <div className="mt-4 grid gap-4">
          <FormField id="debrief-feeling" label="How it felt">
            {(c) => <Textarea {...c} rows={2} {...register("feeling")} />}
          </FormField>
          <FormField id="debrief-lessons" label="Lessons learned">
            {(c) => <Textarea {...c} rows={3} {...register("lessons")} />}
          </FormField>
          <FormField id="debrief-next" label="Next steps they mentioned">
            {(c) => <Textarea {...c} rows={2} {...register("nextSteps")} />}
          </FormField>
          <FormField id="debrief-actions" label="Your follow-up actions (one per line)">
            {(c) => (
              <Textarea
                {...c}
                rows={3}
                placeholder={"Send a thank-you note\nAsk HR for the timeline"}
                {...register("followUpActions")}
              />
            )}
          </FormField>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {isNew ? "Save debrief" : "Save changes"}
        </Button>
        <span className="text-xs text-muted-foreground">Private to you. Nothing is published.</span>
      </div>
    </form>
  );
}

function QuestionFields({
  index,
  control,
  register,
  topics,
  categories,
  stories,
  error,
  onRemove,
  onTopicChange,
}: {
  index: number;
  control: Control<DebriefFormValues, unknown, DebriefOutput>;
  register: UseFormRegister<DebriefFormValues>;
  topics: { id: string; name: string; category: string }[];
  categories: string[];
  stories: { id: string; title: string }[];
  error?: string;
  onRemove: () => void;
  onTopicChange: (value: string) => void;
}) {
  const question = useWatch({ control, name: `questions.${index}` });
  const [otherTopic, setOtherTopic] = useState(Boolean(question?.topicLabel) && !question?.topicId);
  const people = question?.type === "BEHAVIORAL" || question?.type === "HR";
  const rating = question?.selfRating;
  const base = `q-${index}`;

  return (
    <li className="grid gap-3 rounded-xl border p-4">
      <div className="flex items-start gap-2">
        <span className="mt-2 text-sm text-muted-foreground">{index + 1}.</span>
        <FormField
          id={`${base}-text`}
          label="Question"
          error={error ? { message: error } : undefined}
          className="flex-1"
        >
          {(c) => <Textarea {...c} rows={2} {...register(`questions.${index}.text`)} />}
        </FormField>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove question ${index + 1}`}
          onClick={onRemove}
          className="mt-6"
        >
          <Trash2 />
        </Button>
      </div>

      <fieldset className="grid gap-1.5">
        <legend className="text-sm font-medium">How did you answer?</legend>
        <div className="flex flex-wrap gap-2">
          {SELF_RATINGS.map((value) => {
            const { icon: Icon, className } = RATING_STYLE[value];
            return (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                  rating === value ? className : "hover:bg-accent/50",
                )}
              >
                <input
                  type="radio"
                  value={value}
                  className="sr-only"
                  {...register(`questions.${index}.selfRating`)}
                />
                <Icon className="size-4" aria-hidden />
                {SELF_RATING_LABELS[value]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id={`${base}-type`} label="Type">
          {(c) => (
            <NativeSelect {...c} {...register(`questions.${index}.type`)}>
              {QUESTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {QUESTION_TYPE_LABELS[type]}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        {!people && (
          <FormField id={`${base}-topic`} label="Topic">
            {(c) => (
              <NativeSelect
                {...c}
                value={otherTopic ? OTHER_TOPIC : String(question?.topicId ?? "")}
                onChange={(event) => {
                  setOtherTopic(event.target.value === OTHER_TOPIC);
                  onTopicChange(event.target.value);
                }}
              >
                <option value="">No topic</option>
                {categories.map((category) => (
                  <optgroup key={category} label={category}>
                    {topics
                      .filter((topic) => topic.category === category)
                      .map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
                <option value={OTHER_TOPIC}>Other (type it)</option>
              </NativeSelect>
            )}
          </FormField>
        )}
        {!people && otherTopic && (
          <FormField id={`${base}-label`} label="Topic name">
            {(c) => (
              <Input
                {...c}
                placeholder="e.g. GraphQL"
                {...register(`questions.${index}.topicLabel`)}
              />
            )}
          </FormField>
        )}
        {people && (
          <FormField id={`${base}-story`} label="Story you used">
            {(c) => (
              <NativeSelect {...c} {...register(`questions.${index}.linkedStoryId`)}>
                <option value="">None</option>
                {stories.map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.title}
                  </option>
                ))}
              </NativeSelect>
            )}
          </FormField>
        )}
      </div>

      {people && !question?.linkedStoryId && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            {...register(`questions.${index}.needsStory`)}
          />
          I need a better story for this
        </label>
      )}

      {rating !== "NAILED" && (
        <div className="grid gap-2 rounded-lg bg-muted/40 p-3">
          <FormField
            id={`${base}-notes`}
            label="What would a good answer cover? (optional)"
            hint="Becomes the answer side of the review card."
          >
            {(c) => <Textarea {...c} rows={2} {...register(`questions.${index}.answerNotes`)} />}
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              {...register(`questions.${index}.addToReview`)}
            />
            Add to spaced-repetition review
          </label>
        </div>
      )}
    </li>
  );
}

function ScalePicker({
  label,
  name,
  low,
  high,
  register,
  error,
}: {
  label: string;
  name: "overallRating" | "difficulty";
  low: string;
  high: string;
  register: UseFormRegister<DebriefFormValues>;
  error?: string;
}) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <label
            key={value}
            className="flex size-9 cursor-pointer items-center justify-center rounded-md border text-sm has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
          >
            <input type="radio" value={String(value)} className="sr-only" {...register(name)} />
            {value}
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        1 = {low}, 5 = {high}
      </p>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Empty inputs (and the initial null) stay null instead of becoming 0. */
function toNullableNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
