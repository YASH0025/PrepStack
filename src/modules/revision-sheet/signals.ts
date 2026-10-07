import "server-only";

import { type ExperienceBand } from "@/lib/domain";
import { type Application, type Round } from "@/modules/tracker/schemas";

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

/**
 * Gathers signals from the debrief and community modules through their
 * services. Each module contributes here as it is built.
 */
export async function collectSheetSignals(
  _userId: string,
  _context: SheetContext,
): Promise<SheetSignals> {
  return { debriefWeakness: {}, earlierQuestions: [], community: null };
}
