"use client";

import * as React from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { type z } from "zod";

import { FormField } from "@/components/rhf";
import { TagInput } from "@/components/tag-input";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { BAND_LABELS, bandForYears } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { type Role, type Track } from "@/modules/content/schemas";

import { PREP_WINDOW_PRESETS, type ProfileInputSchema, STACK_OPTIONS } from "../schemas";

export type ProfileFormValues = z.input<typeof ProfileInputSchema>;
type Form = UseFormReturn<ProfileFormValues, unknown, z.output<typeof ProfileInputSchema>>;

/** Step 1: current stack and experience. */
export function StackFields({ form }: { form: Form }) {
  const { register, control, watch, formState } = form;
  const years = watch("yearsOfExperience");
  const band = typeof years === "number" && !Number.isNaN(years) ? bandForYears(years) : null;
  return (
    <div className="grid gap-5">
      <FormField id="displayName" label="Your name (optional)" error={formState.errors.displayName}>
        {(control) => <Input {...control} autoComplete="name" {...register("displayName")} />}
      </FormField>
      <FormField
        id="yearsOfExperience"
        label="Years of professional experience"
        hint={band ? `Experience band: ${BAND_LABELS[band]}` : "Decimals are fine, e.g. 3.5"}
        error={formState.errors.yearsOfExperience}
      >
        {(control) => (
          <Input
            {...control}
            type="number"
            step="0.5"
            min="0"
            max="40"
            inputMode="decimal"
            className="max-w-32"
            {...register("yearsOfExperience", { valueAsNumber: true })}
          />
        )}
      </FormField>
      <Controller
        control={control}
        name="stack"
        render={({ field, fieldState }) => (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Your current stack</legend>
            <div className="flex flex-wrap gap-2">
              {STACK_OPTIONS.map((option) => {
                const selected = field.value?.includes(option) ?? false;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      field.onChange(
                        selected
                          ? (field.value ?? []).filter((item) => item !== option)
                          : [...(field.value ?? []), option],
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent",
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <TagInput
              id="stack-other"
              ariaLabel="Other technologies"
              value={(field.value ?? []).filter(
                (item) => !(STACK_OPTIONS as readonly string[]).includes(item),
              )}
              onChange={(others) =>
                field.onChange([
                  ...(field.value ?? []).filter((item) =>
                    (STACK_OPTIONS as readonly string[]).includes(item),
                  ),
                  ...others,
                ])
              }
              placeholder="Something else? Type and press Enter"
              invalid={Boolean(fieldState.error)}
            />
            {fieldState.error?.message && (
              <p className="text-xs text-destructive">{fieldState.error.message}</p>
            )}
          </fieldset>
        )}
      />
    </div>
  );
}

/** Step 2: target role and optional companies. */
export function TargetFields({
  form,
  tracks,
  roles,
}: {
  form: Form;
  tracks: Track[];
  roles: Role[];
}) {
  const { register, control, watch, setValue, formState } = form;
  const trackId = watch("trackId");
  const trackRoles = roles.filter((role) => role.trackId === trackId);
  return (
    <div className="grid gap-5">
      {tracks.length > 1 && (
        <FormField id="trackId" label="Track" error={formState.errors.trackId}>
          {(control) => (
            <NativeSelect
              {...control}
              {...register("trackId", {
                onChange: () => setValue("targetRoleId", ""),
              })}
            >
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      )}
      <Controller
        control={control}
        name="targetRoleId"
        render={({ field, fieldState }) => (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Target role</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {trackRoles.map((role) => (
                <label
                  key={role.id}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition-colors has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50",
                    field.value === role.id ? "border-primary bg-primary/5" : "hover:bg-accent/50",
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={field.name}
                    value={role.id}
                    checked={field.value === role.id}
                    onChange={() => field.onChange(role.id)}
                    onBlur={field.onBlur}
                  />
                  <span className="font-medium">{role.name}</span>
                  <span className="text-xs text-muted-foreground">{role.description}</span>
                </label>
              ))}
            </div>
            {fieldState.error?.message && (
              <p className="text-xs text-destructive" role="alert">
                {fieldState.error.message}
              </p>
            )}
          </fieldset>
        )}
      />
      <Controller
        control={control}
        name="targetCompanies"
        render={({ field, fieldState }) => (
          <FormField
            id="targetCompanies"
            label="Target companies (optional)"
            hint="Used to surface community reports for these companies. Press Enter after each."
            error={fieldState.error}
          >
            {(control) => (
              <TagInput
                id={control.id}
                describedBy={control["aria-describedby"]}
                invalid={control["aria-invalid"]}
                value={field.value ?? []}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="e.g. Razorpay, Atlassian"
              />
            )}
          </FormField>
        )}
      />
    </div>
  );
}

/** Step 3: time available. */
export function TimeFields({ form }: { form: Form }) {
  const { register, control, watch, formState } = form;
  const days = watch("prepWindowDays");
  const hours = watch("dailyHours");
  const total =
    typeof days === "number" && typeof hours === "number" && !Number.isNaN(days * hours)
      ? Math.round(days * hours)
      : null;
  const timezones = React.useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return ["UTC", "Asia/Kolkata"];
    }
  }, []);

  return (
    <div className="grid gap-5">
      <Controller
        control={control}
        name="prepWindowDays"
        render={({ field, fieldState }) => (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Total prep window</legend>
            <div className="flex flex-wrap items-center gap-2">
              {PREP_WINDOW_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={field.value === preset}
                  onClick={() => field.onChange(preset)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    field.value === preset
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-accent",
                  )}
                >
                  {preset} days
                </button>
              ))}
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                or
                <Input
                  type="number"
                  min="7"
                  max="180"
                  aria-label="Custom number of days"
                  className="h-8 w-20"
                  value={
                    field.value && !(PREP_WINDOW_PRESETS as readonly number[]).includes(field.value)
                      ? field.value
                      : ""
                  }
                  onChange={(event) =>
                    field.onChange(
                      event.target.value === "" ? undefined : Number(event.target.value),
                    )
                  }
                  onBlur={field.onBlur}
                />
                days
              </label>
            </div>
            {fieldState.error?.message && (
              <p className="text-xs text-destructive" role="alert">
                {fieldState.error.message}
              </p>
            )}
          </fieldset>
        )}
      />
      <FormField
        id="dailyHours"
        label="Hours you can study per day"
        hint={
          total !== null
            ? `About ${total} hours in total. The roadmap will only plan what fits.`
            : "Be realistic; the plan is honest about what fits."
        }
        error={formState.errors.dailyHours}
      >
        {(control) => (
          <Input
            {...control}
            type="number"
            step="0.5"
            min="0.5"
            max="12"
            inputMode="decimal"
            className="max-w-32"
            {...register("dailyHours", { valueAsNumber: true })}
          />
        )}
      </FormField>
      <FormField
        id="timezone"
        label="Your timezone"
        hint="Interview times and reminders use this."
        error={formState.errors.timezone}
      >
        {(control) => (
          <NativeSelect {...control} {...register("timezone")}>
            {timezones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </NativeSelect>
        )}
      </FormField>
    </div>
  );
}
