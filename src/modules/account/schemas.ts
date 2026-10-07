import { z } from "zod";

export const REPORT_CHOICES = ["ANONYMIZE", "REMOVE"] as const;

export const DeleteAccountInputSchema = z.object({
  password: z.string().min(1, "Enter your password"),
  reports: z.enum(REPORT_CHOICES),
  confirm: z.literal("DELETE", { error: "Type DELETE to confirm" }),
});
export type DeleteAccountInput = z.infer<typeof DeleteAccountInputSchema>;
