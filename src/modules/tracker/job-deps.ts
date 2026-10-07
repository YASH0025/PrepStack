import "server-only";

import { env } from "@/lib/env";
import { getEmailService } from "@/lib/services/email";
import { getUserRepository } from "@/modules/auth/service";

import { type InterviewJobDeps } from "./jobs";

/**
 * Whether a round already has a debrief. Debriefs are added in the debrief
 * step; until a round has one, prompts are shown for every finished round.
 */
export async function roundHasDebrief(_userId: string, _roundId: string): Promise<boolean> {
  return false;
}

/** Production wiring for the tracker's scheduled jobs. */
export function interviewJobDeps(): InterviewJobDeps {
  return {
    email: getEmailService(),
    appUrl: env.APP_URL,
    hasDebrief: roundHasDebrief,
    userEmail: async (userId) => {
      const user = await getUserRepository().getById(userId);
      return user && !user.disabled ? user.email : null;
    },
  };
}
