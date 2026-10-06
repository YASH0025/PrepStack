"use server";

import { redirect } from "next/navigation";

import { type FormState, fieldErrorsFrom, formDataToObject } from "@/lib/forms";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";

import {
  ChangePasswordInputSchema,
  LoginInputSchema,
  RequestResetInputSchema,
  ResetPasswordInputSchema,
  SignupInputSchema,
} from "./schemas";
import {
  clientIp,
  endSession,
  getAuthCore,
  requireUser,
  safeNextPath,
  startSession,
} from "./service";

const tooMany = (seconds: number): FormState => ({
  error: `Too many attempts. Try again in ${Math.ceil(seconds / 60)} minute(s).`,
});

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = SignupInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const limit = rateLimit(`signup:${await clientIp()}`, RATE_LIMITS.signup);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  const result = await getAuthCore().signup(parsed.data);
  if (!result.ok) {
    return { fieldErrors: { email: ["An account with this email already exists"] } };
  }
  await startSession(result.user);
  redirect("/onboarding");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const parsed = LoginInputSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const limit = rateLimit(`login:${await clientIp()}:${parsed.data.email}`, RATE_LIMITS.login);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  const user = await getAuthCore().login(parsed.data);
  if (!user) return { error: "Incorrect email or password" };

  await startSession(user);
  redirect(safeNextPath(raw.next));
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = RequestResetInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const limit = rateLimit(
    `reset:${await clientIp()}:${parsed.data.email}`,
    RATE_LIMITS.passwordReset,
  );
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  await getAuthCore().requestPasswordReset(parsed.data.email);
  return {
    ok: true,
    message: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = ResetPasswordInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const limit = rateLimit(`reset-confirm:${await clientIp()}`, RATE_LIMITS.passwordReset);
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  const done = await getAuthCore().resetPassword(parsed.data);
  if (!done) return { error: "This reset link is invalid or has expired. Request a new one." };
  redirect("/login?reset=1");
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const sessionUser = await requireUser();
  const parsed = ChangePasswordInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  const { result, user } = await getAuthCore().changePassword(
    sessionUser.id,
    parsed.data.currentPassword,
    parsed.data.password,
  );
  if (result === "WRONG_PASSWORD") {
    return { fieldErrors: { currentPassword: ["Current password is incorrect"] } };
  }
  if (result !== "OK" || !user) return { error: "Could not change password" };
  // Other sessions are invalidated by the version bump; keep this one signed in.
  await startSession(user);
  return { ok: true, message: "Password changed. Other devices have been signed out." };
}
