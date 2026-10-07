"use server";

import { redirect } from "next/navigation";

import { type FormState, echoValues, fieldErrorsFrom, formDataToObject } from "@/lib/forms";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";

import {
  ChangePasswordInputSchema,
  LoginInputSchema,
  RequestResetInputSchema,
  ResetPasswordInputSchema,
  SignupInputSchema,
} from "./schemas";
import { type SocialProvider } from "./backend";
import { clientIp, getAuth, requireUser, safeNextPath } from "./service";

const tooMany = (seconds: number): FormState => ({
  error: `Too many attempts. Try again in ${Math.ceil(seconds / 60)} minute(s).`,
});

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData, ["email"]);
  const parsed = SignupInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { values, fieldErrors: fieldErrorsFrom(parsed.error) };

  const limit = rateLimit(`signup:${await clientIp()}`, RATE_LIMITS.signup);
  if (!limit.ok) return { values, ...tooMany(limit.retryAfterSeconds) };

  const auth = await getAuth();
  const result = await auth.register(parsed.data);
  if (!result.ok) {
    return { values, fieldErrors: { email: ["An account with this email already exists"] } };
  }
  await auth.signIn(parsed.data);
  redirect("/onboarding");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formDataToObject(formData);
  const values = echoValues(formData, ["email"]);
  const parsed = LoginInputSchema.safeParse(raw);
  if (!parsed.success) return { values, fieldErrors: fieldErrorsFrom(parsed.error) };

  const limit = rateLimit(`login:${await clientIp()}:${parsed.data.email}`, RATE_LIMITS.login);
  if (!limit.ok) return { values, ...tooMany(limit.retryAfterSeconds) };

  const user = await (await getAuth()).signIn(parsed.data);
  if (!user) return { values, error: "Incorrect email or password" };
  redirect(safeNextPath(raw.next));
}

export async function logoutAction(): Promise<void> {
  await (await getAuth()).signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = echoValues(formData, ["email"]);
  const parsed = RequestResetInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { values, fieldErrors: fieldErrorsFrom(parsed.error) };

  const limit = rateLimit(
    `reset:${await clientIp()}:${parsed.data.email}`,
    RATE_LIMITS.passwordReset,
  );
  if (!limit.ok) return tooMany(limit.retryAfterSeconds);

  await (await getAuth()).requestPasswordReset(parsed.data.email);
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

  const done = await (await getAuth()).resetPassword(parsed.data);
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

  const result = await (
    await getAuth()
  ).changePassword(sessionUser.id, parsed.data.currentPassword, parsed.data.password);
  if (result === "WRONG_PASSWORD") {
    return { fieldErrors: { currentPassword: ["Current password is incorrect"] } };
  }
  if (result !== "OK") return { error: "Could not change password" };
  return { ok: true, message: "Password changed. Other devices have been signed out." };
}

/** "Continue with Google/GitHub" (Postgres mode, provider configured). */
export async function socialSignInAction(formData: FormData): Promise<void> {
  const provider = formData.get("provider");
  const auth = await getAuth();
  if (provider !== "google" && provider !== "github") redirect("/login");
  if (!auth.socialProviders().includes(provider as SocialProvider)) redirect("/login");
  const limit = rateLimit(`social:${await clientIp()}`, RATE_LIMITS.login);
  if (!limit.ok) redirect("/login");
  const url = await auth.socialSignInUrl(
    provider as SocialProvider,
    safeNextPath(formData.get("next")),
  );
  redirect(url);
}
