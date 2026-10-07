import "server-only";

import { formatInTimeZone } from "date-fns-tz";

import { type ExperienceBand, ROUND_TYPE_LABELS } from "@/lib/domain";
import { getProfile } from "@/modules/profile/service";
import { debriefsFor } from "@/modules/tracker/debrief-service";
import { earlierQuestionsAtCompany } from "@/modules/tracker/domain/debriefs";
import { type Application, type Round } from "@/modules/tracker/schemas";
import { trackerFor } from "@/modules/tracker/service";

import { type RevisionSheetInput } from "./domain/generator";

/** Inputs the revision sheet takes from debriefs and community reports. */
export interface SheetSignals {
  debriefWeakness: RevisionSheetInput["debriefWeakness"];
  earlierQuestions: RevisionSheetInput["earlierQuestions"];
  community: RevisionSheetInput["community"];
}

export interface SheetContext {
  round: Round;
  application: Application;
  roleId: string;
  band: ExperienceBand;
}

/** Gathers signals from the debrief and community modules through their services. */
export async function collectSheetSignals(
  userId: string,
  context: SheetContext,
): Promise<SheetSignals> {
  const debriefs = debriefsFor(userId);
  const tracker = trackerFor(userId);
  const [weakness, questions, rounds, applications, profile] = await Promise.all([
    debriefs.weakness(),
    debriefs.listQuestions(),
    tracker.listRounds(),
    tracker.listApplications(),
    getProfile(userId),
  ]);
  const timezone = profile?.timezone ?? "UTC";
  const companyKeyOf = new Map(applications.map((app) => [app.id, app.companyKey]));
  const earlierQuestions = earlierQuestionsAtCompany(
    { roundId: context.round.id, companyKey: context.application.companyKey },
    rounds.map((round) => ({
      id: round.id,
      companyKey: companyKeyOf.get(round.applicationId) ?? "",
      label: `Round ${round.roundNumber} – ${round.title ?? ROUND_TYPE_LABELS[round.type]}`,
      date: formatInTimeZone(new Date(round.startUtc), timezone, "d MMM"),
      startUtc: round.startUtc,
    })),
    questions,
  );
  return { debriefWeakness: weakness, earlierQuestions, community: null };
}
