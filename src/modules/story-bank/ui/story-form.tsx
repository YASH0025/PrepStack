"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { type z } from "zod";
import { Loader2, Trash2 } from "lucide-react";

import { FormField, applyServerErrors } from "@/components/rhf";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type Competency } from "@/modules/content/schemas";

import { deleteStoryAction, saveStoryAction } from "../actions";
import { STORY_STATUSES, STORY_STATUS_LABELS, StoryInputSchema } from "../schemas";

export type StoryFormValues = z.input<typeof StoryInputSchema>;

const STAR_FIELDS = [
  {
    name: "situation",
    label: "Situation",
    hint: "One or two sentences of context: team, product, what was at stake.",
    rows: 3,
  },
  { name: "task", label: "Task", hint: "What you were responsible for.", rows: 2 },
  {
    name: "action",
    label: "Action",
    hint: "What YOU did, step by step. This should be the longest part.",
    rows: 6,
  },
  { name: "result", label: "Result", hint: "The outcome, ideally with a number.", rows: 3 },
] as const;

/** STAR story editor (React Hook Form + Zod). */
export function StoryForm({
  storyId,
  defaults,
  competencies,
}: {
  storyId: string | null;
  defaults: StoryFormValues;
  competencies: Competency[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<StoryFormValues, unknown, z.output<typeof StoryInputSchema>>({
    resolver: zodResolver(StoryInputSchema),
    mode: "onTouched",
    defaultValues: defaults,
  });
  const { register, control, formState, watch } = form;
  const errors = formState.errors;
  const status = watch("status");
  const action = watch("action") ?? "";

  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      setMessage(null);
      const result = await saveStoryAction(storyId, values);
      if (!result.ok) {
        applyServerErrors(result, form.setError);
        setMessage({ ok: false, text: result.error });
        return;
      }
      if (!storyId) {
        router.replace(`/practice/stories/${result.data.id}?saved=1`);
        return;
      }
      form.reset(form.getValues());
      setMessage({ ok: true, text: "Story saved." });
      router.refresh();
    }),
  );

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      {message && (
        <Alert variant={message.ok ? "success" : "destructive"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_16rem]">
        <FormField
          id="story-title"
          label="Title"
          error={errors.title}
          hint="Short and memorable, e.g. “Payments outage at midnight”."
        >
          {(c) => <Input {...c} {...register("title")} />}
        </FormField>
        <FormField id="story-project" label="Project (optional)" error={errors.projectRef}>
          {(c) => <Input {...c} placeholder="e.g. Checkout revamp" {...register("projectRef")} />}
        </FormField>
      </div>

      {STAR_FIELDS.map((field) => (
        <FormField
          key={field.name}
          id={`story-${field.name}`}
          label={field.label}
          hint={field.hint}
          error={errors[field.name]}
        >
          {(c) => <Textarea {...c} rows={field.rows} {...register(field.name)} />}
        </FormField>
      ))}
      {action.length > 0 && action.length < 200 && (
        <p className="-mt-3 text-xs text-muted-foreground">
          Tip: interviewers probe the Action. Most strong answers spend 60–70% of the time here.
        </p>
      )}

      <FormField
        id="story-impact"
        label="Measurable impact (optional)"
        error={errors.impact}
        hint="One line, e.g. “Cut p95 latency from 900 ms to 250 ms”."
      >
        {(c) => <Input {...c} {...register("impact")} />}
      </FormField>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Competencies it shows</legend>
        <Controller
          control={control}
          name="competencies"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {competencies.map((competency) => {
                const checked = field.value?.includes(competency.slug) ?? false;
                return (
                  <label
                    key={competency.slug}
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                      checked ? "border-primary bg-primary/10 font-medium" : "hover:bg-accent/50",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={(event) =>
                        field.onChange(
                          event.target.checked
                            ? [...(field.value ?? []), competency.slug]
                            : (field.value ?? []).filter((slug) => slug !== competency.slug),
                        )
                      }
                    />
                    {checked && <span aria-hidden>✓</span>}
                    {competency.name}
                  </label>
                );
              })}
            </div>
          )}
        />
        {errors.competencies?.message && (
          <p className="text-xs text-destructive" role="alert">
            {errors.competencies.message}
          </p>
        )}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Status</legend>
        <div className="flex flex-wrap gap-2">
          {STORY_STATUSES.map((value) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                status === value ? "border-primary bg-primary/5 font-medium" : "hover:bg-accent/50",
              )}
            >
              <input
                type="radio"
                value={value}
                className="accent-primary"
                {...register("status")}
              />
              {STORY_STATUS_LABELS[value]}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Ready: complete and usable in an interview. Practiced: you have said it out loud.
        </p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending || (storyId !== null && !formState.isDirty)}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {storyId ? "Save story" : "Create story"}
        </Button>
        {storyId && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Delete this story?")) return;
              startTransition(async () => {
                await deleteStoryAction(storyId);
                router.replace("/practice/stories");
              });
            }}
          >
            <Trash2 /> Delete
          </Button>
        )}
      </div>
    </form>
  );
}
