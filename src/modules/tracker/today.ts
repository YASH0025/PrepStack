import "server-only";

import { ROUND_TYPE_LABELS } from "@/lib/domain";
import { todayIn } from "@/lib/local-date";

import { debriefsFor } from "./debrief-service";
import { dueFollowUps } from "./domain/reminders";
import { countdown, inSheetWindow, nextInterview, pendingDebriefs } from "./domain/today";
import { CLOSED_STATUSES, type Mode } from "./schemas";
import { trackerFor } from "./service";

export interface TrackerToday {
  next: {
    roundId: string;
    companyName: string;
    label: string;
    startUtc: string;
    endUtc: string;
    mode: Mode;
    countdown: string;
    showSheet: boolean;
  } | null;
  pendingDebriefs: { roundId: string; companyName: string; label: string; startUtc: string }[];
  followUps: {
    key: string;
    companyName: string;
    date: string;
    note: string | null;
    href: string;
  }[];
  /** Companies of open applications (for community reports). */
  trackedCompanies: string[];
}

/** What the Today dashboard needs from the user's own tracker. */
export async function trackerToday(
  userId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<TrackerToday> {
  const tracker = trackerFor(userId);
  const [rounds, applications, withDebrief] = await Promise.all([
    tracker.listRounds(),
    tracker.listApplications(),
    debriefsFor(userId).roundIdsWithDebrief(),
  ]);
  const company = new Map(applications.map((app) => [app.id, app.companyName]));
  const label = (round: (typeof rounds)[number]) => round.title ?? ROUND_TYPE_LABELS[round.type];

  const next = nextInterview(rounds, now);
  return {
    next: next && {
      roundId: next.id,
      companyName: company.get(next.applicationId) ?? "Interview",
      label: label(next),
      startUtc: next.startUtc,
      endUtc: next.endUtc,
      mode: next.mode,
      countdown: countdown(next.startUtc, now),
      showSheet: inSheetWindow(next, now),
    },
    pendingDebriefs: pendingDebriefs(rounds, withDebrief, now)
      .slice(0, 5)
      .map((round) => ({
        roundId: round.id,
        companyName: company.get(round.applicationId) ?? "Interview",
        label: label(round),
        startUtc: round.startUtc,
      })),
    followUps: dueFollowUps(rounds, applications, todayIn(timezone, now), CLOSED_STATUSES)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5)
      .map((item) => ({
        key: item.key,
        companyName: company.get(item.applicationId) ?? "Application",
        date: item.date,
        note: item.note,
        href: item.roundId ? `/interviews/calendar?round=${item.roundId}` : "/interviews/tracker",
      })),
    trackedCompanies: [
      ...new Set(
        applications
          .filter((app) => !CLOSED_STATUSES.includes(app.status))
          .map((app) => app.companyName),
      ),
    ],
  };
}
