import { z } from "zod";

import { recordSchema } from "@/lib/storage/types";

/** The user's PRIVATE list of saved community reports. Never visible to anyone else. */
export const ReportBookmarksSchema = recordSchema({
  reportIds: z.array(z.uuid()).max(500),
});
export type ReportBookmarks = z.infer<typeof ReportBookmarksSchema>;
