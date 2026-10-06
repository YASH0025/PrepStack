"use client";

import * as React from "react";
import {
  type FieldError,
  type FieldValues,
  type Path,
  type UseFormSetError,
} from "react-hook-form";

import { Label } from "@/components/ui/label";
import { type ActionResult } from "@/lib/forms";
import { cn } from "@/lib/utils";

/**
 * Layout wrapper for a React Hook Form field: label, control, hint and error,
 * with ids wired for accessibility. The control is passed as children and
 * should use `id`, `aria-invalid` and `aria-describedby` from the render prop.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: FieldError | { message?: string };
  className?: string;
  children: (control: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error?.message ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        "aria-invalid": error?.message ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })}
      {hint && !error?.message && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error?.message && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}

/** Copies server-side field errors from an ActionResult into React Hook Form. */
export function applyServerErrors<T extends FieldValues>(
  result: ActionResult<unknown>,
  setError: UseFormSetError<T>,
): void {
  if (result.ok || !result.fieldErrors) return;
  for (const [field, messages] of Object.entries(result.fieldErrors)) {
    if (field === "_form" || !messages[0]) continue;
    setError(field as Path<T>, { type: "server", message: messages[0] });
  }
}
