"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { type z } from "zod";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { applyServerErrors } from "@/components/rhf";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { type Role, type Track } from "@/modules/content/schemas";

import { saveProfileAction } from "../actions";
import { ProfileInputSchema } from "../schemas";
import { type ProfileFormValues, StackFields, TargetFields, TimeFields } from "./profile-fields";

const STEPS = [
  {
    title: "Your experience",
    description: "This sets how deep each topic needs to go for you.",
    fields: ["displayName", "yearsOfExperience", "stack"] as const,
  },
  {
    title: "Your target",
    description: "Topics are weighted by the role you are aiming for.",
    fields: ["trackId", "targetRoleId", "targetCompanies"] as const,
  },
  {
    title: "Your time",
    description: "The plan only includes what fits; anything skipped is shown with a reason.",
    fields: ["prepWindowDays", "dailyHours", "timezone"] as const,
  },
];

export function OnboardingWizard({
  tracks,
  roles,
  defaults,
}: {
  tracks: Track[];
  roles: Role[];
  defaults: Partial<ProfileFormValues>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ProfileFormValues, unknown, z.output<typeof ProfileInputSchema>>({
    resolver: zodResolver(ProfileInputSchema),
    mode: "onTouched",
    defaultValues: {
      displayName: "",
      stack: [],
      targetCompanies: [],
      prepWindowDays: 30,
      dailyHours: 2,
      timezone: "Asia/Kolkata",
      trackId: tracks[0]?.id ?? "",
      targetRoleId: "",
      ...defaults,
    },
  });

  // Use the browser's timezone when the user has not chosen one yet.
  useEffect(() => {
    if (!defaults.timezone) {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) form.setValue("timezone", detected);
    }
  }, [defaults.timezone, form]);

  const current = STEPS[step] ?? STEPS[0];

  const next = async () => {
    const valid = await form.trigger([...(current?.fields ?? [])]);
    if (valid) setStep((value) => Math.min(value + 1, STEPS.length - 1));
  };

  const submit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await saveProfileAction(values, { completeOnboarding: true });
      if (!result.ok) {
        setFormError(result.error);
        applyServerErrors(result, form.setError);
        return;
      }
      router.push("/onboarding/next");
    });
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (step < STEPS.length - 1) void next();
        else void submit(event);
      }}
      className="grid gap-6"
      noValidate
    >
      <div className="grid gap-2">
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
        <Progress value={((step + 1) / STEPS.length) * 100} aria-label="Onboarding progress" />
      </div>
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{current?.title}</h1>
        <p className="text-sm text-muted-foreground">{current?.description}</p>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {step === 0 && <StackFields form={form} />}
      {step === 1 && <TargetFields form={form} tracks={tracks} roles={roles} />}
      {step === 2 && <TimeFields form={form} />}

      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((value) => Math.max(0, value - 1))}
          disabled={step === 0 || pending}
        >
          <ArrowLeft /> Back
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {step < STEPS.length - 1 ? (
            <>
              Continue <ArrowRight />
            </>
          ) : (
            "Finish"
          )}
        </Button>
      </div>
    </form>
  );
}
