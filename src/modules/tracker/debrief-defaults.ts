import { type z } from "zod";

import { type DebriefInputSchema } from "./debrief-schemas";

/** Form values as the debrief inputs hold them (shared by the server page and the client form). */
export type DebriefFormValues = z.input<typeof DebriefInputSchema>;

/** A blank debrief question. Plain module so server pages and client forms can both use it. */
export function emptyQuestion(): DebriefFormValues["questions"][number] {
  return {
    text: "",
    topicId: "",
    topicLabel: "",
    type: "CONCEPT",
    selfRating: "PARTIAL",
    answerNotes: "",
    linkedStoryId: "",
    needsStory: false,
    addToReview: true,
  };
}
