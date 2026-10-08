import { z } from "zod";

import { ExperienceBandSchema } from "@/lib/domain";
import { EncryptedStringSchema } from "@/lib/services/crypto/encryption";
import { IdSchema, IsoDateTimeSchema, recordSchema } from "@/lib/storage/types";

/**
 * Everything a public passport shows. Built from an allowlist of aggregates
 * only: no salaries, companies, interview history, notes or contacts.
 */
export const PassportDataSchema = z.object({
  displayName: z.string().max(60),
  roleName: z.string().max(120),
  trackName: z.string().max(120),
  band: ExperienceBandSchema,
  plan: z
    .object({
      progressPct: z.number().int().min(0).max(100),
      done: z.number().int(),
      total: z.number().int(),
    })
    .nullable(),
  topics: z.object({
    atTarget: z.number().int(),
    total: z.number().int(),
    byCategory: z
      .array(
        z.object({
          category: z.string().max(60),
          atTarget: z.number().int(),
          total: z.number().int(),
        }),
      )
      .max(30),
  }),
  review: z.object({
    streakDays: z.number().int(),
    mastered: z.number().int(),
    reviewedThisWeek: z.number().int(),
  }),
  diagnostic: z
    .object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      atTargetPct: z.number().int().min(0).max(100),
    })
    .nullable(),
  mock: z
    .object({
      sessions: z.number().int(),
      overall: z.number(),
      byArea: z.record(z.string(), z.number().nullable()),
    })
    .nullable(),
});
export type PassportData = z.infer<typeof PassportDataSchema>;

/** Public index: share-link hash → owner. The raw token is never stored here. */
export const PassportLinkSchema = recordSchema({
  userId: IdSchema,
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  enabled: z.boolean(),
});
export type PassportLink = z.infer<typeof PassportLinkSchema>;

/** The last generated public snapshot for a link. */
export const PassportSnapshotSchema = recordSchema({
  linkId: IdSchema,
  data: PassportDataSchema,
  generatedAt: IsoDateTimeSchema,
});
export type PassportSnapshot = z.infer<typeof PassportSnapshotSchema>;

/** Private settings in the owner's folder; lets them copy their link again. */
export const PassportSettingsSchema = recordSchema({
  displayName: z.string().max(60),
  linkId: IdSchema.nullable(),
  token: EncryptedStringSchema.nullable(),
});
export type PassportSettings = z.infer<typeof PassportSettingsSchema>;

export const PassportNameInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "At least 2 characters")
    .max(60)
    .refine((value) => !value.includes("@"), "Use a name, not an email address"),
});
