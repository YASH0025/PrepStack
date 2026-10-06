import { z } from "zod";

import {
  DepthSchema,
  EXPERIENCE_BANDS,
  HttpUrlSchema,
  LevelSchema,
  QuestionTypeSchema,
  RoundTypeSchema,
  SlugSchema,
} from "@/lib/domain";
import { IdSchema, recordSchema } from "@/lib/storage/types";

export const TrackSchema = recordSchema({
  slug: SlugSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(1000),
  active: z.boolean(),
});
export type Track = z.infer<typeof TrackSchema>;

export const RoleSchema = recordSchema({
  trackId: IdSchema,
  slug: SlugSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(1000),
});
export type Role = z.infer<typeof RoleSchema>;

export const CompetencySchema = recordSchema({
  slug: SlugSchema,
  name: z.string().min(1).max(60),
  order: z.number().int().nonnegative(),
});
export type Competency = z.infer<typeof CompetencySchema>;

export const BandDepthSchema = z.object({
  depth: DepthSchema,
  /** Study hours to reach this depth from scratch. */
  hours: z.number().min(0.25).max(80),
});
export type BandDepth = z.infer<typeof BandDepthSchema>;

export const DepthByBandSchema = z.object(
  Object.fromEntries(EXPERIENCE_BANDS.map((band) => [band, BandDepthSchema])) as Record<
    (typeof EXPERIENCE_BANDS)[number],
    typeof BandDepthSchema
  >,
);
export type DepthByBand = z.infer<typeof DepthByBandSchema>;

export const RoleImportanceSchema = z.object({
  roleId: IdSchema,
  importance: z.number().int().min(1).max(5),
});

export const TopicSchema = recordSchema({
  trackId: IdSchema,
  slug: SlugSchema,
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  description: z.string().min(1).max(500),
  /** Body text with light formatting (paragraphs, lists, `code`, **bold**, fenced code). */
  explanation: z.string().max(20_000),
  keyConcepts: z.array(z.string().min(1).max(300)).max(30),
  commonMistakes: z.array(z.string().min(1).max(300)).max(30),
  coreImportance: z.number().int().min(1).max(5),
  depthByBand: DepthByBandSchema,
  roleImportance: z.array(RoleImportanceSchema).max(20),
  published: z.boolean(),
});
export type Topic = z.infer<typeof TopicSchema>;

export const TopicPrerequisiteSchema = recordSchema({
  topicId: IdSchema,
  prerequisiteId: IdSchema,
});
export type TopicPrerequisite = z.infer<typeof TopicPrerequisiteSchema>;

export const LevelAnswerSchema = z.object({
  level: LevelSchema,
  answer: z.string().min(1).max(10_000),
});
export type LevelAnswer = z.infer<typeof LevelAnswerSchema>;

export const QuestionFormatSchema = z.enum(["OPEN", "MCQ"]);

export const QuestionSchema = recordSchema({
  topicId: IdSchema,
  prompt: z.string().min(1).max(2000),
  type: QuestionTypeSchema,
  /** Depth this question probes; drives diagnostic depth estimation. */
  depth: DepthSchema,
  format: QuestionFormatSchema,
  answers: z.array(LevelAnswerSchema).max(3),
  /** MCQ only. */
  options: z.array(z.string().min(1).max(500)).max(6),
  correctIndex: z.number().int().min(0).max(5).nullable(),
  /** Short explanation shown after answering an MCQ, or the model answer for open diagnostic items. */
  explanation: z.string().max(4000),
  selfCheck: z.boolean(),
  diagnostic: z.boolean(),
}).superRefine((question, ctx) => {
  if (question.format === "MCQ") {
    if (question.options.length < 2) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "MCQ needs at least 2 options" });
    }
    if (question.correctIndex === null || question.correctIndex >= question.options.length) {
      ctx.addIssue({
        code: "custom",
        path: ["correctIndex"],
        message: "pick a valid correct option",
      });
    }
  } else if (question.answers.length === 0) {
    ctx.addIssue({ code: "custom", path: ["answers"], message: "add at least one level answer" });
  }
  const levels = question.answers.map((answer) => answer.level);
  if (new Set(levels).size !== levels.length) {
    ctx.addIssue({ code: "custom", path: ["answers"], message: "one answer per level" });
  }
});
export type Question = z.infer<typeof QuestionSchema>;

export const ResourceKindSchema = z.enum(["DOCS", "ARTICLE", "VIDEO", "BOOK", "COURSE"]);

export const ResourceSchema = recordSchema({
  topicId: IdSchema,
  title: z.string().min(1).max(200),
  url: HttpUrlSchema,
  kind: ResourceKindSchema,
});
export type Resource = z.infer<typeof ResourceSchema>;

export const BehavioralQuestionKindSchema = z.enum(["BEHAVIORAL", "HR_INDIA"]);

export const BehavioralQuestionSchema = recordSchema({
  text: z.string().min(1).max(500),
  kind: BehavioralQuestionKindSchema,
  /** Competency slugs. */
  competencies: z.array(SlugSchema).max(6),
  guidance: z.string().max(4000),
});
export type BehavioralQuestion = z.infer<typeof BehavioralQuestionSchema>;

export const InterviewerQuestionSchema = recordSchema({
  text: z.string().min(1).max(300),
  roundTypes: z.array(RoundTypeSchema).min(1),
});
export type InterviewerQuestion = z.infer<typeof InterviewerQuestionSchema>;
