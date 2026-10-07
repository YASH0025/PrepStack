"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { type z } from "zod";
import { Loader2 } from "lucide-react";

import { FormField, applyServerErrors } from "@/components/rhf";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

import { clearNoticePlanAction, saveNoticePlanAction } from "../actions";
import {
  NoticePlanInputSchema,
  RESIGNATION_STATES,
  RESIGNATION_STATE_LABELS,
  TRI_STATE_LABELS,
} from "../schemas";

/** Form values as the inputs hold them (dates as strings, "" when empty). */
export type NoticeFormValues = z.input<typeof NoticePlanInputSchema>;

const TRI_OPTIONS = (["YES", "NO", "UNSURE"] as const).map((value) => ({
  value,
  label: TRI_STATE_LABELS[value],
}));

export function NoticeForm({
  defaults,
  hasPlan,
}: {
  defaults: NoticeFormValues;
  hasPlan: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<NoticeFormValues, unknown, z.output<typeof NoticePlanInputSchema>>({
    resolver: zodResolver(NoticePlanInputSchema),
    mode: "onTouched",
    defaultValues: defaults,
  });
  const { register, formState } = form;
  const errors = formState.errors;
  const state = useWatch({ control: form.control, name: "resignationState" });

  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      setMessage(null);
      const result = await saveNoticePlanAction(values);
      if (!result.ok) {
        applyServerErrors(result, form.setError);
        setMessage({ ok: false, text: result.error });
        return;
      }
      form.reset(form.getValues());
      setMessage({ ok: true, text: "Saved. Your roadmap was re-planned around this timeline." });
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

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Where are you right now?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {RESIGNATION_STATES.map((value) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                state === value ? "border-primary bg-primary/5 font-medium" : "hover:bg-accent/50",
              )}
            >
              <input
                type="radio"
                value={value}
                className="accent-primary"
                {...register("resignationState")}
              />
              {RESIGNATION_STATE_LABELS[value]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {state !== "RELIEVED" && (
          <FormField
            id="notice-days"
            label="Notice period (days)"
            error={errors.noticeDays}
            hint={
              state === "NOT_RESIGNED"
                ? "Optional. Shows when you would be free if you resigned today."
                : undefined
            }
          >
            {(control) => (
              <Input
                {...control}
                type="number"
                inputMode="numeric"
                min={0}
                max={365}
                placeholder="e.g. 60"
                {...register("noticeDays", {
                  setValueAs: toNullableNumber,
                })}
              />
            )}
          </FormField>
        )}
        {state === "SERVING" && (
          <FormField id="resignation-date" label="Resignation date" error={errors.resignationDate}>
            {(control) => <Input {...control} type="date" {...register("resignationDate")} />}
          </FormField>
        )}
        {state !== "RELIEVED" && (
          <>
            <FormField id="buyout" label="Is a notice buyout possible?">
              {(control) => (
                <NativeSelect {...control} {...register("buyout")}>
                  {TRI_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField id="early-release" label="Is early release negotiable?">
              {(control) => (
                <NativeSelect {...control} {...register("earlyRelease")}>
                  {TRI_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
          </>
        )}
        <FormField
          id="target-from"
          label="Target joining window: from (optional)"
          error={errors.targetJoiningFrom}
        >
          {(control) => <Input {...control} type="date" {...register("targetJoiningFrom")} />}
        </FormField>
        <FormField
          id="target-to"
          label="Target joining window: to (optional)"
          error={errors.targetJoiningTo}
        >
          {(control) => <Input {...control} type="date" {...register("targetJoiningTo")} />}
        </FormField>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending || (hasPlan && !formState.isDirty)}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {hasPlan ? "Save changes" : "Create my notice plan"}
        </Button>
        {hasPlan && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Remove your notice plan? Your roadmap will be re-planned."))
                return;
              startTransition(async () => {
                await clearNoticePlanAction();
                router.refresh();
              });
            }}
          >
            Remove plan
          </Button>
        )}
      </div>
    </form>
  );
}

/** Empty inputs (and the initial null) stay null instead of becoming 0. */
function toNullableNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
