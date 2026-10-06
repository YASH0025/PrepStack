import { z } from "zod";

import { IsoDateTimeSchema, LocalDateSchema, recordSchema } from "@/lib/storage/types";

export const ItemKindSchema = z.enum(["LEARN", "REVISION", "SELF_CHECK"]);
export type ItemKind = z.infer<typeof ItemKindSchema>;

export const ItemStatusSchema = z.enum(["PENDING", "DONE"]);
export type ItemStatus = z.infer<typeof ItemStatusSchema>;

const DepthLevelSchema = z.number().int().min(0).max(4);

export const RoadmapItemSchema = z.object({
  id: z.uuid(),
  topicId: z.uuid().nullable(),
  kind: ItemKindSchema,
  scheduledDate: LocalDateSchema,
  hours: z.number().min(0).max(24),
  status: ItemStatusSchema,
  completedAt: IsoDateTimeSchema.nullable(),
  priorityScore: z.number(),
  reasons: z.array(z.string().max(500)).max(20),
  requiredDepth: DepthLevelSchema,
  currentDepth: DepthLevelSchema,
  part: z.number().int().min(1),
  parts: z.number().int().min(1),
  coversTopicIds: z.array(z.uuid()).max(100),
});
export type RoadmapItem = z.infer<typeof RoadmapItemSchema>;

export const SkippedTopicSchema = z.object({
  topicId: z.uuid(),
  priorityScore: z.number(),
  hours: z.number(),
  reason: z.string().max(500),
});
export type SkippedTopic = z.infer<typeof SkippedTopicSchema>;

export const DeadlineSourceSchema = z.enum(["PREP_WINDOW", "INTERVIEW", "NOTICE_PREP_END"]);
export type DeadlineSource = z.infer<typeof DeadlineSourceSchema>;

export const RoadmapSchema = recordSchema({
  generatedAt: IsoDateTimeSchema,
  startDate: LocalDateSchema,
  endDate: LocalDateSchema,
  deadlineSource: DeadlineSourceSchema,
  /** Human-readable explanation of the end date. */
  deadlineLabel: z.string().max(300),
  dailyHours: z.number(),
  budgetHours: z.number(),
  plannedHours: z.number(),
  items: z.array(RoadmapItemSchema).max(5000),
  skipped: z.array(SkippedTopicSchema).max(500),
  alreadyMet: z.array(z.object({ topicId: z.uuid(), reason: z.string() })).max(500),
});
export type Roadmap = z.infer<typeof RoadmapSchema>;
