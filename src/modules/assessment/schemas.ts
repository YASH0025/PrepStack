import { z } from "zod";

import { IsoDateTimeSchema, recordSchema } from "@/lib/storage/types";

/** How an open answer compared with the model answer, judged by the user. */
export const SelfGradeSchema = z.enum(["YES", "PARTLY", "NO"]);
export type SelfGrade = z.infer<typeof SelfGradeSchema>;

export const AttemptAnswerSchema = z.object({
  questionId: z.uuid(),
  /** MCQ: the chosen option index as a string; open: the written answer. Empty = skipped. */
  response: z.string().max(5000),
  correct: z.boolean(),
  selfGrade: SelfGradeSchema.nullable(),
});
export type AttemptAnswer = z.infer<typeof AttemptAnswerSchema>;

export const TopicDepthResultSchema = z.object({
  topicId: z.uuid(),
  /** 0 = no demonstrated depth, 1–4 = KNOW … DESIGN. */
  estimatedDepth: z.number().int().min(0).max(4),
});
export type TopicDepthResult = z.infer<typeof TopicDepthResultSchema>;

export const AssessmentAttemptSchema = recordSchema({
  trackId: z.uuid(),
  roleId: z.uuid(),
  completedAt: IsoDateTimeSchema,
  answers: z.array(AttemptAnswerSchema).max(200),
  results: z.array(TopicDepthResultSchema).max(500),
});
export type AssessmentAttempt = z.infer<typeof AssessmentAttemptSchema>;

export const SubmitDiagnosticInputSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.uuid(),
        response: z.string().max(5000),
        selfGrade: SelfGradeSchema.nullable().optional(),
      }),
    )
    .min(1, "Answer at least one question")
    .max(200),
});
export type SubmitDiagnosticInput = z.infer<typeof SubmitDiagnosticInputSchema>;

/** What the browser receives: never the correct option. */
export interface ClientDiagnosticQuestion {
  id: string;
  topicName: string;
  prompt: string;
  format: "OPEN" | "MCQ";
  options: string[];
  /** Model answer shown after an open answer is written, for self-grading. */
  modelAnswer: string | null;
}
