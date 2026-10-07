/**
 * Picks the roadmap's end date (PURE). The plan must finish before the
 * earliest real constraint: an upcoming interview, the end of the
 * notice-period prep phase, or the user's own prep window.
 */
import { formatInTimeZone } from "date-fns-tz";

import { ROUND_TYPE_LABELS, type RoundType } from "@/lib/domain";
import { type LocalDateString, addDays, maxDate } from "@/lib/local-date";

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

/** Round types that should pull the technical roadmap's end date forward. */
export const DEADLINE_ROUND_TYPES: readonly RoundType[] = [
  "TECHNICAL",
  "CODING",
  "SYSTEM_DESIGN",
  "MANAGERIAL",
  "TAKE_HOME",
  "OTHER",
];

export interface UpcomingInterview {
  startUtc: string;
  status: string;
  type: RoundType;
  companyName: string;
}

/**
 * Upcoming technical interviews → roadmap deadline candidates (PURE).
 * Preparation should be finished the day before the interview, or today if
 * the interview is today or tomorrow. Recruiter, HR and behavioral rounds do
 * not shorten the technical plan.
 */
export function interviewDeadlines(
  interviews: UpcomingInterview[],
  timezone: string,
  now: Date,
): DeadlineCandidate[] {
  const today = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  return interviews
    .filter(
      (interview) =>
        interview.status === "SCHEDULED" &&
        DEADLINE_ROUND_TYPES.includes(interview.type) &&
        new Date(interview.startUtc).getTime() > now.getTime(),
    )
    .map((interview) => {
      const day = formatInTimeZone(new Date(interview.startUtc), timezone, "yyyy-MM-dd");
      const label = `${interview.companyName} ${ROUND_TYPE_LABELS[interview.type].toLowerCase()} round on ${formatInTimeZone(
        new Date(interview.startUtc),
        timezone,
        "d MMM",
      )}`;
      return { date: maxDate(today, addDays(day, -1)), source: "INTERVIEW" as const, label };
    });
}
