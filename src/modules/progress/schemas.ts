import { z } from "zod";

import { IsoDateTimeSchema, recordSchema } from "@/lib/storage/types";

export const TopicStatusSchema = z.enum([
  "NOT_STARTED",
  "LEARNING",
  "COMPLETED",
  "NEEDS_REVISION",
  "DIFFICULT",
]);
export type TopicStatus = z.infer<typeof TopicStatusSchema>;

export const TOPIC_STATUS_LABELS: Record<TopicStatus, string> = {
  NOT_STARTED: "Not started",
  LEARNING: "Learning",
  COMPLETED: "Completed",
  NEEDS_REVISION: "Needs revision",
  DIFFICULT: "Difficult",
};

export const TopicProgressSchema = recordSchema({
  topicId: z.uuid(),
  status: TopicStatusSchema,
  lastStudiedAt: IsoDateTimeSchema.nullable(),
});
export type TopicProgress = z.infer<typeof TopicProgressSchema>;

export const SavedQuestionSchema = recordSchema({
  questionId: z.uuid(),
  note: z.string().max(2000),
});
export type SavedQuestion = z.infer<typeof SavedQuestionSchema>;
