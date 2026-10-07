import "server-only";

import { localDateOf } from "@/lib/local-date";
import {
  type Finding,
  anonymizeDebrief,
  personalTermsExcept,
  scrubDraft,
} from "@/modules/community/domain/anonymizer";
import { type ReportDraft } from "@/modules/community/schemas";
import { getProfile } from "@/modules/profile/service";

import { debriefsFor } from "./debrief-service";
import { type Debrief } from "./debrief-schemas";
import { type Application, type Round } from "./schemas";
import { trackerFor } from "./service";

export class ShareError extends Error {}

export interface ShareContext {
  round: Round;
  application: Application;
  debrief: Debrief;
  /** Raw personal terms. Server-only: never sent to the browser. */
  personalTerms: (string | null)[];
}

/** Everything identifying in the user's own records for this application. */
function collectPersonalTerms(
  user: { email: string },
  displayName: string | null,
  application: Application,
  rounds: Round[],
): (string | null)[] {
  const terms: (string | null)[] = [
    user.email,
    displayName,
    application.referrerName,
    application.agency,
    application.expectedSalary,
    application.offeredSalary,
  ];
  for (const round of rounds) {
    const { hr, interviewers, panel } = round.people;
    terms.push(hr.name, hr.email, hr.phone, hr.linkedin, round.meetingLink, round.location);
    for (const interviewer of interviewers) terms.push(interviewer.name, interviewer.linkedin);
    terms.push(...panel);
  }
  return terms;
}

/**
 * Loads the user's OWN round, application and debrief for sharing. Private
 * data is read here (tracker module), anonymized, and only the scrubbed draft
 * ever reaches the community module.
 */
export async function shareContext(
  user: { id: string; email: string },
  roundId: string,
): Promise<ShareContext> {
  const tracker = trackerFor(user.id);
  const round = await tracker.getRound(roundId);
  if (!round) throw new ShareError("Round not found");
  const [application, debrief, profile, siblings] = await Promise.all([
    tracker.getApplication(round.applicationId),
    debriefsFor(user.id).get(round.id),
    getProfile(user.id),
    tracker.roundsForApplication(round.applicationId),
  ]);
  if (!application) throw new ShareError("Application not found");
  if (!debrief) throw new ShareError("Write the debrief first, then share it");
  return {
    round,
    application,
    debrief,
    personalTerms: collectPersonalTerms(
      user,
      profile?.displayName || null,
      application,
      siblings.length ? siblings : [round],
    ),
  };
}

/** The first anonymized draft, built from allowlisted fields only. */
export function initialShareDraft(
  context: ShareContext,
  experienceBand: ReportDraft["experienceBand"],
  timezone: string,
): { draft: ReportDraft; findings: Finding[] } {
  const { round, application, debrief } = context;
  return anonymizeDebrief({
    companyName: application.companyName,
    jobTitle: application.jobTitle,
    technologies: application.technologies,
    experienceBand,
    roundDate: localDateOf(round.startUtc, timezone),
    roundType: round.type,
    roundResult: round.result,
    difficulty: debrief.difficulty,
    durationMinutes:
      debrief.actualDurationMinutes ??
      Math.round((Date.parse(round.endUtc) - Date.parse(round.startUtc)) / 60_000),
    questions: debrief.questions.map((question) => ({
      text: question.text,
      type: question.type,
      topicId: question.topicId,
      topicLabel: question.topicLabel,
    })),
    codingProblem: debrief.codingProblem,
    systemDesignPrompt: debrief.systemDesignPrompt,
    takeHome: debrief.takeHome,
    personalTerms: context.personalTerms,
  });
}

/** Re-runs the scrub on the user's edited draft (preview and publish both use this). */
export function scrubEditedDraft(
  context: ShareContext,
  draft: ReportDraft,
): { draft: ReportDraft; findings: Finding[] } {
  return scrubDraft(draft, personalTermsExcept(context.personalTerms, draft.companyName));
}
