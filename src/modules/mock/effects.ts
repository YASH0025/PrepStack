import "server-only";

import { formatInTimeZone } from "date-fns-tz";

import { levelForBand } from "@/lib/domain";
import { type EmailService } from "@/lib/services/email";
import { type ScheduledJob } from "@/lib/services/scheduler";
import { getContentService } from "@/modules/content/service";
import { notificationsFor } from "@/modules/notifications/service";
import { getProfile } from "@/modules/profile/service";
import { reviewServiceFor } from "@/modules/review/service";
import { roadmapServiceFor } from "@/modules/roadmap/service";

import { mockFor } from "./service";

const REMINDER_MINUTES = 60;

/**
 * Everything mock interviews do to ONE user's own data, computed in that
 * user's context (page load or the scheduler, per user): notifications,
 * review cards for missed questions, and a roadmap re-plan when new
 * feedback arrives. Nobody ever writes into another user's private files.
 */
export async function syncMockForUser(userId: string, now: Date = new Date()): Promise<number> {
  const mock = mockFor(userId);
  const profile = await mock.profile();
  if (!profile) return 0;
  const notifications = notificationsFor(userId);
  const when = (startUtc: string) =>
    formatInTimeZone(new Date(startUtc), profile.timezone, "EEE d MMM, HH:mm");
  let handled = 0;

  for (const view of await mock.mySessions()) {
    const { session, partner } = view;
    const href = `/practice/mock/sessions/${session.id}`;
    const notify = async (key: string, title: string, body: string) => {
      const created = await notifications.notify({
        type: "MOCK_INTERVIEW",
        title,
        body,
        href,
        dedupeKey: `mock:${key}:${session.id}`,
      });
      if (created) handled += 1;
    };
    const start = Date.parse(session.startUtc);
    // The partner changed the meeting link: tell me, so a swapped link never goes unnoticed.
    if (
      session.status === "SCHEDULED" &&
      session.meetingLinkUpdatedAt &&
      session.meetingLinkSetBy &&
      session.meetingLinkSetBy !== userId
    ) {
      await notifications.notify({
        type: "MOCK_INTERVIEW",
        title: `${partner.displayName} changed the meeting link`,
        body: session.meetingLink
          ? `New link: ${new URL(session.meetingLink).host}. Check it before joining.`
          : "The meeting link was removed.",
        href,
        dedupeKey: `mock:link:${session.id}:${session.meetingLinkUpdatedAt}`,
      });
    }
    if (session.status === "SCHEDULED" && start > now.getTime()) {
      await notify("booked", `Mock interview with ${partner.displayName}`, when(session.startUtc));
      if (start - now.getTime() <= REMINDER_MINUTES * 60_000) {
        await notify(
          "soon",
          `Mock interview starts soon`,
          `With ${partner.displayName} at ${when(session.startUtc)}`,
        );
      }
    }
    if (session.status === "CANCELLED" && session.cancelledBy && session.cancelledBy !== userId) {
      await notify(
        "cancelled",
        `${partner.displayName} cancelled your mock interview`,
        when(session.startUtc),
      );
    }
    if (session.status === "NO_SHOW" && session.noShowUserId === userId) {
      await notify(
        "noshow",
        "You were marked as a no-show",
        "Two no-shows within 30 days pause booking for a week.",
      );
    }
  }

  // New feedback: notify, add review cards for missed/partial answers, re-plan.
  const received = await mock.feedbackReceived();
  if (received.length > 0) {
    const level = levelForBand(profile.band);
    const content = getContentService();
    const review = reviewServiceFor(userId);
    let newFeedback = false;
    for (const feedback of received) {
      const created = await notifications.notify({
        type: "MOCK_INTERVIEW",
        title: "New mock interview feedback",
        body: "Your partner rated your answers. Missed questions are now in your review.",
        href: `/practice/mock/sessions/${feedback.sessionId}`,
        dedupeKey: `mock:feedback:${feedback.id}`,
      });
      if (!created) continue;
      newFeedback = true;
      handled += 1;
      for (const item of feedback.questions) {
        if (item.rating === "NAILED") continue;
        const question = await content.question(item.questionId);
        if (!question) continue;
        const answer =
          question.answers.find((entry) => entry.level === level) ?? question.answers[0];
        await review.addFromSource({
          sourceType: "MOCK_QUESTION",
          sourceId: `${feedback.id}:${item.questionId}`,
          topicId: question.topicId,
          prompt: question.prompt,
          answer: answer?.answer ?? "",
        });
      }
    }
    if (newFeedback) {
      const userProfile = await getProfile(userId);
      const roadmap = roadmapServiceFor(userId);
      if (userProfile?.onboardingCompletedAt && (await roadmap.get())) {
        await roadmap.regenerate(userProfile);
      }
    }
  }
  return handled;
}

export interface MockJobDeps {
  email: EmailService;
  appUrl: string;
  userEmail: (userId: string) => Promise<string | null>;
}

/** Per-user scheduler jobs: in-app sync and the 1-hour reminder email. */
export function mockJobs(deps: MockJobDeps): ScheduledJob[] {
  return [
    { name: "mock-sync", run: ({ userId, now }) => syncMockForUser(userId, now) },
    {
      name: "mock-reminders",
      run: async ({ userId, now }) => {
        const mock = mockFor(userId);
        const profile = await mock.profile();
        if (!profile) return 0;
        let sent = 0;
        for (const { session, partner } of await mock.mySessions()) {
          const start = Date.parse(session.startUtc);
          if (session.status !== "SCHEDULED" || session.remindedUserIds.includes(userId)) continue;
          if (start <= now.getTime() || start - now.getTime() > REMINDER_MINUTES * 60_000) continue;
          const to = await deps.userEmail(userId);
          if (to) {
            const link = new URL(`/practice/mock/sessions/${session.id}`, deps.appUrl).toString();
            await deps.email.send({
              to,
              subject: "Your mock interview starts within the hour",
              text: [
                `Your mock interview with ${partner.displayName} starts at ${formatInTimeZone(new Date(session.startUtc), profile.timezone, "HH:mm")} (${profile.timezone}).`,
                "",
                `Open the session for the meeting link and your questions: ${link}`,
              ].join("\n"),
            });
            sent += 1;
          }
          await mock.markReminded(session.id);
        }
        return sent;
      },
    },
  ];
}
