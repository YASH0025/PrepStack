import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { privatePath } from "@/lib/storage/paths";

import { ApplicationInputSchema, RoundInputSchema } from "./schemas";
import { trackerFor } from "./service";

const USER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const applicationInput = ApplicationInputSchema.parse({
  companyName: "Acme Pvt Ltd",
  jobTitle: "Senior Frontend Engineer",
  technologies: ["React"],
  jobLink: "",
  source: "REFERRAL",
  referrerName: "Rahul Verma",
  agency: "",
  appliedOn: "2026-10-01",
  status: "APPLIED",
  expectedSalary: "32 LPA",
  offeredSalary: "",
  offerJoiningDate: "",
  notes: "Recruiter said budget is flexible",
  followUpDate: "",
  outcome: "",
});

function roundInput(applicationId: string, date = "2026-10-12") {
  return RoundInputSchema.parse({
    applicationId,
    type: "TECHNICAL",
    title: "",
    date,
    startTime: "11:00",
    durationMinutes: 60,
    timezone: "Asia/Kolkata",
    mode: "VIDEO",
    meetingLink: "https://meet.example.com/abc",
    location: "",
    people: {
      hr: {
        name: "Priya Sharma",
        email: "priya@acme.example",
        phone: "+91 98765 43210",
        linkedin: "",
      },
      interviewers: [{ name: "Arjun Mehta", designation: "Staff Engineer", linkedin: "" }],
      panel: [],
    },
    reminderMinutes: [1440, 60],
    notes: "",
  });
}

describe("TrackerService", () => {
  it("never writes salaries, notes, referrers or people details in plain text", async () => {
    const tracker = trackerFor(USER);
    const application = await tracker.createApplication(applicationInput);
    await tracker.createRound(roundInput(application.id));

    const applicationsFile = await readFile(privatePath(USER, "applications.json"), "utf8");
    const roundsFile = await readFile(privatePath(USER, "rounds.json"), "utf8");
    for (const secret of ["32 LPA", "Rahul Verma", "budget is flexible"]) {
      expect(applicationsFile).not.toContain(secret);
    }
    for (const secret of ["Priya", "priya@acme", "98765", "Arjun", "Staff Engineer"]) {
      expect(roundsFile).not.toContain(secret);
    }

    // ...but the owner gets them back decrypted.
    const loaded = await tracker.getApplication(application.id);
    expect(loaded?.expectedSalary).toBe("32 LPA");
    expect(loaded?.companyKey).toBe("acme");
    const [round] = await tracker.roundsForApplication(application.id);
    expect(round?.people.hr.email).toBe("priya@acme.example");
    expect(round?.people.interviewers[0]?.name).toBe("Arjun Mehta");
  });

  it("numbers rounds, stores UTC, advances the application stage and adds a checklist", async () => {
    const tracker = trackerFor(USER);
    const application = await tracker.createApplication(applicationInput);
    const { round, applicationStatus } = await tracker.createRound(roundInput(application.id));
    expect(round.roundNumber).toBe(1);
    expect(round.startUtc).toBe("2026-10-12T05:30:00.000Z");
    expect(applicationStatus).toBe("TECHNICAL_INTERVIEW");
    expect(round.prepChecklist.length).toBeGreaterThan(0);
    const second = await tracker.createRound(roundInput(application.id, "2026-10-15"));
    expect(second.round.roundNumber).toBe(2);
  });

  it("reschedules by creating a linked round and marking the old one", async () => {
    const tracker = trackerFor(USER);
    const application = await tracker.createApplication(applicationInput);
    const { round } = await tracker.createRound(roundInput(application.id));
    const replacement = await tracker.rescheduleRound(round.id, {
      date: "2026-10-14",
      startTime: "15:00",
      durationMinutes: 45,
      timezone: "Asia/Kolkata",
      reason: "Interviewer unavailable",
      cancelledBy: "COMPANY",
    });
    const old = await tracker.getRound(round.id);
    expect(old?.status).toBe("RESCHEDULED");
    expect(old?.rescheduledToId).toBe(replacement.id);
    expect(replacement.rescheduledFromId).toBe(round.id);
    expect(replacement.roundNumber).toBe(round.roundNumber);
    expect(replacement.people.hr.name).toBe("Priya Sharma");
    await expect(
      tracker.rescheduleRound(round.id, {
        date: "2026-10-20",
        startTime: "10:00",
        durationMinutes: 30,
        timezone: "Asia/Kolkata",
        reason: "",
        cancelledBy: "ME",
      }),
    ).rejects.toThrow(/Only scheduled/);
  });

  it("deletes an application with its rounds and cleans custom values", async () => {
    const tracker = trackerFor(USER);
    const application = await tracker.createApplication(applicationInput);
    await tracker.createRound(roundInput(application.id));
    const field = await tracker.createCustomField({ name: "Team", type: "TEXT", options: [] });
    await tracker.setCustomValue(application.id, field.id, "Payments");
    expect((await tracker.getApplication(application.id))?.customValues[field.id]).toBe("Payments");
    await tracker.deleteCustomField(field.id);
    expect((await tracker.getApplication(application.id))?.customValues).toEqual({});

    const deletedRounds = await tracker.deleteApplication(application.id);
    expect(deletedRounds).toEqual([{ id: expect.any(String), storageKeys: [] }]);
    expect(await tracker.getApplication(application.id)).toBeNull();
    expect(await tracker.roundsForApplication(application.id)).toEqual([]);
  });
});
