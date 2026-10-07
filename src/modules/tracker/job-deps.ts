import "server-only";

import { env } from "@/lib/env";
import { getEmailService } from "@/lib/services/email";
import { getAuth } from "@/modules/auth/service";

import { debriefsFor } from "./debrief-service";
import { type InterviewJobDeps } from "./jobs";

/** Whether a round already has a debrief (then no "How did it go?" prompt is needed). */
export async function roundHasDebrief(userId: string, roundId: string): Promise<boolean> {
  return (await debriefsFor(userId).roundIdsWithDebrief()).has(roundId);
}

/** Production wiring for the tracker's scheduled jobs. */
export function interviewJobDeps(): InterviewJobDeps {
  return {
    email: getEmailService(),
    appUrl: env.APP_URL,
    hasDebrief: roundHasDebrief,
    userEmail: async (userId) => {
      const user = await (await getAuth()).getAccount(userId);
      return user && !user.disabled ? user.email : null;
    },
  };
}
