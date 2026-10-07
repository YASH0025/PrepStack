import { z } from "zod";

import { recordSchema } from "@/lib/storage/types";

/** Which revision-sheet items the user has checked off, per round. */
export const RevisionSheetStateSchema = recordSchema({
  roundId: z.uuid(),
  checkedKeys: z.array(z.string().min(1).max(400)).max(300),
});
export type RevisionSheetState = z.infer<typeof RevisionSheetStateSchema>;

export const ToggleItemInputSchema = z.object({
  roundId: z.uuid(),
  key: z.string().min(1).max(400),
  checked: z.boolean(),
});
