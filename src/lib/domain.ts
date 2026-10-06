import { z } from "zod";

/*
 * Vocabulary shared across modules. Keeping it in one place means the
 * roadmap engine, tracker, debriefs and community reports all agree on the
 * same values.
 */

export const EXPERIENCE_BANDS = ["0-2", "2-4", "4-6", "6+"] as const;
export const ExperienceBandSchema = z.enum(EXPERIENCE_BANDS);
export type ExperienceBand = z.infer<typeof ExperienceBandSchema>;

export const BAND_LABELS: Record<ExperienceBand, string> = {
  "0-2": "0–2 years",
  "2-4": "2–4 years",
  "4-6": "4–6 years",
  "6+": "6+ years",
};

/** Years → band. Boundaries belong to the higher band: 2 years → "2-4". */
export function bandForYears(years: number): ExperienceBand {
  if (years < 2) return "0-2";
  if (years < 4) return "2-4";
  if (years < 6) return "4-6";
  return "6+";
}

export const DEPTHS = ["KNOW", "EXPLAIN", "APPLY", "DESIGN"] as const;
export const DepthSchema = z.enum(DEPTHS);
export type Depth = z.infer<typeof DepthSchema>;

/** 0 means "no demonstrated depth". */
export type DepthLevel = 0 | 1 | 2 | 3 | 4;

export const DEPTH_LEVEL: Record<Depth, Exclude<DepthLevel, 0>> = {
  KNOW: 1,
  EXPLAIN: 2,
  APPLY: 3,
  DESIGN: 4,
};

export function depthFromLevel(level: DepthLevel): Depth | null {
  return level === 0 ? null : (DEPTHS[level - 1] ?? null);
}

export const DEPTH_LABELS: Record<Depth, { label: string; meaning: string }> = {
  KNOW: { label: "Know", meaning: "Define it" },
  EXPLAIN: { label: "Explain", meaning: "How and why it works" },
  APPLY: { label: "Apply", meaning: "Real usage and trade-offs" },
  DESIGN: { label: "Design", meaning: "Architecture decisions" },
};

export const LEVELS = ["JUNIOR", "MID", "SENIOR"] as const;
export const LevelSchema = z.enum(LEVELS);
export type Level = z.infer<typeof LevelSchema>;

export const LEVEL_LABELS: Record<Level, string> = {
  JUNIOR: "Junior",
  MID: "Mid",
  SENIOR: "Senior",
};

/** Default answer level to show for an experience band. */
export function levelForBand(band: ExperienceBand): Level {
  if (band === "0-2") return "JUNIOR";
  if (band === "2-4") return "MID";
  return "SENIOR";
}

export const QUESTION_TYPES = ["CONCEPT", "CODING", "SYSTEM_DESIGN", "BEHAVIORAL", "HR"] as const;
export const QuestionTypeSchema = z.enum(QUESTION_TYPES);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  CONCEPT: "Concept",
  CODING: "Coding",
  SYSTEM_DESIGN: "System design",
  BEHAVIORAL: "Behavioral",
  HR: "HR",
};

export const ROUND_TYPES = [
  "RECRUITER_SCREEN",
  "TECHNICAL",
  "CODING",
  "SYSTEM_DESIGN",
  "MANAGERIAL",
  "BEHAVIORAL",
  "HR",
  "TAKE_HOME",
  "OTHER",
] as const;
export const RoundTypeSchema = z.enum(ROUND_TYPES);
export type RoundType = z.infer<typeof RoundTypeSchema>;

export const ROUND_TYPE_LABELS: Record<RoundType, string> = {
  RECRUITER_SCREEN: "Recruiter screen",
  TECHNICAL: "Technical",
  CODING: "Coding",
  SYSTEM_DESIGN: "System design",
  MANAGERIAL: "Managerial",
  BEHAVIORAL: "Behavioral",
  HR: "HR",
  TAKE_HOME: "Take-home",
  OTHER: "Other",
};

/** Round types where behavioral stories and HR questions matter. */
export const PEOPLE_ROUND_TYPES: readonly RoundType[] = [
  "MANAGERIAL",
  "BEHAVIORAL",
  "HR",
  "RECRUITER_SCREEN",
];

export const SELF_RATINGS = ["NAILED", "PARTIAL", "MISSED"] as const;
export const SelfRatingSchema = z.enum(SELF_RATINGS);
export type SelfRating = z.infer<typeof SelfRatingSchema>;

export const SELF_RATING_LABELS: Record<SelfRating, string> = {
  NAILED: "Nailed it",
  PARTIAL: "Partial",
  MISSED: "Missed",
};

/** URL-safe identifier used for topics, roles, tracks and companies. */
export const SlugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase letters, numbers and dashes");

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Normalised company key so "Acme Corp", "ACME corp." and "acme-corp" match. */
export function companyKey(name: string): string {
  return slugify(name.replace(/\b(pvt|private|ltd|limited|inc|llc|corp|corporation)\b\.?/gi, ""));
}

export const HttpUrlSchema = z
  .url()
  .refine((value) => /^https?:\/\//i.test(value), "must start with http:// or https://");
