"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { type z } from "zod";
import { Loader2 } from "lucide-react";

import { applyServerErrors } from "@/components/rhf";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { type Role, type Track } from "@/modules/content/schemas";

import { saveProfileAction } from "../actions";
import { ProfileInputSchema } from "../schemas";
import { type ProfileFormValues, StackFields, TargetFields, TimeFields } from "./profile-fields";

/** Edit-profile form: the onboarding fields on one page. */
export function ProfileForm({
  tracks,
  roles,
  defaults,
}: {
  tracks: Track[];
  roles: Role[];
  defaults: ProfileFormValues;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<ProfileFormValues, unknown, z.output<typeof ProfileInputSchema>>({
    resolver: zodResolver(ProfileInputSchema),
    mode: "onTouched",
    defaultValues: defaults,
  });

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await saveProfileAction(values);
      if (!result.ok) {
        applyServerErrors(result, form.setError);
        setMessage({ ok: false, text: result.error });
        return;
      }
      form.reset(values);
      setMessage({
        ok: true,
        text: "Profile saved. Re-plan your roadmap to apply the changes.",
      });
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-6" noValidate>
      {message && (
        <Alert variant={message.ok ? "success" : "destructive"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      <StackFields form={form} />
      <Separator />
      <TargetFields form={form} tracks={tracks} roles={roles} />
      <Separator />
      <TimeFields form={form} />
      <div>
        <Button type="submit" disabled={pending || !form.formState.isDirty}>
          {pending && <Loader2 className="animate-spin" />}
          Save profile
        </Button>
      </div>
    </form>
  );
}
