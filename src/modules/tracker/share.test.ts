import { describe, expect, it } from "vitest";

import { getCommunityService } from "@/modules/community/service";

import { DebriefInputSchema } from "./debrief-schemas";
import { debriefsFor } from "./debrief-service";
import { companyMismatch, initialShareDraft, scrubEditedDraft, shareContext } from "./share";
import { trackerFor } from "./service";

const USER = { id: "79797979-7979-4797-8797-797979797979", email: "dev.person@example.com" };

describe("share anonymized version", () => {
  it("removes people, contacts and salaries from the draft and its edits", async () => {
    const tracker = trackerFor(USER.id);
    const app = await tracker.createApplication({
      companyName: "Umbrella Labs",
      jobTitle: "Senior Frontend Engineer",
      technologies: ["React"],
      jobLink: null,
      source: "REFERRAL",
      referrerName: "Kiran Mehta",
      agency: null,
      appliedOn: null,
      status: "TECHNICAL_INTERVIEW",
      expectedSalary: "32 LPA",
      offeredSalary: null,
      offerJoiningDate: null,
      notes: "secret notes",
      followUpDate: null,
      outcome: null,
    });
    const { round } = await tracker.createRound({
      applicationId: app.id,
      type: "TECHNICAL",
      title: null,
      date: "2026-09-21",
      startTime: "11:00",
      durationMinutes: 50,
      timezone: "UTC",
      mode: "VIDEO",
      meetingLink: "https://meet.example.com/abc-defg",
      location: null,
      people: {
        hr: { name: "Neha Kapoor", email: "neha@umbrella.test", phone: "", linkedin: "" },
        interviewers: [{ name: "Arjun Iyer", designation: "", linkedin: "" }],
        panel: [],
      },
      reminderMinutes: [],
      notes: null,
    });
    await debriefsFor(USER.id).save(
      round.id,
      DebriefInputSchema.parse({
        questions: [
          {
            text: "Arjun asked how Umbrella Labs renders 10k rows; Kiran had warned me",
            topicId: "",
            topicLabel: "Virtualization",
            type: "CONCEPT",
            selfRating: "PARTIAL",
            answerNotes: "private answer notes",
            linkedStoryId: "",
            needsStory: false,
            addToReview: false,
          },
        ],
        codingProblem: "",
        systemDesignPrompt: "",
        takeHome: "",
        interviewerFeedback: "Arjun said I was great",
        feeling: "",
        nextSteps: "",
        lessons: "",
        overallRating: "4",
        difficulty: "3",
        actualDurationMinutes: 47,
        followUpActions: "",
      }),
    );

    const context = await shareContext(USER, round.id);
    const { draft, findings } = initialShareDraft(context, "4-6", "Asia/Kolkata");
    expect(draft.companyName).toBe("Umbrella Labs");
    expect(draft.monthYear).toBe("2026-09");
    expect(draft.rounds[0]?.durationMinutes).toBe(45);
    expect(draft.rounds[0]?.questions[0]?.text).toBe(
      "[name removed] asked how Umbrella Labs renders 10k rows; [name removed] had warned me",
    );
    expect(findings.filter((finding) => finding.kind === "NAME")).toHaveLength(2);
    const serialized = JSON.stringify(draft);
    for (const secret of [
      "Neha",
      "Arjun",
      "Kiran",
      "32 LPA",
      "private answer",
      "secret notes",
      "great",
    ]) {
      expect(serialized).not.toContain(secret);
    }

    // Edits are scrubbed again with the same private terms.
    const edited = scrubEditedDraft(context, {
      ...draft,
      summary: "Thanks Neha Kapoor (neha@umbrella.test), they offered 32 LPA",
    });
    expect(edited.draft.summary).toBe(
      "Thanks [name removed] ([email removed]), they offered [amount removed]",
    );

    // A name typed into the company field is neither exempted nor kept.
    const sneaky = scrubEditedDraft(context, {
      ...draft,
      companyName: "Umbrella Labs via Neha",
      summary: "Neha Kapoor helped",
    });
    expect(sneaky.draft.companyName).toBe("Umbrella Labs via [name removed]");
    expect(sneaky.draft.summary).toBe("[name removed] helped");
    expect(companyMismatch(context, { ...draft, companyName: "Umbrella Labs via Neha" })).toMatch(
      /must stay "Umbrella Labs"/,
    );
    expect(companyMismatch(context, { ...draft, companyName: "UMBRELLA labs" })).toBeNull();

    // Publishing stores no link back; only the private debrief remembers the report.
    const report = await getCommunityService().submit(edited.draft);
    await debriefsFor(USER.id).markPublished(round.id, report.id);
    expect((await debriefsFor(USER.id).get(round.id))?.publishedReportIds).toEqual([report.id]);
    expect(JSON.stringify(report)).not.toContain(round.id);
    expect(JSON.stringify(report)).not.toContain(USER.id);
  });
});
