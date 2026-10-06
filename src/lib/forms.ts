import { type z } from "zod";

/** State returned by server actions used with `useActionState`. */
export interface FormState {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Submitted (non-secret) values, echoed back so fields survive React's post-action form reset. */
  values?: Record<string, string>;
}

/** Picks string values for the given keys from FormData. Never pass password fields. */
export function echoValues(formData: FormData, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = formData.get(key);
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

export const initialFormState: FormState = {};

/** Converts FormData into a plain object (repeated keys become arrays). */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    const existing = result[key];
    if (existing === undefined) result[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else result[key] = [existing, value];
  }
  return result;
}

export function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Result type for server actions called directly from client components. */
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function ok<T>(data: T): ActionResult<T>;
export function ok(): ActionResult<undefined>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}
