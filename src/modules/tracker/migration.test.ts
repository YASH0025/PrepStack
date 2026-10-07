import { describe, expect, it } from "vitest";

import { privatePath } from "@/lib/storage/paths";
import { readStored, writeStored } from "@/test/stored";

import { trackerFor } from "./service";

const USER = "7a7a7a7a-7a7a-47a7-87a7-7a7a7a7a7a7a";
const APP = "7b7b7b7b-7b7b-47b7-87b7-7b7b7b7b7b7b";
const ROUND = "7c7c7c7c-7c7c-47c7-87c7-7c7c7c7c7c7c";
const NOW = "2026-10-01T00:00:00.000Z";

describe("tracker storage v1 → v2", () => {
  it("encrypts plain-text notes and attachment names on first read", async () => {
    const applications = privatePath(USER, "applications.json");
    const rounds = privatePath(USER, "rounds.json");
    await writeStored(
      applications,
      JSON.stringify({
        schemaVersion: 1,
        records: [
          {
            id: APP,
            createdAt: NOW,
            updatedAt: NOW,
            companyName: "Acme",
            companyKey: "acme",
            jobTitle: "SDE",
            technologies: [],
            jobLink: null,
            source: "LINKEDIN",
            referrerName: null,
            agency: null,
            appliedOn: null,
            status: "REJECTED",
            expectedSalary: null,
            offeredSalary: null,
            offerJoiningDate: null,
            notes: null,
            followUpDate: null,
            outcome: "Rejected after talking to Asha",
            customValues: {},
            kanbanOrder: 0,
          },
        ],
      }),
    );
    await writeStored(
      rounds,
      JSON.stringify({
        schemaVersion: 1,
        records: [
          {
            id: ROUND,
            createdAt: NOW,
            updatedAt: NOW,
            applicationId: APP,
            roundNumber: 1,
            type: "HR",
            title: null,
            startUtc: "2026-09-01T10:00:00.000Z",
            endUtc: "2026-09-01T11:00:00.000Z",
            timezone: "UTC",
            mode: "VIDEO",
            meetingLink: null,
            location: null,
            status: "CANCELLED",
            result: "NOT_APPLICABLE",
            people: null,
            cancelReason: "Ravi cancelled",
            cancelledBy: "COMPANY",
            rescheduledFromId: null,
            rescheduledToId: null,
            reminderMinutes: [],
            followUpDate: null,
            followUpNote: "Email Ravi",
            prepChecklist: [],
            interviewerQuestions: [],
            notes: null,
            attachments: [
              {
                id: "7d7d7d7d-7d7d-47d7-87d7-7d7d7d7d7d7d",
                storageKey: "prepstack/x",
                fileName: "Offer_Asha_Rao.pdf",
                mimeType: "application/pdf",
                bytes: 10,
                uploadedAt: NOW,
              },
            ],
            sentReminders: [],
          },
        ],
      }),
    );

    const tracker = trackerFor(USER);
    const [app] = await tracker.listApplications();
    const [round] = await tracker.listRounds();
    expect(app?.outcome).toBe("Rejected after talking to Asha");
    expect([round?.cancelReason, round?.followUpNote]).toEqual(["Ravi cancelled", "Email Ravi"]);
    expect(round?.attachments[0]?.fileName).toBe("Offer_Asha_Rao.pdf");

    const onDisk = (await readStored(applications)) + (await readStored(rounds));
    for (const secret of ["Asha", "Ravi"]) expect(onDisk).not.toContain(secret);
    expect(JSON.parse(await readStored(rounds)).schemaVersion).toBe(2);
  });
});
