"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, useForm } from "react-hook-form";
import { Loader2, Trash2 } from "lucide-react";

import { FormField, applyServerErrors } from "@/components/rhf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { deleteAccountAction } from "../actions";
import { type DeleteAccountInput, DeleteAccountInputSchema } from "../schemas";

interface Values {
  password: string;
  reports: DeleteAccountInput["reports"];
  confirm: string;
}

export function DeleteAccountForm({
  sharedCount,
  hasPassword = true,
}: {
  sharedCount: number;
  /** False for Google/GitHub-only accounts: nothing to re-check. */
  hasPassword?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(DeleteAccountInputSchema) as unknown as Resolver<Values>,
    defaultValues: { password: "", reports: "ANONYMIZE", confirm: "" },
  });
  const errors = form.formState.errors;

  if (!open) {
    return (
      <Button variant="outline" className="w-fit text-destructive" onClick={() => setOpen(true)}>
        <Trash2 /> Delete my account
      </Button>
    );
  }

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      setError(null);
      const result = await deleteAccountAction(values as DeleteAccountInput);
      // On success the action redirects; we only get here on failure.
      if (result && !result.ok) {
        applyServerErrors(result, form.setError);
        if (!result.fieldErrors) setError(result.error);
      }
    }),
  );

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-lg border border-destructive/40 p-4"
      noValidate
    >
      <p className="text-sm">
        This permanently deletes your profile, roadmap, tracker, debriefs, stories, review cards and
        every other private record. It cannot be undone. Download your data first if you want a
        copy.
      </p>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">
          Reports you shared with the community{sharedCount ? ` (${sharedCount})` : ""}
        </legend>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" value="ANONYMIZE" className="mt-1" {...form.register("reports")} />
          <span>
            <span className="font-medium">Keep them anonymously.</span>{" "}
            <span className="text-muted-foreground">
              They already contain nothing that links to you and keep helping others.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" value="REMOVE" className="mt-1" {...form.register("reports")} />
          <span>
            <span className="font-medium">Delete them too.</span>
          </span>
        </label>
      </fieldset>
      {hasPassword && (
        <FormField id="delete-password" label="Your password" error={errors.password}>
          {(props) => (
            <Input
              {...props}
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
          )}
        </FormField>
      )}
      <FormField
        id="delete-confirm"
        label={
          <>
            Type <span className="font-mono">DELETE</span> to confirm
          </>
        }
        error={errors.confirm}
      >
        {(props) => <Input {...props} autoComplete="off" {...form.register("confirm")} />}
      </FormField>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Delete account permanently
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
