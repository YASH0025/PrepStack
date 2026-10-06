import { z } from "zod";

import { IsoDateTimeSchema, recordSchema } from "@/lib/storage/types";

export const RoleSchema = z.enum(["user", "admin"]);
export type Role = z.infer<typeof RoleSchema>;

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254));

export const PasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters");

export const UserSchema = recordSchema({
  email: z.email().refine((value) => value === value.toLowerCase(), "email must be lowercase"),
  passwordHash: z.string().min(20),
  role: RoleSchema,
  /** Incremented to invalidate every existing session (password reset/change). */
  sessionVersion: z.number().int().nonnegative(),
  /** SHA-256 of the reset token; the raw token is only ever in the emailed link. */
  resetTokenHash: z.string().nullable(),
  resetTokenExpiresAt: IsoDateTimeSchema.nullable(),
  disabled: z.boolean(),
  lastLoginAt: IsoDateTimeSchema.nullable(),
});
export type User = z.infer<typeof UserSchema>;

/** What the rest of the app sees about the signed-in user. Never includes secrets. */
export interface SessionUser {
  id: string;
  email: string;
  role: Role;
}

export const SignupInputSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export const LoginInputSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Enter your password").max(128),
});

export const RequestResetInputSchema = z.object({ email: EmailSchema });

export const ResetPasswordInputSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: PasswordSchema,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

export const ChangePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    password: PasswordSchema,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });
