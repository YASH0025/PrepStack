/**
 * Picks the roadmap's end date (PURE). The plan must finish before the
 * earliest real constraint: an upcoming interview, the end of the
 * notice-period prep phase, or the user's own prep window.
 */
import { type LocalDateString, addDays } from "@/lib/local-date";

import { type DeadlineSource } from "../schemas";

export interface DeadlineCandidate {
  /** The date the preparation must be finished by (inclusive). */
  date: LocalDateString;
  source: DeadlineSource;
  label: string;
}

export interface ChosenDeadline {
  endDate: LocalDateString;
  source: DeadlineSource;
  label: string;
}

export function chooseDeadline(
  today: LocalDateString,
  prepWindowDays: number,
  constraints: DeadlineCandidate[],
): ChosenDeadline {
  const windowEnd = addDays(today, Math.max(1, prepWindowDays) - 1);
  let chosen: ChosenDeadline = {
    endDate: windowEnd,
    source: "PREP_WINDOW",
    label: `Your ${prepWindowDays}-day prep window ends`,
  };
  for (const constraint of constraints) {
    // Constraints in the past cannot be planned for; ignore them.
    if (constraint.date < today) continue;
    if (constraint.date < chosen.endDate) {
      chosen = { endDate: constraint.date, source: constraint.source, label: constraint.label };
    }
  }
  return chosen;
}
