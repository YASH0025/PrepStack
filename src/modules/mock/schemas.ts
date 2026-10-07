import { z } from "zod";

import { ExperienceBandSchema, SELF_RATINGS, SelfRatingSchema } from "@/lib/domain";
import { HttpUrlSchema } from "@/lib/domain";
import { IdSchema, IsoDateTimeSchema, recordSchema } from "@/lib/storage/types";

/** Topics a participant wants to be asked about, chosen when booking. */
export const MockTopicsSchema = z.array(IdSchema).min(1, "Pick at least one topic").max(6);

/**
 * What a user shares to take part in mock interviews. Created only when they
 * join, from values they confirm; never read from their private profile.
 */
export const MockProfileSchema = recordSchema({
  userId: IdSchema,
  displayName: z.string().trim().min(2).max(40),
  roleId: IdSchema,
  band: ExperienceBandSchema,
  timezone: z.string().min(1).max(64),
  /** Opt-in: show the peer score on the readiness passport (after 3+ sessions). */
  showScore: z.boolean(),
  /** Dates of no-shows, for the booking pause. */
  noShows: z.array(IsoDateTimeSchema).max(50),
  suspendedUntil: IsoDateTimeSchema.nullable(),
});
export type MockProfile = z.infer<typeof MockProfileSchema>;

export const SlotStatusSchema = z.enum(["OPEN", "BOOKED", "CANCELLED"]);

export const MockSlotSchema = recordSchema({
  hostId: IdSchema,
  startUtc: IsoDateTimeSchema,
  roleId: IdSchema,
  band: ExperienceBandSchema,
  hostTopics: MockTopicsSchema,
  meetingLink: HttpUrlSchema.nullable(),
  note: z.string().max(200),
  status: SlotStatusSchema,
  sessionId: IdSchema.nullable(),
});
export type MockSlot = z.infer<typeof MockSlotSchema>;

/** "Find me a partner": proposed start times for automatic matching. */
export const MatchRequestSchema = recordSchema({
  userId: IdSchema,
  roleId: IdSchema,
  band: ExperienceBandSchema,
  topics: MockTopicsSchema,
  startTimes: z.array(IsoDateTimeSchema).min(1).max(10),
  meetingLink: HttpUrlSchema.nullable(),
  status: z.enum(["OPEN", "MATCHED", "CANCELLED"]),
  sessionId: IdSchema.nullable(),
});
export type MatchRequest = z.infer<typeof MatchRequestSchema>;

export const SessionParticipantSchema = z.object({
  userId: IdSchema,
  topics: MockTopicsSchema,
  /** Questions this participant will be ASKED (visible to their interviewer only). */
  questionIds: z.array(IdSchema).max(12),
});

export const SESSION_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

export const MockSessionSchema = recordSchema({
  source: z.enum(["SLOT", "MATCH"]),
  startUtc: IsoDateTimeSchema,
  durationMinutes: z.literal(60),
  roleId: IdSchema,
  participants: z.tuple([SessionParticipantSchema, SessionParticipantSchema]),
  meetingLink: HttpUrlSchema.nullable(),
  status: z.enum(SESSION_STATUSES),
  cancelledBy: IdSchema.nullable(),
  /** Participant who did not show up, when status is NO_SHOW. */
  noShowUserId: IdSchema.nullable(),
});
export type MockSession = z.infer<typeof MockSessionSchema>;

export const FEEDBACK_AREAS = [
  "communication",
  "problemSolving",
  "technicalDepth",
  "structure",
] as const;
export type FeedbackArea = (typeof FEEDBACK_AREAS)[number];
export const FEEDBACK_AREA_LABELS: Record<FeedbackArea, string> = {
  communication: "Communication",
  problemSolving: "Problem solving",
  technicalDepth: "Technical depth",
  structure: "Structure and clarity",
};

const Score = z.coerce.number().int().min(1, "Rate 1–5").max(5);

export const MockFeedbackSchema = recordSchema({
  sessionId: IdSchema,
  fromUserId: IdSchema,
  toUserId: IdSchema,
  ratings: z.object({
    communication: Score,
    problemSolving: Score,
    technicalDepth: Score,
    structure: Score,
  }),
  /** How each question asked went, by the interviewer's judgement. */
  questions: z.array(z.object({ questionId: IdSchema, rating: SelfRatingSchema })).max(12),
  strengths: z.string().max(1000),
  improvements: z.string().max(1000),
});
export type MockFeedback = z.infer<typeof MockFeedbackSchema>;

export const REPORT_REASONS = ["NO_SHOW", "INAPPROPRIATE", "SPAM", "OTHER"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  NO_SHOW: "Did not show up",
  INAPPROPRIATE: "Rude or inappropriate",
  SPAM: "Spam or selling something",
  OTHER: "Something else",
};

export const MockReportSchema = recordSchema({
  reporterId: IdSchema,
  reportedUserId: IdSchema,
  sessionId: IdSchema.nullable(),
  reason: z.enum(REPORT_REASONS),
  note: z.string().max(500),
  status: z.enum(["OPEN", "RESOLVED"]),
  resolution: z.string().max(200).nullable(),
});
export type MockReport = z.infer<typeof MockReportSchema>;

export const MockBlockSchema = recordSchema({
  blockerId: IdSchema,
  blockedId: IdSchema,
});
export type MockBlock = z.infer<typeof MockBlockSchema>;

/* ------------------------------- form inputs ------------------------------ */

export const JoinMockInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "At least 2 characters")
    .max(40)
    .refine((value) => !value.includes("@"), "Use a name, not an email address"),
  roleId: IdSchema,
  band: ExperienceBandSchema,
  timezone: z.string().min(1).max(64),
  showScore: z.boolean(),
  agree: z.literal(true, { error: "Please accept the guidelines" }),
});
export type JoinMockInput = z.infer<typeof JoinMockInputSchema>;

const optionalLink = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  HttpUrlSchema.nullable(),
);

export const PostSlotInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
  topics: MockTopicsSchema,
  meetingLink: optionalLink,
  note: z.string().trim().max(200),
});
export type PostSlotInput = z.infer<typeof PostSlotInputSchema>;

export const BookSlotInputSchema = z.object({ topics: MockTopicsSchema });

export const MatchRequestInputSchema = z.object({
  times: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
        time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
      }),
    )
    .min(1, "Add at least one time")
    .max(10),
  topics: MockTopicsSchema,
  meetingLink: optionalLink,
});
export type MatchRequestInput = z.infer<typeof MatchRequestInputSchema>;

export const FeedbackInputSchema = z.object({
  ratings: MockFeedbackSchema.shape.ratings,
  questions: z.array(
    z.object({ questionId: IdSchema, rating: z.enum(SELF_RATINGS, { error: "Rate this answer" }) }),
  ),
  strengths: z.string().trim().max(1000),
  improvements: z.string().trim().max(1000),
});
export type FeedbackInput = z.infer<typeof FeedbackInputSchema>;

export const ReportInputSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(500),
});
