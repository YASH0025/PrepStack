import { addDays } from "@/lib/local-date";

import { detectConflicts } from "./rounds";

/*
 * Pure rules for what is "due" for a user's interviews at a given moment.
 * Scheduled jobs and on-read checks both use these, so the app behaves the
 * same whether or not the cron has run.
 */

interface ReminderRound {
  id: string;
  status: string;
  startUtc: string;
  endUtc: string;
  reminderMinutes: number[];
  sentReminders: { key: string }[];
}

/** Idempotency key for one reminder offset. Includes the start time so editing the time re-arms it. */
export function reminderKey(minutesBefore: number, startUtc: string): string {
  return `reminder:${minutesBefore}:${startUtc}`;
}

export interface DueReminder {
  roundId: string;
  /** The offset to announce (the closest one when several are due at once). */
  minutesBefore: number;
  /** Every key that should be marked as sent, so skipped offsets never fire later. */
  keys: string[];
}

/**
 * The reminder to send for a scheduled round, or null. A reminder is due once
 * its time has passed and the round has not started. If several offsets are
 * due at once (for example a round created 30 minutes ahead with a 1-day
 * reminder), only one is sent.
 */
export function dueReminder(round: ReminderRound, now: Date): DueReminder | null {
  if (round.status !== "SCHEDULED") return null;
  const start = new Date(round.startUtc).getTime();
  if (now.getTime() >= start) return null;
  const sent = new Set(round.sentReminders.map((entry) => entry.key));
  const due = round.reminderMinutes
    .filter((minutes) => start - minutes * 60_000 <= now.getTime())
    .filter((minutes) => !sent.has(reminderKey(minutes, round.startUtc)))
    .sort((a, b) => a - b);
  const closest = due[0];
  if (closest === undefined) return null;
  return {
    roundId: round.id,
    minutesBefore: closest,
    keys: due.map((minutes) => reminderKey(minutes, round.startUtc)),
  };
}

export const DEBRIEF_PROMPT_DELAY_MINUTES = 60;
const DEBRIEF_PROMPT_WINDOW_DAYS = 7;

/**
 * True when a round should get a "How did it go?" prompt: one hour after its
 * scheduled end, for up to a week, if it was not cancelled or moved and has
 * no debrief yet.
 */
export function needsDebriefPrompt(
  round: { status: string; endUtc: string },
  now: Date,
  hasDebrief: boolean,
): boolean {
  if (hasDebrief) return false;
  if (round.status !== "SCHEDULED" && round.status !== "COMPLETED") return false;
  const promptAt = new Date(round.endUtc).getTime() + DEBRIEF_PROMPT_DELAY_MINUTES * 60_000;
  const expires = promptAt + DEBRIEF_PROMPT_WINDOW_DAYS * 24 * 60 * 60_000;
  return now.getTime() >= promptAt && now.getTime() <= expires;
}

const FOLLOW_UP_WINDOW_DAYS = 14;

export interface DueFollowUp {
  key: string;
  date: string;
  roundId?: string;
  applicationId: string;
  note: string | null;
}

/**
 * Follow-ups whose date is today or in the last two weeks (in the user's
 * timezone). Older ones are considered stale and not announced.
 */
export function dueFollowUps(
  rounds: {
    id: string;
    applicationId: string;
    status: string;
    followUpDate: string | null;
    followUpNote: string | null;
  }[],
  applications: { id: string; followUpDate: string | null; status: string }[],
  today: string,
  closedStatuses: readonly string[],
): DueFollowUp[] {
  const earliest = addDays(today, -FOLLOW_UP_WINDOW_DAYS);
  const inWindow = (date: string | null): date is string =>
    date !== null && date <= today && date >= earliest;
  const closed = new Set(
    applications.filter((app) => closedStatuses.includes(app.status)).map((app) => app.id),
  );
  const items: DueFollowUp[] = [];
  for (const round of rounds) {
    if (!inWindow(round.followUpDate) || closed.has(round.applicationId)) continue;
    if (round.status === "CANCELLED" || round.status === "RESCHEDULED") continue;
    items.push({
      key: `follow-up:round:${round.id}:${round.followUpDate}`,
      date: round.followUpDate,
      roundId: round.id,
      applicationId: round.applicationId,
      note: round.followUpNote,
    });
  }
  for (const app of applications) {
    if (!inWindow(app.followUpDate) || closed.has(app.id)) continue;
    items.push({
      key: `follow-up:application:${app.id}:${app.followUpDate}`,
      date: app.followUpDate,
      applicationId: app.id,
      note: null,
    });
  }
  return items;
}

/** Overlapping future scheduled rounds, each pair with a stable key. */
export function upcomingConflicts<
  T extends { id: string; startUtc: string; endUtc: string; status: "SCHEDULED" | string },
>(rounds: T[], now: Date): { key: string; a: T; b: T }[] {
  const future = rounds.filter((round) => new Date(round.endUtc).getTime() > now.getTime());
  return detectConflicts(
    future as (T & { status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED" })[],
  ).map(([a, b]) => ({ key: `conflict:${a.id}:${a.startUtc}:${b.id}:${b.startUtc}`, a, b }));
}

/** "1 day", "2 hours", "30 minutes". */
export function describeOffset(minutes: number): string {
  if (minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60);
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${minutes} minutes`;
}
