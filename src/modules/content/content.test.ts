import { describe, expect, it } from "vitest";

import {
  ContentAdminService,
  ContentValidationError,
  QuestionInputSchema,
  TopicInputSchema,
} from "./admin";
import { allPrerequisites, wouldCreateCycle } from "./graph";
import { createJsonContentRepositories } from "./repository.json";
import { QuestionSchema } from "./schemas";

const ACTOR = "88888888-8888-4888-8888-888888888888";

describe("skill graph helpers", () => {
  const edges = [
    { topicId: "promises", prerequisiteId: "event-loop" },
    { topicId: "async-errors", prerequisiteId: "promises" },
  ];

  it("detects direct and transitive cycles", () => {
    expect(wouldCreateCycle(edges, "event-loop", ["async-errors"])).toBe(true);
    expect(wouldCreateCycle(edges, "event-loop", ["event-loop"])).toBe(true);
    expect(wouldCreateCycle(edges, "async-errors", ["event-loop"])).toBe(false);
  });

  it("lists transitive prerequisites", () => {
    expect([...allPrerequisites(edges, "async-errors")].sort()).toEqual(["event-loop", "promises"]);
  });
});

function topicForm(trackId: string, slug: string, extra: Record<string, unknown> = {}) {
  return TopicInputSchema.parse({
    trackId,
    slug,
    name: slug,
    category: "JavaScript",
    description: "desc",
    explanation: "",
    keyConcepts: "a\nb\n\n",
    commonMistakes: "",
    coreImportance: "4",
    published: "on",
    "depth_0-2": "KNOW",
    "hours_0-2": "1",
    "depth_2-4": "EXPLAIN",
    "hours_2-4": "2",
    "depth_4-6": "APPLY",
    "hours_4-6": "3",
    "depth_6+": "DESIGN",
    "hours_6+": "4",
    ...extra,
  });
}

describe("ContentAdminService", () => {
  it("creates topics with role importance, rejects cycles and cascades deletes", async () => {
    const repos = createJsonContentRepositories();
    const admin = new ContentAdminService(repos, ACTOR);
    const track = await admin.saveTrack({
      slug: "fsjs",
      name: "FSJS",
      description: "",
      active: true,
    });
    const role = await admin.saveRole({
      trackId: track.id,
      slug: "fullstack",
      name: "Full-stack",
      description: "",
    });

    const a = await admin.saveTopic(
      topicForm(track.id, "event-loop", { [`role_${role.id}`]: "5" }),
    );
    expect(a.keyConcepts).toEqual(["a", "b"]);
    expect(a.roleImportance).toEqual([{ roleId: role.id, importance: 5 }]);
    expect(a.depthByBand["4-6"]).toEqual({ depth: "APPLY", hours: 3 });

    const b = await admin.saveTopic(topicForm(track.id, "promises", { prerequisiteIds: [a.id] }));
    await expect(
      admin.saveTopic(topicForm(track.id, "event-loop", { prerequisiteIds: [b.id] }), a.id),
    ).rejects.toThrow(/cycle/);
    await expect(admin.saveTopic(topicForm(track.id, "promises"))).rejects.toBeInstanceOf(
      ContentValidationError,
    );

    await admin.saveQuestion(
      QuestionInputSchema.parse({
        topicId: a.id,
        prompt: "What is the event loop?",
        type: "CONCEPT",
        depth: "EXPLAIN",
        format: "OPEN",
        answer_JUNIOR: "It runs callbacks.",
      }),
    );
    await admin.deleteTopic(a.id);
    expect(await repos.questions.list()).toHaveLength(0);
    expect(await repos.prerequisites.list()).toHaveLength(0);

    await admin.deleteRole(role.id);
    expect((await repos.topics.getById(b.id))?.roleImportance).toEqual([]);
    await expect(admin.deleteTrack(track.id)).rejects.toThrow(/roles and topics/);
  });
});

describe("Question schema", () => {
  const base = {
    id: "99999999-9999-4999-8999-999999999999",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    topicId: "99999999-9999-4999-8999-999999999998",
    prompt: "Q",
    type: "CONCEPT",
    depth: "KNOW",
    explanation: "",
    selfCheck: true,
    diagnostic: true,
  };

  it("requires valid options for MCQ and answers for open questions", () => {
    expect(
      QuestionSchema.safeParse({
        ...base,
        format: "MCQ",
        answers: [],
        options: ["a"],
        correctIndex: 0,
      }).success,
    ).toBe(false);
    expect(
      QuestionSchema.safeParse({
        ...base,
        format: "MCQ",
        answers: [],
        options: ["a", "b"],
        correctIndex: 2,
      }).success,
    ).toBe(false);
    expect(
      QuestionSchema.safeParse({
        ...base,
        format: "MCQ",
        answers: [],
        options: ["a", "b"],
        correctIndex: 1,
      }).success,
    ).toBe(true);
    expect(
      QuestionSchema.safeParse({
        ...base,
        format: "OPEN",
        answers: [],
        options: [],
        correctIndex: null,
      }).success,
    ).toBe(false);
  });
});
