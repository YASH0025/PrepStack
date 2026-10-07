import { access } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { privateUserDir } from "@/lib/storage/paths";
import { getAuthCore, getUserRepository } from "@/modules/auth/service";
import { getCommunityService } from "@/modules/community/service";
import { DebriefInputSchema } from "@/modules/tracker/debrief-schemas";
import { debriefsFor } from "@/modules/tracker/debrief-service";
import { trackerFor } from "@/modules/tracker/service";

import { buildAccountExport, deleteAccount } from "./service";

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

async function userWithSharedReport(email: string) {
  const signup = await getAuthCore().signup({ email, password: "password123" });
  if (!signup.ok) throw new Error("signup failed");
  const userId = signup.user.id;
  const tracker = trackerFor(userId);
  const app = await tracker.createApplication({
    companyName: "Hooli",
    jobTitle: "SDE",
    technologies: [],
    jobLink: null,
    source: "LINKEDIN",
    referrerName: null,
    agency: null,
    appliedOn: null,
    status: "APPLIED",
    expectedSalary: "40 LPA",
    offeredSalary: null,
    offerJoiningDate: null,
    notes: null,
    followUpDate: null,
    outcome: null,
  });
  const { round } = await tracker.createRound({
    applicationId: app.id,
    type: "TECHNICAL",
    title: null,
    date: "2026-09-01",
    startTime: "10:00",
    durationMinutes: 60,
    timezone: "UTC",
    mode: "VIDEO",
    meetingLink: null,
    location: null,
    people: {
      hr: { name: "Gavin", email: "", phone: "", linkedin: "" },
      interviewers: [],
      panel: [],
    },
    reminderMinutes: [],
    notes: null,
  });
  await debriefsFor(userId).save(
    round.id,
    DebriefInputSchema.parse({
      questions: [],
      codingProblem: "",
      systemDesignPrompt: "",
      takeHome: "",
      interviewerFeedback: "Private feedback",
      feeling: "",
      nextSteps: "",
      lessons: "",
      overallRating: "3",
      difficulty: "3",
      actualDurationMinutes: null,
      followUpActions: "",
    }),
  );
  const community = getCommunityService();
  const report = await community.approve(
    (
      await community.submit({
        companyName: "Hooli",
        roleTitle: "SDE",
        technologies: [],
        experienceBand: "2-4",
        monthYear: "2026-09",
        outcome: "PENDING",
        overallDifficulty: 3,
        summary: "",
        rounds: [{ type: "TECHNICAL", difficulty: 3, durationMinutes: 60, questions: [] }],
      })
    ).id,
  );
  await debriefsFor(userId).markPublished(round.id, report.id);
  return { userId, reportId: report.id };
}

describe("account data", () => {
  it("exports the user's own data decrypted, without secrets", async () => {
    const { userId, reportId } = await userWithSharedReport("export.me@example.com");
    const data = await buildAccountExport(userId);
    expect(data.account?.email).toBe("export.me@example.com");
    expect(data.applications[0]?.expectedSalary).toBe("40 LPA");
    expect(data.rounds[0]?.people.hr.name).toBe("Gavin");
    expect(data.debriefs[0]?.interviewerFeedback).toBe("Private feedback");
    expect(data.sharedReports.map((report) => report.id)).toEqual([reportId]);
    const json = JSON.stringify(data);
    expect(json).not.toContain("passwordHash");
    expect(json).not.toContain("enc:v1:");
  });

  it("deletes everything private and keeps or removes shared reports as chosen", async () => {
    const keep = await userWithSharedReport("keep.reports@example.com");
    const voter = await getAuthCore().signup({
      email: "voter@example.com",
      password: "password123",
    });
    if (!voter.ok) throw new Error("signup failed");
    const community = getCommunityService();
    await community.toggleVote(keep.reportId, keep.userId);

    await deleteAccount(keep.userId, { reports: "ANONYMIZE" });
    expect(await exists(privateUserDir(keep.userId))).toBe(false);
    expect(await getUserRepository().getById(keep.userId)).toBeNull();
    const kept = await community.getPublished(keep.reportId);
    expect(kept?.usefulCount).toBe(0);

    const remove = await userWithSharedReport("remove.reports@example.com");
    await deleteAccount(remove.userId, { reports: "REMOVE" });
    expect(await community.get(remove.reportId)).toBeNull();
    expect(await getUserRepository().getById(remove.userId)).toBeNull();
  });
});
