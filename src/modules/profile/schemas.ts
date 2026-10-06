import { z } from "zod";

import { ExperienceBandSchema } from "@/lib/domain";
import { IsoDateTimeSchema, recordSchema } from "@/lib/storage/types";

/** IANA timezone names accepted by Intl (e.g. "Asia/Kolkata"). */
export const TimezoneSchema = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, "Unknown timezone");

export const PREP_WINDOW_PRESETS = [7, 15, 30, 60, 90] as const;

export const STACK_OPTIONS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "NestJS",
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "Redis",
  "GraphQL",
  "AWS",
  "Docker",
  "Angular",
  "Vue",
  "Java",
  "Python",
] as const;

const tagList = (max: number) =>
  z
    .array(z.string().trim().min(1).max(60))
    .max(max)
    .transform((values) => [...new Set(values)]);

/** Default reminder offsets for interview rounds: 1 day and 1 hour before. */
export const DEFAULT_REMINDER_MINUTES = [24 * 60, 60];

export const ProfileSchema = recordSchema({
  displayName: z.string().max(80),
  stack: z.array(z.string().min(1).max(60)).max(30),
  yearsOfExperience: z.number().min(0).max(40),
  experienceBand: ExperienceBandSchema,
  trackId: z.uuid(),
  targetRoleId: z.uuid(),
  targetCompanies: z.array(z.string().min(1).max(80)).max(30),
  prepWindowDays: z.number().int().min(7).max(180),
  dailyHours: z.number().min(0.5).max(12),
  timezone: TimezoneSchema,
  reminderMinutes: z
    .array(
      z
        .number()
        .int()
        .min(5)
        .max(7 * 24 * 60),
    )
    .max(5),
  reviewDailyCap: z.number().int().min(5).max(200),
  onboardingCompletedAt: IsoDateTimeSchema.nullable(),
});
export type Profile = z.infer<typeof ProfileSchema>;

/**
 * Onboarding / profile form input. Shared by the client form (React Hook Form
 * resolver) and the server action, so both validate exactly the same way.
 */
export const ProfileInputSchema = z.object({
  displayName: z.string().trim().max(80),
  stack: tagList(30),
  yearsOfExperience: z.number({ error: "Enter your years of experience" }).min(0).max(40),
  trackId: z.uuid({ error: "Pick a track" }),
  targetRoleId: z.uuid({ error: "Pick a target role" }),
  targetCompanies: tagList(30),
  prepWindowDays: z
    .number({ error: "Choose a prep window" })
    .int()
    .min(7, "At least 7 days")
    .max(180, "At most 180 days"),
  dailyHours: z
    .number({ error: "Enter daily hours" })
    .min(0.5, "At least 30 minutes a day")
    .max(12, "At most 12 hours a day"),
  timezone: TimezoneSchema,
});
export type ProfileInput = z.infer<typeof ProfileInputSchema>;

export const ReminderSettingsSchema = z.object({
  reminderMinutes: z
    .array(
      z
        .number()
        .int()
        .min(5)
        .max(7 * 24 * 60),
    )
    .max(5)
    .transform((values) => [...new Set(values)].sort((a, b) => b - a)),
  reviewDailyCap: z.number().int().min(5).max(200),
});
export type ReminderSettings = z.infer<typeof ReminderSettingsSchema>;
