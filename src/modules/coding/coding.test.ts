import { describe, expect, it } from "vitest";

import { allProblems, getProblem, problemSummaries, testCount } from "./catalogue";
import { isWeak, practiceSet, filterProblems, topicStats } from "./domain/stats";
import { practiceLinkForTopic } from "./links";
import { verdictOf } from "./runner/client";
import {
  compileJs,
  formatArgs,
  fromTree,
  outputsMatch,
  runJsTests,
  toTree,
  type EntrySpec,
} from "./runner/harness";
import { CODING_SKILLS, type ProblemProgress, type SubmissionInput } from "./schemas";
import { CodingError, codingFor } from "./service";
import { DESIGN_PROBLEMS, scaleLabUrl } from "./system-design";

const USER = "71717171-7171-4717-8717-717171717171";
const OTHER = "72727272-7272-4727-8727-727272727272";

describe("harness", () => {
  it("round-trips trees in level order", () => {
    for (const values of [
      [],
      [1],
      [3, 9, 20, null, null, 15, 7],
      [1, null, 2, 3],
      [5, 4, null, 3],
    ]) {
      expect(fromTree(toTree(values))).toEqual(values);
    }
  });

  it("compares outputs by mode", () => {
    expect(outputsMatch([1, 0], [0, 1], "exact")).toBe(false);
    expect(outputsMatch([1, 0], [0, 1], "unordered")).toBe(true);
    expect(outputsMatch([[2, 1], [3]], [[3], [1, 2]], "unordered")).toBe(false);
    expect(outputsMatch([[2, 1], [3]], [[3], [1, 2]], "unordered-nested")).toBe(true);
    expect(outputsMatch(2.000001, 2, "float")).toBe(true);
    expect(outputsMatch(2.1, 2, "float")).toBe(false);
    expect(outputsMatch(null, 0, "exact")).toBe(false);
  });

  const add: EntrySpec = {
    kind: "function",
    name: { js: "add", py: "add" },
    params: [
      { name: "a", type: "int" },
      { name: "b", type: "int" },
    ],
    returns: "int",
  };

  it("runs functions written as declarations, arrows or classes", () => {
    for (const code of [
      "function add(a, b) { return a + b; }",
      "const add = (a, b) => a + b;",
      "var add = function (a, b) { return a + b; };",
    ]) {
      expect(runJsTests(code, add, [{ args: [2, 3] }])[0]).toMatchObject({ output: 5 });
    }
  });

  it("reports missing functions, syntax errors and runtime errors", () => {
    expect(() => compileJs("function plus(a, b) { return a + b; }", add)).toThrow(
      "Define a function named add",
    );
    expect(() => compileJs("function add(a, b) { return a + ; }", add)).toThrow(SyntaxError);
    const [result] = runJsTests("function add() { throw new RangeError('boom'); }", add, [
      { args: [1, 2] },
    ]);
    expect(result?.error).toBe("RangeError: boom");
  });

  it("converts linked lists both ways and rejects cycles", () => {
    const spec: EntrySpec = {
      kind: "function",
      name: { js: "same", py: "same" },
      params: [{ name: "head", type: "ListNode" }],
      returns: "ListNode",
    };
    expect(
      runJsTests("function same(head) { return head; }", spec, [{ args: [[1, 2, 3]] }])[0]?.output,
    ).toEqual([1, 2, 3]);
    const [cycle] = runJsTests(
      "function same(head) { head.next.next = head; return head; }",
      spec,
      [{ args: [[1, 2]] }],
    );
    expect(cycle?.error).toMatch(/cycle/);
  });

  it("runs class problems operation by operation", () => {
    const spec: EntrySpec = {
      kind: "class",
      className: "Counter",
      constructorParams: [{ name: "start", type: "int" }],
      methods: [
        { name: "inc", params: [], returns: "void" },
        { name: "get", params: [], returns: "int" },
      ],
    };
    const code =
      "class Counter { constructor(s) { this.n = s; } inc() { this.n++; } get() { return this.n; } }";
    const [result] = runJsTests(code, spec, [
      {
        args: [
          ["Counter", "inc", "get"],
          [[5], [], []],
        ],
      },
    ]);
    expect(result?.output).toEqual([null, null, 6]);
    expect(formatArgs(spec, [["Counter"], [[5]]])).toContain("operations");
  });

  it("turns outcomes into a verdict", () => {
    const outcome = (status: "PASSED" | "FAILED" | "ERROR" | "TIMEOUT" | "SKIPPED") => ({
      status,
      stdout: "",
      timeMs: 1,
      error: null,
    });
    expect(verdictOf({ compileError: "x", outcomes: [] })).toBe("COMPILE_ERROR");
    expect(verdictOf({ compileError: null, outcomes: [outcome("PASSED")] })).toBe("ACCEPTED");
    expect(
      verdictOf({ compileError: null, outcomes: [outcome("PASSED"), outcome("FAILED")] }),
    ).toBe("WRONG_ANSWER");
    expect(
      verdictOf({ compileError: null, outcomes: [outcome("ERROR"), outcome("SKIPPED")] }),
    ).toBe("RUNTIME_ERROR");
    expect(
      verdictOf({ compileError: null, outcomes: [outcome("PASSED"), outcome("TIMEOUT")] }),
    ).toBe("TIME_LIMIT");
  });
});

describe("problem catalogue", () => {
  const problems = allProblems();

  it("loads every problem with examples, hidden tests and both starters", () => {
    expect(problems.length).toBeGreaterThanOrEqual(70);
    expect(new Set(problems.map((p) => p.slug)).size).toBe(problems.length);
    for (const problem of problems) {
      expect(problem.examples.length).toBeGreaterThan(0);
      expect(problem.hiddenTests.length).toBeGreaterThan(0);
      expect(CODING_SKILLS).toContain(problem.skill);
      expect(problem.starter.py).toContain(
        problem.entry.kind === "function"
          ? `def ${problem.entry.name.py}(`
          : `class ${problem.entry.className}`,
      );
      // The JavaScript starter loads (it just returns nothing yet).
      expect(() => compileJs(problem.starter.js, problem.entry)).not.toThrow();
    }
  });

  it("covers both roadmap skills with easy, medium and hard problems", () => {
    for (const skill of CODING_SKILLS) {
      const inSkill = problems.filter((p) => p.skill === skill);
      expect(new Set(inSkill.map((p) => p.difficulty))).toEqual(
        new Set(["EASY", "MEDIUM", "HARD"]),
      );
    }
  });

  it("links roadmap topics to practice", () => {
    expect(practiceLinkForTopic("dsa-arrays-hashing")?.href).toBe(
      "/practice/coding?skill=dsa-arrays-hashing",
    );
    expect(practiceLinkForTopic("system-design-basics")?.href).toBe("/practice/system-design");
    expect(practiceLinkForTopic("react-hooks")).toBeNull();
    expect(scaleLabUrl("https://scale.example", "chat")).toBe(
      "https://scale.example/play?interview=chat",
    );
  });
});

function progressOf(slug: string, status: "SOLVED" | "ATTEMPTED"): ProblemProgress {
  const at = "2026-10-01T10:00:00.000Z";
  return {
    id: crypto.randomUUID(),
    createdAt: at,
    updatedAt: at,
    problemSlug: slug,
    status,
    submissions: 1,
    lastVerdict: status === "SOLVED" ? "ACCEPTED" : "WRONG_ANSWER",
    lastLanguage: "js",
    lastSubmittedAt: at,
    firstSolvedAt: status === "SOLVED" ? at : null,
    bestTimeMs: null,
    code: {},
  };
}

describe("practice stats", () => {
  const summaries = problemSummaries();

  it("builds today's set: stuck problems first, then 3 easy, 2 medium, 1 hard", () => {
    const easy = summaries.filter((p) => p.difficulty === "EASY" && p.skill === "dsa-trees-graphs");
    const stuck = easy[easy.length - 1]!;
    const solved = easy[0]!;
    const progress = new Map([
      [stuck.slug, progressOf(stuck.slug, "ATTEMPTED")],
      [solved.slug, progressOf(solved.slug, "SOLVED")],
    ]);
    const set = practiceSet(summaries, progress, { skill: "dsa-trees-graphs" });
    expect(set.map((p) => p.difficulty)).toEqual([
      "EASY",
      "EASY",
      "EASY",
      "MEDIUM",
      "MEDIUM",
      "HARD",
    ]);
    expect(set[0]?.slug).toBe(stuck.slug);
    expect(set.map((p) => p.slug)).not.toContain(solved.slug);
    expect(set.every((p) => p.skill === "dsa-trees-graphs")).toBe(true);
  });

  it("flags weak topics and filters the list", () => {
    expect(isWeak({ solved: 0, stuck: 2 })).toBe(true);
    expect(isWeak({ solved: 1, stuck: 2 })).toBe(true);
    expect(isWeak({ solved: 3, stuck: 1 })).toBe(false);
    expect(isWeak({ solved: 0, stuck: 1 })).toBe(false);

    const trees = summaries.filter((p) => p.topics.includes("TREES")).slice(0, 2);
    const progress = new Map(trees.map((p) => [p.slug, progressOf(p.slug, "ATTEMPTED")]));
    const stat = topicStats(summaries, progress).find((s) => s.topic === "TREES");
    expect(stat).toMatchObject({ stuck: 2, solved: 0, weak: true });
    expect(
      filterProblems(summaries, progress, { status: "ATTEMPTED" })
        .map((p) => p.slug)
        .sort(),
    ).toEqual(trees.map((p) => p.slug).sort());
    expect(filterProblems(summaries, progress, { q: "two sum" }).map((p) => p.slug)).toContain(
      "two-sum",
    );
  });
});

describe("coding progress", () => {
  const problem = getProblem("two-sum")!;
  const total = testCount(problem);
  const submission = (overrides: Partial<SubmissionInput> = {}): SubmissionInput => ({
    slug: "two-sum",
    language: "js",
    code: "function twoSum() {}",
    verdict: "WRONG_ANSWER",
    passed: 1,
    total,
    maxTimeMs: 2,
    ...overrides,
  });

  it("records attempts, then a solve that sticks, privately per user", async () => {
    const coding = codingFor(USER);
    const first = await coding.recordSubmission(submission());
    expect(first).toMatchObject({ status: "ATTEMPTED", submissions: 1, firstSolvedAt: null });

    const solved = await coding.recordSubmission(
      submission({
        verdict: "ACCEPTED",
        passed: total,
        language: "py",
        code: "def two_sum(): pass",
        maxTimeMs: 7,
      }),
    );
    expect(solved).toMatchObject({
      status: "SOLVED",
      submissions: 2,
      bestTimeMs: 7,
      lastLanguage: "py",
    });
    expect(solved.code).toEqual({ js: "function twoSum() {}", py: "def two_sum(): pass" });

    const later = await coding.recordSubmission(
      submission({ verdict: "RUNTIME_ERROR", passed: 0 }),
    );
    expect(later.status).toBe("SOLVED");
    expect(later.firstSolvedAt).toBe(solved.firstSolvedAt);

    expect((await codingFor(OTHER).progress()).size).toBe(0);
  });

  it("rejects impossible submissions", async () => {
    const coding = codingFor(USER);
    await expect(coding.recordSubmission(submission({ slug: "no-such-problem" }))).rejects.toThrow(
      CodingError,
    );
    await expect(coding.recordSubmission(submission({ total: total - 1 }))).rejects.toThrow(
      "did not run every test",
    );
    await expect(
      coding.recordSubmission(submission({ verdict: "ACCEPTED", passed: 1 })),
    ).rejects.toThrow("do not match");
    await expect(
      coding.recordSubmission(submission({ verdict: "WRONG_ANSWER", passed: total })),
    ).rejects.toThrow("do not match");
  });

  it("marks system design problems done and undone", async () => {
    const coding = codingFor(USER);
    const id = DESIGN_PROBLEMS[0]!.id;
    expect(await coding.setDesignDone(id, true)).toBe(true);
    expect(await coding.setDesignDone(id, true)).toBe(true);
    expect([...(await coding.designDone())]).toEqual([id]);
    expect(await coding.setDesignDone(id, false)).toBe(false);
    expect((await coding.designDone()).size).toBe(0);
    await expect(coding.setDesignDone("not-a-problem", true)).rejects.toThrow(CodingError);
  });
});
