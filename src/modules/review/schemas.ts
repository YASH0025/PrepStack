import { z } from "zod";

import { IsoDateTimeSchema, LocalDateSchema, recordSchema } from "@/lib/storage/types";

export const CARD_SOURCES = [
  "SAVED_QUESTION",
  "DEBRIEF_QUESTION",
  "SELF_CHECK",
  "STORY",
  "MOCK_QUESTION",
  "MANUAL",
] as const;
export const CardSourceSchema = z.enum(CARD_SOURCES);
export type CardSource = z.infer<typeof CardSourceSchema>;

export const CARD_SOURCE_LABELS: Record<CardSource, string> = {
  SAVED_QUESTION: "Topic question",
  DEBRIEF_QUESTION: "From a debrief",
  SELF_CHECK: "Missed self-check",
  STORY: "Story",
  MOCK_QUESTION: "From a mock interview",
  MANUAL: "Your card",
};

export const RATINGS = ["AGAIN", "HARD", "GOOD", "EASY"] as const;
export const RatingSchema = z.enum(RATINGS);
export type Rating = z.infer<typeof RatingSchema>;

export const RATING_LABELS: Record<Rating, string> = {
  AGAIN: "Again",
  HARD: "Hard",
  GOOD: "Good",
  EASY: "Easy",
};

export const BoxSchema = z.number().int().min(1).max(5);

export const ReviewHistoryEntrySchema = z.object({
  at: IsoDateTimeSchema,
  /** Local date of the review, for streaks and weekly stats. */
  day: LocalDateSchema,
  rating: RatingSchema,
  fromBox: BoxSchema,
  toBox: BoxSchema,
});
export type ReviewHistoryEntry = z.infer<typeof ReviewHistoryEntrySchema>;

export const ReviewCardSchema = recordSchema({
  sourceType: CardSourceSchema,
  /** Id of the source (question, story, debrief question). Null for manual cards. */
  sourceId: z.string().max(100).nullable(),
  topicId: z.uuid().nullable(),
  prompt: z.string().min(1).max(2000),
  answer: z.string().max(10_000),
  box: BoxSchema,
  dueDate: LocalDateSchema,
  mastered: z.boolean(),
  lastReviewedAt: IsoDateTimeSchema.nullable(),
  history: z.array(ReviewHistoryEntrySchema).max(200),
});
export type ReviewCard = z.infer<typeof ReviewCardSchema>;

export const ManualCardInputSchema = z.object({
  prompt: z.string().trim().min(1, "Write a prompt").max(2000),
  answer: z.string().trim().min(1, "Write the answer").max(10_000),
});
export type ManualCardInput = z.infer<typeof ManualCardInputSchema>;
