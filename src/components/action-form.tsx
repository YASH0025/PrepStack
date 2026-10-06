"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { FormMessage } from "@/components/form-bits";
import { Button } from "@/components/ui/button";
import { type FormState, initialFormState } from "@/lib/forms";
import { cn } from "@/lib/utils";

/**
 * Form bound to a server action. Submits through a transition instead of the
 * `action` prop, so React does not reset the fields afterwards: input survives
 * validation errors. Server-rendered fields can be passed as children.
 */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  pendingLabel = "Saving…",
  className,
  footer,
  resetOnSuccess = false,
  submitVariant,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  className?: string;
  footer?: React.ReactNode;
  resetOnSuccess?: boolean;
  submitVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const formRef = React.useRef<HTMLFormElement>(null);
  const fieldErrors = Object.entries(state.fieldErrors ?? {}).filter(
    ([, errors]) => errors?.length,
  );

  React.useEffect(() => {
    if (resetOnSuccess && state.ok) formRef.current?.reset();
  }, [resetOnSuccess, state]);

  return (
    <form
      ref={formRef}
      className={cn("grid gap-4", className)}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        React.startTransition(() => formAction(formData));
      }}
    >
      <FormMessage state={state} />
      {fieldErrors.length > 0 && (
        <ul
          className="grid gap-1 rounded-md border border-destructive/40 p-3 text-sm text-destructive"
          role="alert"
        >
          {fieldErrors.map(([field, errors]) => (
            <li key={field}>
              <span className="font-medium">{field}</span>: {errors?.[0]}
            </li>
          ))}
        </ul>
      )}
      {children}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending} variant={submitVariant}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? pendingLabel : submitLabel}
        </Button>
        {footer}
      </div>
    </form>
  );
}
