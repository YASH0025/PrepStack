import { describe, expect, it } from "vitest";

import { type EmailMessage } from "@/lib/services/email";
import { runScheduledJobs } from "@/lib/services/scheduler";
import { notificationsFor } from "@/modules/notifications/service";

import { interviewJobs, syncInAppNotifications } from "./jobs";
import { trackerFor } from "./service";

const USER = "12121212-1212-4121-8121-121212121212";

const application = {
  technologies: [],
  jobLink: null,
  source: "LINKEDIN" as const,
  referrerName: "Secret Referrer",
  agency: null,
  appliedOn: null,
  status: "APPLIED" as const,
  expectedSalary: "40 LPA",
  offeredSalary: null,
  offerJoiningDate: null,
  notes: null,
  followUpDate: null,
  outcome: null,
};

const roundInput = (applicationId: string, date: string, startTime: string) => ({
  applicationId,
  type: "TECHNICAL" as const,
  title: null,
  date,
  startTime,
  durationMinutes: 60,
  timezone: "UTC",
  mode: "VIDEO" as const,
  meetingLink: "https://meet.example.com/x",
  location: null,
  people: {
    hr: { name: "Hidden HR", email: "hr@acme.test", phone: "", linkedin: "" },
    interviewers: [{ name: "Hidden Interviewer", designation: "", linkedin: "" }],
    panel: [],
  },
  reminderMinutes: [1440, 60],
  notes: null,
});

describe("interview jobs", () => {
  it("sends each reminder once, prompts debriefs, and keeps third-party details out of emails", async () => {
    const tracker = trackerFor(USER);
    const acme = await tracker.createApplication({
      ...application,
      companyName: "Acme",
      jobTitle: "SDE 2",
    });
    const { round } = await tracker.createRound(roundInput(acme.id, "2026-10-12", "10:00"));
    await tracker.createRound(roundInput(acme.id, "2026-10-12", "10:30"));

    const sent: EmailMessage[] = [];
    const jobs = interviewJobs({
      email: { send: async (message) => void sent.push(message) },
      userEmail: async () => "me@example.com",
      appUrl: "http://localhost:3000",
      hasDebrief: async () => false,
    });

    // One day before: the 1-day reminder for both rounds.
    const dayBefore = new Date("2026-10-11T10:35:00.000Z");
    const first = await runScheduledJobs(jobs, [USER], dayBefore);
    expect(first.results["interview-reminders"]).toEqual({ handled: 2, failures: 0 });
    expect(first.results.conflicts?.handled).toBe(1);

    // Running again at the same moment sends nothing new.
    const again = await runScheduledJobs(jobs, [USER], dayBefore);
    expect(again.results["interview-reminders"]?.handled).toBe(0);
    expect(again.results.conflicts?.handled).toBe(0);
    expect(sent).toHaveLength(2);

    const email = sent[0] as EmailMessage;
    expect(email.to).toBe("me@example.com");
    expect(email.subject).toContain("Acme");
    expect(email.subject).toContain("1 day");
    expect(email.text).toContain("https://meet.example.com/x");
    for (const secret of [
      "Hidden HR",
      "hr@acme.test",
      "Hidden Interviewer",
      "Secret Referrer",
      "40 LPA",
    ]) {
      expect(email.text).not.toContain(secret);
      expect(email.subject).not.toContain(secret);
    }

    // Two hours after the first round ends: debrief prompt, in-app only.
    const after = new Date("2026-10-12T12:30:00.000Z");
    await syncInAppNotifications(USER, after, async () => false);
    await syncInAppNotifications(USER, after, async () => false);
    const prompts = (await notificationsFor(USER).list()).filter(
      (n) => n.type === "DEBRIEF_PROMPT",
    );
    expect(prompts).toHaveLength(2);
    expect(prompts.some((n) => n.href.includes(round.id))).toBe(true);
    expect(sent).toHaveLength(2);
  });

  it("does not prompt for rounds that already have a debrief, and announces follow-ups once", async () => {
    const user = "34343434-3434-4343-8343-343434343434";
    const tracker = trackerFor(user);
    const globex = await tracker.createApplication({
      ...application,
      companyName: "Globex",
      jobTitle: "Frontend",
      followUpDate: "2026-10-12",
    });
    await tracker.createRound(roundInput(globex.id, "2026-10-10", "09:00"));

    const now = new Date("2026-10-12T08:00:00.000Z");
    await syncInAppNotifications(user, now, async () => true);
    await syncInAppNotifications(user, now, async () => true);
    const list = await notificationsFor(user).list();
    expect(list.filter((n) => n.type === "DEBRIEF_PROMPT")).toHaveLength(0);
    expect(list.filter((n) => n.type === "FOLLOW_UP_DUE")).toHaveLength(1);
  });
});
