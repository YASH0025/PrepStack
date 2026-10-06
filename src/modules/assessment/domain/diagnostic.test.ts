import { describe, expect, it } from "vitest";

import { type Question, type Topic } from "@/modules/content/schemas";

import { estimateTopicDepths, gradeAnswers, selectDiagnosticQuestions } from "./diagnostic";

const ROLE = "00000000-0000-4000-8000-000000000001";
const OTHER_ROLE = "00000000-0000-4000-8000-000000000002";
const stamp = { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

function topic(id: string, importance: number, roleId = ROLE): Topic {
  return {
    ...stamp,
    id,
    trackId: "00000000-0000-4000-8000-0000000000aa",
    slug: id.slice(-4),
    name: id,
    category: "JS",
    description: "d",
    explanation: "",
    keyConcepts: [],
    commonMistakes: [],
    coreImportance: 3,
    depthByBand: {
      "0-2": { depth: "KNOW", hours: 1 },
      "2-4": { depth: "EXPLAIN", hours: 1 },
      "4-6": { depth: "APPLY", hours: 1 },
      "6+": { depth: "DESIGN", hours: 1 },
    },
    roleImportance: [{ roleId, importance }],
    published: true,
  };
}

function mcq(id: string, topicId: string, depth: Question["depth"], correctIndex = 1): Question {
  return {
    ...stamp,
    id,
    topicId,
    prompt: "q",
    type: "CONCEPT",
    depth,
    format: "MCQ",
    answers: [],
    options: ["a", "b", "c"],
    correctIndex,
    explanation: "",
    selfCheck: true,
    diagnostic: true,
  };
}

function open(id: string, topicId: string, depth: Question["depth"]): Question {
  return {
    ...mcq(id, topicId, depth),
    format: "OPEN",
    options: [],
    correctIndex: null,
    answers: [{ level: "MID", answer: "model" }],
  };
}

const T1 = "10000000-0000-4000-8000-000000000001";
const T2 = "10000000-0000-4000-8000-000000000002";
const T3 = "10000000-0000-4000-8000-000000000003";
const q = (n: number) => `20000000-0000-4000-8000-00000000000${n}`;

describe("selectDiagnosticQuestions", () => {
  it("keeps only the role's topics, most important first, max two per topic", () => {
    const topics = [topic(T1, 3), topic(T2, 5), topic(T3, 5, OTHER_ROLE)];
    const questions = [
      mcq(q(1), T1, "KNOW"),
      mcq(q(2), T2, "APPLY"),
      mcq(q(3), T2, "KNOW"),
      mcq(q(4), T2, "EXPLAIN"),
      mcq(q(5), T3, "KNOW"),
      { ...mcq(q(6), T1, "EXPLAIN"), diagnostic: false },
    ];
    const selected = selectDiagnosticQuestions(topics, questions, ROLE);
    expect(selected.map((question) => question.id)).toEqual([q(3), q(4), q(1)]);
    expect(selectDiagnosticQuestions(topics, questions, ROLE, 1)).toHaveLength(1);
  });
});

describe("gradeAnswers", () => {
  const questions = [mcq(q(1), T1, "KNOW", 2), open(q(2), T1, "EXPLAIN")];

  it("grades MCQ by index and open answers by self-grade", () => {
    const graded = gradeAnswers(questions, [
      { questionId: q(1), response: "2" },
      { questionId: q(2), response: "my answer", selfGrade: "PARTLY" },
    ]);
    expect(graded.map((answer) => answer.correct)).toEqual([true, false]);
    expect(
      gradeAnswers(questions, [{ questionId: q(2), response: "x", selfGrade: "YES" }])[0]?.correct,
    ).toBe(true);
  });

  it("treats empty answers as incorrect and ignores unknown or duplicate ids", () => {
    const graded = gradeAnswers(questions, [
      { questionId: q(1), response: "" },
      { questionId: q(1), response: "2" },
      { questionId: q(2), response: "  ", selfGrade: "YES" },
      { questionId: q(9), response: "1" },
    ]);
    expect(graded).toHaveLength(2);
    expect(graded.every((answer) => !answer.correct)).toBe(true);
  });
});

describe("estimateTopicDepths", () => {
  const questions = [
    mcq(q(1), T1, "KNOW"),
    mcq(q(2), T1, "EXPLAIN"),
    mcq(q(3), T1, "APPLY"),
    mcq(q(4), T2, "EXPLAIN"),
  ];
  const answer = (questionId: string, correct: boolean) => ({
    questionId,
    response: "1",
    correct,
    selfGrade: null,
  });

  it("returns the deepest depth when all answers are correct", () => {
    expect(
      estimateTopicDepths(questions, [answer(q(1), true), answer(q(2), true), answer(q(3), true)]),
    ).toEqual([{ topicId: T1, estimatedDepth: 3 }]);
  });

  it("stops below the shallowest mistake", () => {
    expect(
      estimateTopicDepths(questions, [answer(q(1), true), answer(q(2), false), answer(q(3), true)]),
    ).toEqual([{ topicId: T1, estimatedDepth: 1 }]);
  });

  it("gives 0 when the only answer is wrong and omits unanswered topics", () => {
    expect(estimateTopicDepths(questions, [answer(q(4), false)])).toEqual([
      { topicId: T2, estimatedDepth: 0 },
    ]);
  });
});
