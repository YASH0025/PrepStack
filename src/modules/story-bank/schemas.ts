import { z } from "zod";

import { SlugSchema } from "@/lib/domain";
import { IsoDateTimeSchema, recordSchema } from "@/lib/storage/types";

export const STORY_STATUSES = ["DRAFT", "READY", "PRACTICED"] as const;
export const StoryStatusSchema = z.enum(STORY_STATUSES);
export type StoryStatus = z.infer<typeof StoryStatusSchema>;

export const STORY_STATUS_LABELS: Record<StoryStatus, string> = {
  DRAFT: "Draft",
  READY: "Ready",
  PRACTICED: "Practiced",
};

export const StoryUsageSchema = z.object({
  roundId: z.uuid(),
  /** Debrief question the story answered, when linked from a debrief. */
  debriefQuestionId: z.uuid().nullable(),
  usedAt: IsoDateTimeSchema,
});
export type StoryUsage = z.infer<typeof StoryUsageSchema>;

export const StorySchema = recordSchema({
  title: z.string().min(1).max(120),
  situation: z.string().max(3000),
  task: z.string().max(3000),
  action: z.string().max(5000),
  result: z.string().max(3000),
  /** Measurable impact, e.g. "Cut p95 latency from 900 ms to 250 ms". */
  impact: z.string().max(300),
  /** Competency slugs from the curated list. */
  competencies: z.array(SlugSchema).max(6),
  projectRef: z.string().max(120),
  status: StoryStatusSchema,
  usage: z.array(StoryUsageSchema).max(100),
});
export type Story = z.infer<typeof StorySchema>;

/** Form input shared by React Hook Form and the server action. */
export const StoryInputSchema = z
  .object({
    title: z.string().trim().min(1, "Give the story a short title").max(120),
    situation: z.string().trim().max(3000),
    task: z.string().trim().max(3000),
    action: z.string().trim().max(5000),
    result: z.string().trim().max(3000),
    impact: z.string().trim().max(300, "Keep the impact to one line"),
    competencies: z
      .array(SlugSchema)
      .max(6, "Pick up to 6 competencies")
      .transform((values) => [...new Set(values)]),
    projectRef: z.string().trim().max(120),
    status: StoryStatusSchema,
  })
  .superRefine((story, ctx) => {
    // A story marked ready must actually be usable in an interview.
    if (story.status !== "DRAFT") {
      for (const field of ["situation", "action", "result"] as const) {
        if (!story[field]) {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: "Fill this in before marking the story ready",
          });
        }
      }
      if (story.competencies.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["competencies"],
          message: "Tag at least one competency",
        });
      }
    }
  });
export type StoryInput = z.infer<typeof StoryInputSchema>;
