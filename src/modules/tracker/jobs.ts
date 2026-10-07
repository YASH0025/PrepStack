import "server-only";

import { formatInTimeZone } from "date-fns-tz";

import { ROUND_TYPE_LABELS } from "@/lib/domain";
import { formatRoundTime, timezoneLabel } from "@/lib/format";
import { type EmailService } from "@/lib/services/email";
import { type ScheduledJob } from "@/lib/services/scheduler";
import { notificationsFor } from "@/modules/notifications/service";
import { getProfile } from "@/modules/profile/service";

import {
  describeOffset,
  dueFollowUps,
  dueReminder,
  needsDebriefPrompt,
  upcomingConflicts,
} from "./domain/reminders";
import { CLOSED_STATUSES, MODE_LABELS, type Round } from "./schemas";
import { trackerFor } from "./service";

/*
 * Scheduled work for the private tracker. Every job is idempotent: reminders
 * are tracked per round (sentReminders) and notifications carry dedupe keys,
 * so running a job twice never notifies twice.
 *
 * Email is used ONLY for interview reminders (Resend's free tier is capped);
 * debrief prompts, follow-ups and conflicts are in-app only.
 */

export interface InterviewJobDeps {
  email: EmailService;
  /** System lookup of the user's email address. */
  userEmail: (userId: string) => Promise<string | null>;
  appUrl: string;
  /** Whether a round already has a debrief (no prompt needed). */
  hasDebrief: (userId: string, roundId: string) => Promise<boolean>;
}

const roundHref = (roundId: string) => `/interviews/calendar?round=${roundId}`;

async function context(userId: string) {
  const tracker = trackerFor(userId);
  const [profile, rounds, applications] = await Promise.all([
    getProfile(userId),
    tracker.listRounds(),
    tracker.listApplications(),
  ]);
  const company = new Map(applications.map((app) => [app.id, app]));
  return { tracker, rounds, applications, company, timezone: profile?.timezone ?? "UTC" };
}

function roundLabel(round: Round): string {
  return round.title ?? `${ROUND_TYPE_LABELS[round.type]} round`;
}

/** Sends due interview reminders by email and in-app. Returns how many were sent. */
export async function sendInterviewReminders(
  userId: string,
  now: Date,
  deps: InterviewJobDeps,
): Promise<number> {
  const { tracker, rounds, company, timezone } = await context(userId);
  const notifications = notificationsFor(userId);
  let sent = 0;
  for (const round of rounds) {
    const due = dueReminder(round, now);
    if (!due) continue;
    const app = company.get(round.applicationId);
    const name = app?.companyName ?? "your interview";
    const when = `${formatRoundTime(round.startUtc, round.endUtc, timezone)} (${timezoneLabel(
      timezone,
      new Date(round.startUtc),
    )})`;
    const title = `${name}: ${roundLabel(round)} in ${describeOffset(due.minutesBefore)}`;

    const to = await deps.userEmail(userId);
    if (to) {
      const where =
        round.mode === "ONSITE"
          ? round.location
            ? `Location: ${round.location}`
            : "Mode: On-site"
          : round.meetingLink
            ? `Join: ${round.meetingLink}`
            : `Mode: ${MODE_LABELS[round.mode]}`;
      await deps.email.send({
        to,
        subject: `Reminder: ${title}`,
        text: [
          `Your ${roundLabel(round)} with ${name}${app?.jobTitle ? ` (${app.jobTitle})` : ""} starts ${when}.`,
          where,
          "",
          `Open it in PrepStack: ${new URL(roundHref(round.id), deps.appUrl).toString()}`,
          "",
          "Good luck! You can change reminders for this round from its calendar panel.",
        ].join("\n"),
      });
    }
    await notifications.notify({
      type: "INTERVIEW_REMINDER",
      title,
      body: `Starts ${when}.`,
      href: roundHref(round.id),
      dedupeKey: `reminder:${round.id}:${due.keys[0]}`,
    });
    for (const key of due.keys) await tracker.markReminderSent(round.id, key, now);
    sent += 1;
  }
  return sent;
}

/** "How did it go?" prompts one hour after a round's scheduled end. */
export async function createDebriefPrompts(
  userId: string,
  now: Date,
  hasDebrief: InterviewJobDeps["hasDebrief"],
): Promise<number> {
  const { rounds, company } = await context(userId);
  const notifications = notificationsFor(userId);
  let created = 0;
  for (const round of rounds) {
    const debriefed = await hasDebrief(userId, round.id);
    if (!needsDebriefPrompt(round, now, debriefed)) continue;
    const name = company.get(round.applicationId)?.companyName ?? "your interview";
    const result = await notifications.notify({
      type: "DEBRIEF_PROMPT",
      title: `How did it go at ${name}?`,
      body: `Take two minutes to debrief your ${roundLabel(round)} while it is fresh. Missed questions go straight into review.`,
      href: roundHref(round.id),
      dedupeKey: `debrief-prompt:${round.id}:${round.endUtc}`,
    });
    if (result) created += 1;
  }
  return created;
}

/** In-app reminders for follow-up dates on rounds and applications. */
export async function createFollowUpNotifications(userId: string, now: Date): Promise<number> {
  const { rounds, applications, company, timezone } = await context(userId);
  const notifications = notificationsFor(userId);
  const today = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  let created = 0;
  for (const item of dueFollowUps(rounds, applications, today, CLOSED_STATUSES)) {
    const name = company.get(item.applicationId)?.companyName ?? "an application";
    const result = await notifications.notify({
      type: "FOLLOW_UP_DUE",
      title: `Follow up with ${name}`,
      body: item.note ?? "You planned to follow up today.",
      href: item.roundId
        ? roundHref(item.roundId)
        : `/interviews/tracker?app=${item.applicationId}`,
      dedupeKey: item.key,
    });
    if (result) created += 1;
  }
  return created;
}

/** One in-app warning per pair of overlapping upcoming rounds. */
export async function createConflictNotifications(userId: string, now: Date): Promise<number> {
  const { rounds, company, timezone } = await context(userId);
  const notifications = notificationsFor(userId);
  let created = 0;
  for (const { key, a, b } of upcomingConflicts(rounds, now)) {
    const nameA = company.get(a.applicationId)?.companyName ?? "One interview";
    const nameB = company.get(b.applicationId)?.companyName ?? "another";
    const result = await notifications.notify({
      type: "SYSTEM",
      title: `${nameA} and ${nameB} overlap`,
      body: `Both are scheduled around ${formatRoundTime(a.startUtc, a.endUtc, timezone)}. Consider rescheduling one.`,
      href: roundHref(a.id),
      dedupeKey: key,
    });
    if (result) created += 1;
  }
  return created;
}

/** All tracker jobs for the cron runner. */
export function interviewJobs(deps: InterviewJobDeps): ScheduledJob[] {
  return [
    {
      name: "interview-reminders",
      run: ({ userId, now }) => sendInterviewReminders(userId, now, deps),
    },
    {
      name: "debrief-prompts",
      run: ({ userId, now }) => createDebriefPrompts(userId, now, deps.hasDebrief),
    },
    { name: "follow-ups", run: ({ userId, now }) => createFollowUpNotifications(userId, now) },
    { name: "conflicts", run: ({ userId, now }) => createConflictNotifications(userId, now) },
  ];
}

/**
 * In-app checks computed on read (page loads), so prompts and follow-ups
 * appear even if the cron has not run. Emails are only sent by the cron.
 */
export async function syncInAppNotifications(
  userId: string,
  now: Date,
  hasDebrief: InterviewJobDeps["hasDebrief"],
): Promise<void> {
  await createDebriefPrompts(userId, now, hasDebrief);
  await createFollowUpNotifications(userId, now);
  await createConflictNotifications(userId, now);
}
