import { z } from "zod";

import { HttpUrlSchema, RoundTypeSchema } from "@/lib/domain";
import { EncryptedStringSchema } from "@/lib/services/crypto/encryption";
import { IsoDateTimeSchema, LocalDateSchema, recordSchema } from "@/lib/storage/types";

/* ---------------------------------------------------------------------------
 * Vocabulary
 * ------------------------------------------------------------------------ */

export const APPLICATION_STATUSES = [
  "INTERESTED",
  "APPLIED",
  "RECRUITER_SCREENING",
  "TECHNICAL_INTERVIEW",
  "MANAGERIAL_INTERVIEW",
  "HR_ROUND",
  "OFFER_RECEIVED",
  "OFFER_ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "ON_HOLD",
] as const;
export const ApplicationStatusSchema = z.enum(APPLICATION_STATUSES);
export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  INTERESTED: "Interested",
  APPLIED: "Applied",
  RECRUITER_SCREENING: "Recruiter screening",
  TECHNICAL_INTERVIEW: "Technical interview",
  MANAGERIAL_INTERVIEW: "Managerial interview",
  HR_ROUND: "HR round",
  OFFER_RECEIVED: "Offer received",
  OFFER_ACCEPTED: "Offer accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  ON_HOLD: "On hold",
};

/** Statuses where the application is no longer moving. */
export const CLOSED_STATUSES: readonly ApplicationStatus[] = [
  "OFFER_ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
];

export const SOURCES = [
  "LINKEDIN",
  "NAUKRI",
  "REFERRAL",
  "CONSULTANT",
  "COMPANY_SITE",
  "OTHER",
] as const;
export const SourceSchema = z.enum(SOURCES);
export type Source = z.infer<typeof SourceSchema>;
export const SOURCE_LABELS: Record<Source, string> = {
  LINKEDIN: "LinkedIn",
  NAUKRI: "Naukri",
  REFERRAL: "Referral",
  CONSULTANT: "Consultant",
  COMPANY_SITE: "Company site",
  OTHER: "Other",
};

export const ROUND_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
  "NO_SHOW_ME",
  "NO_SHOW_THEM",
] as const;
export const RoundStatusSchema = z.enum(ROUND_STATUSES);
export type RoundStatus = z.infer<typeof RoundStatusSchema>;
export const ROUND_STATUS_LABELS: Record<RoundStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RESCHEDULED: "Rescheduled",
  NO_SHOW_ME: "No-show (me)",
  NO_SHOW_THEM: "No-show (them)",
};

export const ROUND_RESULTS = [
  "AWAITING",
  "CLEARED",
  "REJECTED",
  "ON_HOLD",
  "NOT_APPLICABLE",
] as const;
export const RoundResultSchema = z.enum(ROUND_RESULTS);
export type RoundResult = z.infer<typeof RoundResultSchema>;
export const ROUND_RESULT_LABELS: Record<RoundResult, string> = {
  AWAITING: "Awaiting result",
  CLEARED: "Cleared",
  REJECTED: "Rejected",
  ON_HOLD: "On hold",
  NOT_APPLICABLE: "Not applicable",
};

export const ModeSchema = z.enum(["VIDEO", "PHONE", "ONSITE"]);
export type Mode = z.infer<typeof ModeSchema>;
export const MODE_LABELS: Record<Mode, string> = {
  VIDEO: "Video",
  PHONE: "Phone",
  ONSITE: "Onsite",
};

export const CancelledBySchema = z.enum(["ME", "COMPANY"]);

/* ---------------------------------------------------------------------------
 * Third-party people details (always stored encrypted)
 * ------------------------------------------------------------------------ */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);

export const PeopleSchema = z.object({
  hr: z.object({
    name: optionalText(120),
    email: optionalText(254),
    phone: optionalText(40),
    linkedin: optionalText(300),
  }),
  interviewers: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        designation: optionalText(120),
        linkedin: optionalText(300),
      }),
    )
    .max(10),
  panel: z.array(z.string().trim().min(1).max(120)).max(10),
});
export type People = z.infer<typeof PeopleSchema>;
export const EMPTY_PEOPLE: People = {
  hr: { name: null, email: null, phone: null, linkedin: null },
  interviewers: [],
  panel: [],
};

/* ---------------------------------------------------------------------------
 * Stored records
 * ------------------------------------------------------------------------ */

const CustomValueSchema = z.union([z.string().max(500), z.number(), z.boolean(), z.null()]);

export const ApplicationRecordSchema = recordSchema({
  companyName: z.string().min(1).max(120),
  /** Normalised company name for matching (debriefs, community reports). */
  companyKey: z.string().min(1).max(120),
  jobTitle: z.string().min(1).max(120),
  technologies: z.array(z.string().min(1).max(60)).max(20),
  jobLink: HttpUrlSchema.nullable(),
  source: SourceSchema,
  referrerName: EncryptedStringSchema.nullable(),
  agency: EncryptedStringSchema.nullable(),
  appliedOn: LocalDateSchema.nullable(),
  status: ApplicationStatusSchema,
  expectedSalary: EncryptedStringSchema.nullable(),
  offeredSalary: EncryptedStringSchema.nullable(),
  offerJoiningDate: LocalDateSchema.nullable(),
  notes: EncryptedStringSchema.nullable(),
  followUpDate: LocalDateSchema.nullable(),
  outcome: z.string().max(500).nullable(),
  customValues: z.record(z.string(), CustomValueSchema),
  kanbanOrder: z.number(),
});
export type ApplicationRecord = z.infer<typeof ApplicationRecordSchema>;

export const ChecklistItemSchema = z.object({
  id: z.uuid(),
  label: z.string().min(1).max(200),
  done: z.boolean(),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const AttachmentSchema = z.object({
  id: z.uuid(),
  storageKey: z.string().min(1).max(500),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(120),
  bytes: z.number().int().nonnegative(),
  uploadedAt: IsoDateTimeSchema,
});
export type Attachment = z.infer<typeof AttachmentSchema>;

export const RoundRecordSchema = recordSchema({
  applicationId: z.uuid(),
  roundNumber: z.number().int().min(1).max(50),
  type: RoundTypeSchema,
  title: z.string().max(120).nullable(),
  startUtc: IsoDateTimeSchema,
  endUtc: IsoDateTimeSchema,
  /** Timezone the round was entered in (shown alongside the user's own). */
  timezone: z.string().min(1).max(64),
  mode: ModeSchema,
  meetingLink: HttpUrlSchema.nullable(),
  location: z.string().max(300).nullable(),
  status: RoundStatusSchema,
  result: RoundResultSchema,
  people: EncryptedStringSchema.nullable(),
  cancelReason: z.string().max(500).nullable(),
  cancelledBy: CancelledBySchema.nullable(),
  rescheduledFromId: z.uuid().nullable(),
  rescheduledToId: z.uuid().nullable(),
  reminderMinutes: z
    .array(
      z
        .number()
        .int()
        .min(5)
        .max(7 * 24 * 60),
    )
    .max(5),
  followUpDate: LocalDateSchema.nullable(),
  followUpNote: z.string().max(300).nullable(),
  prepChecklist: z.array(ChecklistItemSchema).max(50),
  interviewerQuestions: z.array(z.string().min(1).max(300)).max(30),
  notes: EncryptedStringSchema.nullable(),
  attachments: z.array(AttachmentSchema).max(20),
  /** Idempotency keys of reminders/prompts already sent for this round. */
  sentReminders: z.array(z.object({ key: z.string().max(100), sentAt: IsoDateTimeSchema })).max(50),
}).refine((round) => round.endUtc > round.startUtc, {
  path: ["endUtc"],
  message: "End must be after start",
});
export type RoundRecord = z.infer<typeof RoundRecordSchema>;

export const CustomFieldTypeSchema = z.enum(["TEXT", "NUMBER", "DATE", "SELECT", "CHECKBOX"]);
export type CustomFieldType = z.infer<typeof CustomFieldTypeSchema>;

export const CustomFieldSchema = recordSchema({
  name: z.string().min(1).max(60),
  type: CustomFieldTypeSchema,
  options: z.array(z.string().min(1).max(60)).max(30),
  order: z.number().int(),
});
export type CustomField = z.infer<typeof CustomFieldSchema>;

/* ---------------------------------------------------------------------------
 * Decrypted views (what the owner's UI receives)
 * ------------------------------------------------------------------------ */

export type Application = Omit<
  ApplicationRecord,
  "referrerName" | "agency" | "expectedSalary" | "offeredSalary" | "notes"
> & {
  referrerName: string | null;
  agency: string | null;
  expectedSalary: string | null;
  offeredSalary: string | null;
  notes: string | null;
};

export type Round = Omit<RoundRecord, "people" | "notes"> & {
  people: People;
  notes: string | null;
};

/* ---------------------------------------------------------------------------
 * Form inputs (shared by React Hook Form and server actions)
 * ------------------------------------------------------------------------ */

const blankToNull = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" || value === undefined ? null : value), schema.nullable());

export const ApplicationInputSchema = z.object({
  companyName: z.string().trim().min(1, "Company is required").max(120),
  jobTitle: z.string().trim().min(1, "Job title is required").max(120),
  technologies: z.array(z.string().trim().min(1).max(60)).max(20),
  jobLink: blankToNull(HttpUrlSchema),
  source: SourceSchema,
  referrerName: blankToNull(z.string().trim().max(120)),
  agency: blankToNull(z.string().trim().max(120)),
  appliedOn: blankToNull(LocalDateSchema),
  status: ApplicationStatusSchema,
  expectedSalary: blankToNull(z.string().trim().max(60)),
  offeredSalary: blankToNull(z.string().trim().max(60)),
  offerJoiningDate: blankToNull(LocalDateSchema),
  notes: blankToNull(z.string().max(5000)),
  followUpDate: blankToNull(LocalDateSchema),
  outcome: blankToNull(z.string().trim().max(500)),
});
export type ApplicationInput = z.infer<typeof ApplicationInputSchema>;

export const TimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm");

export const RoundInputSchema = z.object({
  applicationId: z.uuid(),
  type: RoundTypeSchema,
  title: blankToNull(z.string().trim().max(120)),
  date: LocalDateSchema,
  startTime: TimeSchema,
  durationMinutes: z
    .number({ error: "Enter a duration" })
    .int()
    .min(5)
    .max(8 * 60),
  timezone: z.string().min(1).max(64),
  mode: ModeSchema,
  meetingLink: blankToNull(HttpUrlSchema),
  location: blankToNull(z.string().trim().max(300)),
  people: PeopleSchema,
  reminderMinutes: z
    .array(
      z
        .number()
        .int()
        .min(5)
        .max(7 * 24 * 60),
    )
    .max(5),
  notes: blankToNull(z.string().max(5000)),
});
export type RoundInput = z.infer<typeof RoundInputSchema>;

export const CompleteRoundInputSchema = z.object({
  roundId: z.uuid(),
  status: z.enum(["COMPLETED", "NO_SHOW_ME", "NO_SHOW_THEM"]),
  result: RoundResultSchema,
});

export const CancelRoundInputSchema = z.object({
  roundId: z.uuid(),
  reason: z.string().trim().min(1, "Add a short reason").max(500),
  cancelledBy: CancelledBySchema,
});

export const RescheduleRoundInputSchema = z.object({
  roundId: z.uuid(),
  date: LocalDateSchema,
  startTime: TimeSchema,
  durationMinutes: z
    .number()
    .int()
    .min(5)
    .max(8 * 60),
  timezone: z.string().min(1).max(64),
  reason: z.string().trim().max(500),
  cancelledBy: CancelledBySchema,
});

export const FollowUpInputSchema = z.object({
  roundId: z.uuid(),
  followUpDate: blankToNull(LocalDateSchema),
  followUpNote: blankToNull(z.string().trim().max(300)),
});

export const CustomFieldInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  type: CustomFieldTypeSchema,
  options: z.array(z.string().trim().min(1).max(60)).max(30),
});

/** Fields that can be edited inline in the spreadsheet. */
export const ApplicationPatchSchema = z
  .object({
    companyName: z.string().trim().min(1).max(120),
    jobTitle: z.string().trim().min(1).max(120),
    status: ApplicationStatusSchema,
    source: SourceSchema,
    appliedOn: blankToNull(LocalDateSchema),
    followUpDate: blankToNull(LocalDateSchema),
    outcome: blankToNull(z.string().trim().max(500)),
  })
  .partial();
export type ApplicationPatch = z.infer<typeof ApplicationPatchSchema>;
