import { formatInTimeZone } from "date-fns-tz";

import { type RoundType } from "@/lib/domain";

import { type RoundResult, type RoundStatus } from "../schemas";

/*
 * Pure helpers behind the interview calendar. The calendar component renders
 * in "UTC mode" and is fed wall-clock times already converted to the user's
 * profile timezone, so what the user sees always matches their profile,
 * whatever timezone the browser happens to be in.
 */

export interface CalendarFilters {
  company: string | null;
  status: RoundStatus | null;
  result: RoundResult | null;
  type: RoundType | null;
}

export const NO_FILTERS: CalendarFilters = {
  company: null,
  status: null,
  result: null,
  type: null,
};

interface FilterableRound {
  applicationId: string;
  status: RoundStatus;
  result: RoundResult;
  type: RoundType;
}

/** Applies the calendar filters. `companyOf` maps an application id to its company name. */
export function filterRounds<T extends FilterableRound>(
  rounds: T[],
  companyOf: (applicationId: string) => string | undefined,
  filters: CalendarFilters,
): T[] {
  return rounds.filter(
    (round) =>
      (!filters.company || companyOf(round.applicationId) === filters.company) &&
      (!filters.status || round.status === filters.status) &&
      (!filters.result || round.result === filters.result) &&
      (!filters.type || round.type === filters.type),
  );
}

/** UTC instant → naive wall-clock string in `timezone`, e.g. "2026-10-12T11:00:00". */
export function toWallClock(utc: string | Date, timezone: string): string {
  return formatInTimeZone(new Date(utc), timezone, "yyyy-MM-dd'T'HH:mm:ss");
}

/**
 * A date picked in the UTC-mode calendar (its UTC fields hold the wall clock)
 * → date and time strings for the round form. All-day picks default to 10:00.
 */
export function slotFromCalendarDate(date: Date, allDay: boolean): { date: string; time: string } {
  const iso = date.toISOString();
  return { date: iso.slice(0, 10), time: allDay ? "10:00" : iso.slice(11, 16) };
}

export type MarkerKind = "FOLLOW_UP" | "REVISION" | "NOTICE";

/** An all-day marker shown on the calendar next to interview rounds. */
export interface CalendarMarker {
  id: string;
  kind: MarkerKind;
  /** yyyy-MM-dd in the user's timezone. */
  date: string;
  label: string;
  /** Round to open in the drawer when clicked. */
  roundId?: string;
  /** In-app link to open when clicked (used when there is no round). */
  href?: string;
}

interface FollowUpRound {
  id: string;
  applicationId: string;
  status: RoundStatus;
  followUpDate: string | null;
  followUpNote: string | null;
}

interface FollowUpApplication {
  id: string;
  companyName: string;
  followUpDate: string | null;
}

/** Follow-up dates set on rounds and on applications. */
export function followUpMarkers(
  rounds: FollowUpRound[],
  applications: FollowUpApplication[],
): CalendarMarker[] {
  const company = new Map(applications.map((app) => [app.id, app.companyName]));
  const markers: CalendarMarker[] = [];
  for (const round of rounds) {
    if (!round.followUpDate || round.status === "CANCELLED" || round.status === "RESCHEDULED") {
      continue;
    }
    markers.push({
      id: `follow-up-round-${round.id}`,
      kind: "FOLLOW_UP",
      date: round.followUpDate,
      label: `Follow up: ${company.get(round.applicationId) ?? "interview"}${
        round.followUpNote ? ` (${round.followUpNote})` : ""
      }`,
      roundId: round.id,
    });
  }
  for (const app of applications) {
    if (!app.followUpDate) continue;
    markers.push({
      id: `follow-up-app-${app.id}`,
      kind: "FOLLOW_UP",
      date: app.followUpDate,
      label: `Follow up: ${app.companyName}`,
      href: `/interviews/tracker?app=${app.id}`,
    });
  }
  return markers;
}

interface RevisionItem {
  kind: "LEARN" | "REVISION" | "SELF_CHECK";
  status: "PENDING" | "DONE";
  scheduledDate: string;
  topicId: string | null;
  coversTopicIds: string[];
}

/** One marker per day that has pending revision sessions on the roadmap. */
export function revisionMarkers(
  items: RevisionItem[],
  topicName: (topicId: string) => string | undefined,
): CalendarMarker[] {
  const byDate = new Map<string, Set<string>>();
  for (const item of items) {
    if (item.kind !== "REVISION" || item.status !== "PENDING") continue;
    const names = byDate.get(item.scheduledDate) ?? new Set<string>();
    const ids = item.topicId ? [item.topicId, ...item.coversTopicIds] : item.coversTopicIds;
    for (const id of ids) {
      const name = topicName(id);
      if (name) names.add(name);
    }
    byDate.set(item.scheduledDate, names);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, names]) => {
      const list = [...names];
      const summary =
        list.length === 0
          ? "Revision session"
          : list.length <= 2
            ? `Revise: ${list.join(", ")}`
            : `Revise: ${list.slice(0, 2).join(", ")} +${list.length - 2}`;
      return {
        id: `revision-${date}`,
        kind: "REVISION" as const,
        date,
        label: summary,
        href: "/roadmap",
      };
    });
}
