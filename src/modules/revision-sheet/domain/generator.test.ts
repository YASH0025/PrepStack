import { describe, expect, it } from "vitest";

import { type RevisionSheetInput, buildRevisionSheet } from "./generator";

const topic = (id: string, category: string, requiredDepth = 3) => ({
  id,
  slug: id,
  name: id.toUpperCase(),
  category,
  keyConcepts: ["one", "two", "three", "four", "five"],
  requiredDepth,
});

const base = (overrides: Partial<RevisionSheetInput> = {}): RevisionSheetInput => ({
  round: {
    id: "r1",
    type: "TECHNICAL",
    title: null,
    startUtc: "2026-10-08T05:30:00.000Z",
    endUtc: "2026-10-08T06:30:00.000Z",
    mode: "VIDEO",
    meetingLink: "https://meet.example.com/x",
    location: null,
  },
  company: "Acme",
  jobTitle: "SDE 2",
  topics: [
    topic("closures", "JavaScript"),
    topic("hooks", "React"),
    topic("indexes", "Databases"),
    topic("caching", "Engineering"),
    topic("streams", "Node.js"),
    topic("types", "TypeScript"),
    topic("tests", "Engineering"),
  ],
  assessedDepth: {},
  flagged: [],
  pendingBeforeRound: [],
  debriefWeakness: {},
  savedQuestions: [],
  difficultCards: [],
  community: null,
  minCommunitySample: 5,
  earlierQuestions: [],
  stories: [{ id: "s1", title: "Outage", competencies: ["Ownership"] }],
  hrQuestions: [{ id: "h1", text: "Why switch?", guidance: "Be positive." }],
  interviewerQuestions: { curated: ["What is the stack?"], own: ["Team size?"] },
  checkedKeys: [],
  ...overrides,
});

describe("buildRevisionSheet", () => {
  it("ranks weak topics by diagnostic gaps, debrief misses, flags and pending plan items (max 5)", () => {
    const sheet = buildRevisionSheet(
      base({
        assessedDepth: { closures: 1, hooks: 3, types: 2 },
        debriefWeakness: { indexes: { missed: 1, partial: 1 } },
        flagged: [
          { topicId: "caching", status: "DIFFICULT" },
          { topicId: "streams", status: "NEEDS_REVISION" },
        ],
        pendingBeforeRound: ["tests", "streams"],
      }),
    );
    expect(sheet.weakTopics.map((entry) => [entry.topicId, entry.score])).toEqual([
      ["indexes", 4.5],
      ["closures", 4],
      ["caching", 2],
      ["streams", 2],
      ["types", 2],
    ]);
    expect(sheet.weakTopics[0]?.reasons).toEqual([
      "Missed in 1 earlier interview question",
      "Partly answered 1 time before",
    ]);
    expect(sheet.weakTopics[0]?.keyPoints).toHaveLength(4);
  });

  it("limits topics to the round type and adds stories/HR questions only for people rounds", () => {
    const flaggedAll = base().topics.map((entry) => ({
      topicId: entry.id,
      status: "DIFFICULT" as const,
    }));
    const design = buildRevisionSheet(
      base({ flagged: flaggedAll, round: { ...base().round, type: "SYSTEM_DESIGN" } }),
    );
    expect(new Set(design.weakTopics.map((entry) => entry.topicId))).toEqual(
      new Set(["indexes", "caching", "streams", "tests"]),
    );
    expect(design.stories).toEqual([]);

    const hr = buildRevisionSheet(
      base({ flagged: flaggedAll, round: { ...base().round, type: "HR" } }),
    );
    expect(hr.weakTopics).toEqual([]);
    expect(hr.stories.map((story) => story.key)).toEqual(["story:s1"]);
    expect(hr.hrQuestions.map((question) => question.key)).toEqual(["hr:h1"]);
    const managerial = buildRevisionSheet(base({ round: { ...base().round, type: "MANAGERIAL" } }));
    expect(managerial.stories).toHaveLength(1);
    expect(managerial.hrQuestions).toEqual([]);
  });

  it("collects saved and difficult questions on weak topics only, without duplicates (max 10)", () => {
    const sheet = buildRevisionSheet(
      base({
        flagged: [{ topicId: "closures", status: "DIFFICULT" }],
        savedQuestions: [
          { id: "q1", topicId: "closures", prompt: "What is a closure?" },
          { id: "q2", topicId: "hooks", prompt: "Not weak" },
          ...Array.from({ length: 12 }, (_, i) => ({
            id: `x${i}`,
            topicId: "closures",
            prompt: `Q${i}`,
          })),
        ],
        difficultCards: [{ id: "c1", topicId: "closures", prompt: "What is a closure?" }],
      }),
    );
    expect(sheet.questions).toHaveLength(10);
    expect(sheet.questions[0]).toMatchObject({ key: "question:q1", source: "SAVED" });
    expect(sheet.questions.some((question) => question.text === "Not weak")).toBe(false);
  });

  it("hides community topics below the sample threshold", () => {
    const community = {
      topics: [
        { topicId: "hooks", count: 4 },
        { topicId: "closures", count: 6 },
      ],
      sampleSize: 3,
      from: "2026-01",
      to: "2026-09",
    };
    expect(buildRevisionSheet(base({ community })).community).toEqual({
      status: "NOT_ENOUGH_DATA",
      sampleSize: 3,
    });
    const shown = buildRevisionSheet(
      base({ community: { ...community, sampleSize: 8 } }),
    ).community;
    expect(shown.status).toBe("SHOWN");
    if (shown.status === "SHOWN")
      expect(shown.topics.map((entry) => entry.slug)).toEqual(["closures", "hooks"]);
    expect(buildRevisionSheet(base()).community).toEqual({ status: "NONE" });
  });

  it("uses mode-specific logistics and keeps check state by stable keys", () => {
    const sheet = buildRevisionSheet(
      base({ checkedKeys: ["logistics:link", "ask:Team size?", "gone:key"] }),
    );
    expect(sheet.logistics[0]).toEqual({
      key: "logistics:link",
      checked: true,
      label: "Meeting link opens and you can join",
    });
    expect(sheet.interviewerQuestions.find((entry) => entry.own)?.checked).toBe(true);
    expect(sheet.progress).toEqual({ done: 1, total: 6 });
    const onsite = buildRevisionSheet(base({ round: { ...base().round, mode: "ONSITE" } }));
    expect(onsite.logistics.map((entry) => entry.key)).toContain("logistics:route");
  });
});
