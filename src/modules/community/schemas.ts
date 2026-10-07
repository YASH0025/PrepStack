import { z } from "zod";

import {
  ExperienceBandSchema,
  QuestionTypeSchema,
  RoundTypeSchema,
  SlugSchema,
} from "@/lib/domain";
import { IsoDateTimeSchema, recordSchema } from "@/lib/storage/types";

export const REPORT_STATUSES = ["PENDING", "PUBLISHED", "HIDDEN"] as const;
export const ReportStatusSchema = z.enum(REPORT_STATUSES);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const OUTCOMES = ["CLEARED", "REJECTED", "PENDING", "UNDISCLOSED"] as const;
export const OutcomeSchema = z.enum(OUTCOMES);
export type Outcome = z.infer<typeof OutcomeSchema>;

export const OUTCOME_LABELS: Record<Outcome, string> = {
  CLEARED: "Cleared",
  REJECTED: "Not selected",
  PENDING: "Awaiting result",
  UNDISCLOSED: "Not shared",
};

export const MonthYearSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "use yyyy-MM");

export const ReportQuestionSchema = z.object({
  text: z.string().trim().min(1, "Write the question").max(1000),
  type: QuestionTypeSchema,
  topicId: z.uuid().nullable(),
  topicLabel: z.string().trim().max(80).nullable(),
});
export type ReportQuestion = z.infer<typeof ReportQuestionSchema>;

export const ReportRoundSchema = z.object({
  type: RoundTypeSchema,
  difficulty: z.number().int().min(1).max(5),
  durationMinutes: z.number().int().min(15).max(600).nullable(),
  questions: z.array(ReportQuestionSchema).max(30),
});
export type ReportRound = z.infer<typeof ReportRoundSchema>;

/**
 * Everything a public report contains. Built ONLY from an allowlist of
 * fields by the anonymizer; there is deliberately no user id, debrief id,
 * round id or exact date anywhere in it.
 */
export const ReportDraftSchema = z.object({
  companyName: z.string().trim().min(1, "Company is required").max(120),
  roleTitle: z.string().trim().min(1, "Role is required").max(120),
  technologies: z.array(z.string().trim().min(1).max(40)).max(12),
  experienceBand: ExperienceBandSchema,
  monthYear: MonthYearSchema,
  outcome: OutcomeSchema,
  overallDifficulty: z.number().int().min(1).max(5),
  summary: z.string().trim().max(1500),
  rounds: z.array(ReportRoundSchema).min(1).max(10),
});
export type ReportDraft = z.infer<typeof ReportDraftSchema>;

export const InterviewReportSchema = recordSchema({
  ...ReportDraftSchema.shape,
  companySlug: SlugSchema,
  status: ReportStatusSchema,
  usefulCount: z.number().int().nonnegative(),
  publishedAt: IsoDateTimeSchema.nullable(),
  /** Set by moderators when hiding or editing a report. */
  moderationNote: z.string().max(500).nullable(),
});
export type InterviewReport = z.infer<typeof InterviewReportSchema>;

export const ReportVoteSchema = recordSchema({
  reportId: z.uuid(),
  userId: z.uuid(),
});
export type ReportVote = z.infer<typeof ReportVoteSchema>;

export const FLAG_REASONS = ["PERSONAL_INFO", "INACCURATE", "SPAM", "OFFENSIVE", "OTHER"] as const;
export const FlagReasonSchema = z.enum(FLAG_REASONS);
export type FlagReason = z.infer<typeof FlagReasonSchema>;

export const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  PERSONAL_INFO: "Contains personal information",
  INACCURATE: "Inaccurate or misleading",
  SPAM: "Spam or advertising",
  OFFENSIVE: "Offensive",
  OTHER: "Something else",
};

export const ReportFlagSchema = recordSchema({
  reportId: z.uuid(),
  userId: z.uuid(),
  reason: FlagReasonSchema,
  note: z.string().max(500),
  status: z.enum(["OPEN", "RESOLVED"]),
  resolution: z.string().max(200).nullable(),
});
export type ReportFlag = z.infer<typeof ReportFlagSchema>;

export const FlagInputSchema = z.object({
  reason: FlagReasonSchema,
  note: z.string().trim().max(500, "Keep it under 500 characters"),
});
export type FlagInput = z.infer<typeof FlagInputSchema>;

export const ModerationNoteSchema = z.string().trim().max(500);
