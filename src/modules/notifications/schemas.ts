import { z } from "zod";

import { IsoDateTimeSchema, recordSchema } from "@/lib/storage/types";

export const NotificationTypeSchema = z.enum([
  "INTERVIEW_REMINDER",
  "REVISION_SHEET_READY",
  "DEBRIEF_PROMPT",
  "FOLLOW_UP_DUE",
  "REPORT_MODERATED",
  "SYSTEM",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationSchema = recordSchema({
  type: NotificationTypeSchema,
  title: z.string().min(1).max(200),
  body: z.string().max(1000),
  /** In-app link, always a relative path. */
  href: z.string().startsWith("/").max(500),
  /** Uniqueness key so the same reminder is never created twice. */
  dedupeKey: z.string().min(1).max(200),
  readAt: IsoDateTimeSchema.nullable(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export interface NewNotification {
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  dedupeKey: string;
}
