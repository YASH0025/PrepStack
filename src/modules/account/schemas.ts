import { z } from "zod";

export const REPORT_CHOICES = ["ANONYMIZE", "REMOVE"] as const;

export const DeleteAccountInputSchema = z.object({
  /** Required when the account has a password (checked by the action). */
  password: z.string().max(200),
  reports: z.enum(REPORT_CHOICES),
  confirm: z.literal("DELETE", { error: "Type DELETE to confirm" }),
});
export type DeleteAccountInput = z.infer<typeof DeleteAccountInputSchema>;
