import { z } from "zod";

import { QuestionTypeSchema, SelfRatingSchema } from "@/lib/domain";
import { EncryptedStringSchema } from "@/lib/services/crypto/encryption";
import { recordSchema } from "@/lib/storage/types";

export const DebriefQuestionSchema = z.object({
  id: z.uuid(),
  text: z.string().min(1).max(1000),
  /** Skill-graph topic, when the user picked one. */
  topicId: z.uuid().nullable(),
  /** Free-text topic when nothing in the skill graph fits. */
  topicLabel: z.string().max(80).nullable(),
  type: QuestionTypeSchema,
  selfRating: SelfRatingSchema,
  /** What a good answer would cover next time (becomes the review card's answer). */
  answerNotes: z.string().max(4000),
  linkedStoryId: z.uuid().nullable(),
  needsStory: z.boolean(),
});
export type DebriefQuestion = z.infer<typeof DebriefQuestionSchema>;

export const DebriefRecordSchema = recordSchema({
  roundId: z.uuid(),
  questions: z.array(DebriefQuestionSchema).max(50),
  codingProblem: z.string().max(4000),
  systemDesignPrompt: z.string().max(4000),
  takeHome: z.string().max(4000),
  /** Private notes: encrypted at rest. */
  interviewerFeedback: EncryptedStringSchema.nullable(),
  feeling: EncryptedStringSchema.nullable(),
  nextSteps: EncryptedStringSchema.nullable(),
  lessons: EncryptedStringSchema.nullable(),
  overallRating: z.number().int().min(1).max(5),
  difficulty: z.number().int().min(1).max(5),
  actualDurationMinutes: z.number().int().min(1).max(600).nullable(),
  followUpActions: z.array(z.string().min(1).max(300)).max(20),
  /** Ids of anonymized public reports created from this debrief (private → public pointer only). */
  publishedReportIds: z.array(z.uuid()).max(10),
});
export type DebriefRecord = z.infer<typeof DebriefRecordSchema>;

/** Decrypted debrief, for the owner only. */
export type Debrief = Omit<
  DebriefRecord,
  "interviewerFeedback" | "feeling" | "nextSteps" | "lessons"
> & {
  interviewerFeedback: string | null;
  feeling: string | null;
  nextSteps: string | null;
  lessons: string | null;
};

const text = (max: number) => z.string().trim().max(max);
const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (value) =>
      value === "" || value === undefined || (typeof value === "number" && Number.isNaN(value))
        ? null
        : value,
    z.number().int().min(min).max(max).nullable(),
  );

/** 1–5 scale from radio inputs ("1"…"5"); empty means not chosen. */
const scale = (message: string) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
    z.number({ error: message }).int().min(1, message).max(5, message),
  );

export const DebriefQuestionInputSchema = z.object({
  /** Existing question id when editing; omitted for new questions. */
  id: z.uuid().optional(),
  text: text(1000).min(1, "Write the question"),
  topicId: z.preprocess((value) => (value === "" ? null : value), z.uuid().nullable()),
  topicLabel: z.preprocess((value) => (value === "" ? null : value), text(80).nullable()),
  type: QuestionTypeSchema,
  selfRating: SelfRatingSchema,
  answerNotes: text(4000),
  linkedStoryId: z.preprocess((value) => (value === "" ? null : value), z.uuid().nullable()),
  needsStory: z.boolean(),
  /** Add this question to spaced-repetition review on save. */
  addToReview: z.boolean(),
});

/** Debrief form input, shared by React Hook Form and the server action. */
export const DebriefInputSchema = z.object({
  questions: z.array(DebriefQuestionInputSchema).max(50, "At most 50 questions"),
  codingProblem: text(4000),
  systemDesignPrompt: text(4000),
  takeHome: text(4000),
  interviewerFeedback: text(4000),
  feeling: text(2000),
  nextSteps: text(2000),
  lessons: text(4000),
  overallRating: scale("Rate how it went"),
  difficulty: scale("Rate the difficulty"),
  actualDurationMinutes: optionalInt(1, 600),
  // Text from the form, or an array when the client already parsed it (server re-validates).
  followUpActions: z
    .preprocess(
      (value) => (Array.isArray(value) ? value.join("\n") : value),
      z.string().default(""),
    )
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 20),
    ),
});
export type DebriefInput = z.infer<typeof DebriefInputSchema>;
