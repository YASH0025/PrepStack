import { describe, expect, it } from "vitest";

import { DebriefInputSchema } from "../debrief-schemas";
import { earlierQuestionsAtCompany, questionsNeedingStories, weaknessByTopic } from "./debriefs";

const q = (id: string, topicId: string | null, selfRating: "NAILED" | "PARTIAL" | "MISSED") => ({
  id,
  text: `Question ${id}`,
  topicId,
  selfRating,
});

describe("weaknessByTopic", () => {
  it("counts missed and partial answers per topic and ignores nailed or untagged ones", () => {
    expect(
      weaknessByTopic([
        { questions: [q("1", "t1", "MISSED"), q("2", "t1", "PARTIAL"), q("3", "t2", "NAILED")] },
        { questions: [q("4", "t1", "MISSED"), q("5", null, "MISSED")] },
      ]),
    ).toEqual({ t1: { missed: 2, partial: 1 } });
  });
});

describe("earlierQuestionsAtCompany", () => {
  it("returns questions from other rounds at the same company, newest round first", () => {
    const rounds = [
      {
        id: "r1",
        companyKey: "acme",
        label: "Round 1 – Coding",
        date: "1 Oct",
        startUtc: "2026-10-01T05:00:00Z",
      },
      {
        id: "r2",
        companyKey: "acme",
        label: "Round 2 – Technical",
        date: "5 Oct",
        startUtc: "2026-10-05T05:00:00Z",
      },
      {
        id: "r3",
        companyKey: "globex",
        label: "Round 1",
        date: "3 Oct",
        startUtc: "2026-10-03T05:00:00Z",
      },
      {
        id: "r4",
        companyKey: "acme",
        label: "Round 3",
        date: "9 Oct",
        startUtc: "2026-10-09T05:00:00Z",
      },
    ];
    const debriefs = [
      { roundId: "r1", questions: [q("a", "t1", "MISSED")] },
      { roundId: "r2", questions: [q("b", null, "NAILED")] },
      { roundId: "r3", questions: [q("c", null, "PARTIAL")] },
    ];
    expect(
      earlierQuestionsAtCompany({ roundId: "r4", companyKey: "acme" }, rounds, debriefs).map(
        (entry) => [entry.id, entry.roundLabel, entry.rating],
      ),
    ).toEqual([
      ["b", "Round 2 – Technical", "NAILED"],
      ["a", "Round 1 – Coding", "MISSED"],
    ]);
  });
});

describe("questionsNeedingStories", () => {
  it("lists flagged questions without a linked story", () => {
    const result = questionsNeedingStories([
      {
        roundId: "r1",
        questions: [
          { id: "1", needsStory: true, linkedStoryId: null },
          { id: "2", needsStory: true, linkedStoryId: "s1" },
          { id: "3", needsStory: false, linkedStoryId: null },
        ],
      },
    ]);
    expect(result).toEqual([{ id: "1", needsStory: true, linkedStoryId: null, roundId: "r1" }]);
  });
});

describe("DebriefInputSchema", () => {
  it("parses follow-up lines, blank optional values and requires ratings", () => {
    const parsed = DebriefInputSchema.parse({
      questions: [
        {
          text: "Explain the event loop",
          topicId: "",
          topicLabel: "",
          type: "CONCEPT",
          selfRating: "PARTIAL",
          answerNotes: "",
          linkedStoryId: "",
          needsStory: false,
          addToReview: true,
        },
      ],
      codingProblem: "",
      systemDesignPrompt: "",
      takeHome: "",
      interviewerFeedback: "",
      feeling: "",
      nextSteps: "",
      lessons: "",
      overallRating: "3",
      difficulty: "4",
      actualDurationMinutes: "",
      followUpActions: "Send thank-you note\n\n  Ask HR for timeline ",
    });
    expect(parsed.questions[0]).toMatchObject({
      topicId: null,
      topicLabel: null,
      linkedStoryId: null,
    });
    expect(parsed.actualDurationMinutes).toBeNull();
    expect(parsed.followUpActions).toEqual(["Send thank-you note", "Ask HR for timeline"]);
    // The server re-validates values the client already parsed.
    expect(DebriefInputSchema.parse(parsed)).toEqual(parsed);
    expect(
      DebriefInputSchema.safeParse({ ...parsed, followUpActions: "", overallRating: "" }).success,
    ).toBe(false);
  });
});
