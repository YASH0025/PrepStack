"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormMessage, SubmitButton, TextField } from "@/components/form-bits";
import { initialFormState } from "@/lib/forms";

import {
  changePasswordAction,
  loginAction,
  requestPasswordResetAction,
  resetPasswordAction,
  signupAction,
} from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, initialFormState);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        key={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <TextField
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
      />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-muted-foreground hover:underline">
          Forgot password?
        </Link>
      </div>
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signupAction, initialFormState);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        key={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <TextField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        errors={state.fieldErrors?.password}
      />
      <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, initialFormState);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        key={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initialFormState);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <TextField
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
        errors={state.fieldErrors?.password}
      />
      <TextField
        name="confirm"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirm}
      />
      <SubmitButton pendingText="Saving…">Set new password</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initialFormState);
  return (
    <form action={action} className="grid max-w-sm gap-4" noValidate>
      <FormMessage state={state} />
      <TextField
        name="currentPassword"
        label="Current password"
        type="password"
        autoComplete="current-password"
        errors={state.fieldErrors?.currentPassword}
      />
      <TextField
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        errors={state.fieldErrors?.password}
      />
      <TextField
        name="confirm"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        errors={state.fieldErrors?.confirm}
      />
      <SubmitButton pendingText="Saving…" className="w-fit">
        Change password
      </SubmitButton>
    </form>
  );
}
