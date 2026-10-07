import { z } from "zod";

import { LocalDateSchema, recordSchema } from "@/lib/storage/types";

export const RESIGNATION_STATES = ["NOT_RESIGNED", "SERVING", "RELIEVED"] as const;
export const ResignationStateSchema = z.enum(RESIGNATION_STATES);
export type ResignationState = z.infer<typeof ResignationStateSchema>;

export const RESIGNATION_STATE_LABELS: Record<ResignationState, string> = {
  NOT_RESIGNED: "Not resigned yet",
  SERVING: "Serving notice",
  RELIEVED: "Already relieved",
};

export const TriStateSchema = z.enum(["YES", "NO", "UNSURE"]);
export type TriState = z.infer<typeof TriStateSchema>;

export const TRI_STATE_LABELS: Record<TriState, string> = {
  YES: "Yes",
  NO: "No",
  UNSURE: "Not sure",
};

/** Stored inputs only; LWD, phases and warnings are computed on read so they never go stale. */
export const NoticePlanSchema = recordSchema({
  resignationState: ResignationStateSchema,
  noticeDays: z.number().int().min(0).max(365).nullable(),
  resignationDate: LocalDateSchema.nullable(),
  buyout: TriStateSchema,
  earlyRelease: TriStateSchema,
  targetJoiningFrom: LocalDateSchema.nullable(),
  targetJoiningTo: LocalDateSchema.nullable(),
});
export type NoticePlan = z.infer<typeof NoticePlanSchema>;

const optionalDate = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  LocalDateSchema.nullable(),
);

/** Form input shared by React Hook Form and the server action. */
export const NoticePlanInputSchema = z
  .object({
    resignationState: ResignationStateSchema,
    noticeDays: z.preprocess(
      (value) => (value === "" || value === undefined || Number.isNaN(value) ? null : value),
      z
        .number({ error: "Enter a number of days" })
        .int("Use whole days")
        .min(0, "Cannot be negative")
        .max(365, "At most 365 days")
        .nullable(),
    ),
    resignationDate: optionalDate,
    buyout: TriStateSchema,
    earlyRelease: TriStateSchema,
    targetJoiningFrom: optionalDate,
    targetJoiningTo: optionalDate,
  })
  .superRefine((value, ctx) => {
    if (value.resignationState === "SERVING") {
      if (value.noticeDays === null) {
        ctx.addIssue({ code: "custom", path: ["noticeDays"], message: "Enter your notice period" });
      }
      if (!value.resignationDate) {
        ctx.addIssue({
          code: "custom",
          path: ["resignationDate"],
          message: "Enter the date you resigned",
        });
      }
    }
    if (
      value.targetJoiningFrom &&
      value.targetJoiningTo &&
      value.targetJoiningTo < value.targetJoiningFrom
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["targetJoiningTo"],
        message: "Must be on or after the start of the window",
      });
    }
  });
export type NoticePlanInput = z.infer<typeof NoticePlanInputSchema>;
