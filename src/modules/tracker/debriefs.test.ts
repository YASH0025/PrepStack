import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { privatePath } from "@/lib/storage/paths";

import { DebriefInputSchema } from "./debrief-schemas";
import { debriefsFor } from "./debrief-service";
import { trackerFor } from "./service";

const USER = "78787878-7878-4787-8787-787878787878";

const debriefInput = (overrides: Record<string, unknown> = {}) =>
  DebriefInputSchema.parse({
    questions: [
      {
        text: "Explain closures",
        topicId: "",
        topicLabel: "Closures",
        type: "CONCEPT",
        selfRating: "MISSED",
        answerNotes: "Function + lexical scope",
        linkedStoryId: "",
        needsStory: false,
        addToReview: true,
      },
      {
        text: "Reverse a linked list",
        topicId: "",
        topicLabel: "",
        type: "CODING",
        selfRating: "NAILED",
        answerNotes: "",
        linkedStoryId: "",
        needsStory: false,
        addToReview: true,
      },
    ],
    codingProblem: "",
    systemDesignPrompt: "",
    takeHome: "",
    interviewerFeedback: "Secret feedback from the panel",
    feeling: "",
    nextSteps: "",
    lessons: "",
    overallRating: "3",
    difficulty: "4",
    actualDurationMinutes: 50,
    followUpActions: "",
    ...overrides,
  });

describe("DebriefService", () => {
  it("saves one debrief per round, encrypts notes, completes the round and keeps question ids", async () => {
    const tracker = trackerFor(USER);
    const app = await tracker.createApplication({
      companyName: "Acme",
      jobTitle: "SDE",
      technologies: [],
      jobLink: null,
      source: "LINKEDIN",
      referrerName: null,
      agency: null,
      appliedOn: null,
      status: "APPLIED",
      expectedSalary: null,
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
      date: "2026-10-05",
      startTime: "10:00",
      durationMinutes: 60,
      timezone: "UTC",
      mode: "VIDEO",
      meetingLink: null,
      location: null,
      people: { hr: { name: "", email: "", phone: "", linkedin: "" }, interviewers: [], panel: [] },
      reminderMinutes: [],
      notes: null,
    });

    const service = debriefsFor(USER);
    const first = await service.save(round.id, debriefInput());
    expect(first.created).toBe(true);
    // Only partial/missed questions marked for review.
    expect(first.reviewQuestions.map((question) => question.text)).toEqual(["Explain closures"]);
    expect((await tracker.getRound(round.id))?.status).toBe("COMPLETED");

    const onDisk = await readFile(privatePath(USER, "debriefs.json"), "utf8");
    expect(onDisk).not.toContain("Secret feedback");
    expect(onDisk).not.toContain("Function + lexical scope");
    expect((await service.get(round.id))?.interviewerFeedback).toBe(
      "Secret feedback from the panel",
    );

    // Editing keeps the record and the ids of existing questions.
    const questionId = first.debrief.questions[0]?.id;
    const edited = DebriefInputSchema.parse({
      ...debriefInput(),
      questions: [{ ...debriefInput().questions[0], id: questionId, selfRating: "PARTIAL" }],
    });
    const second = await service.save(round.id, edited);
    expect(second.created).toBe(false);
    expect(second.debrief.id).toBe(first.debrief.id);
    expect(second.debrief.questions).toHaveLength(1);
    expect(second.debrief.questions[0]?.id).toBe(questionId);

    expect(await service.weakness()).toEqual({});
    await service.deleteForRounds([round.id]);
    expect(await service.get(round.id)).toBeNull();
  });

  it("refuses debriefs for cancelled rounds", async () => {
    const tracker = trackerFor(USER);
    const [app] = await tracker.listApplications();
    const { round } = await tracker.createRound({
      applicationId: app?.id as string,
      type: "HR",
      title: null,
      date: "2026-10-06",
      startTime: "10:00",
      durationMinutes: 30,
      timezone: "UTC",
      mode: "PHONE",
      meetingLink: null,
      location: null,
      people: { hr: { name: "", email: "", phone: "", linkedin: "" }, interviewers: [], panel: [] },
      reminderMinutes: [],
      notes: null,
    });
    await tracker.cancelRound(round.id, "Position filled", "COMPANY");
    await expect(debriefsFor(USER).save(round.id, debriefInput())).rejects.toThrow(
      /did not take place/,
    );
  });
});
