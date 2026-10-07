import { describe, expect, it } from "vitest";

import { StoryInputSchema } from "../schemas";
import {
  competencyCoverage,
  coverageSummary,
  matchStories,
  suggestStoriesForRound,
} from "./coverage";

const story = (
  id: string,
  status: "DRAFT" | "READY" | "PRACTICED",
  competencies: string[],
  uses = 0,
) => ({
  id,
  title: id,
  status,
  competencies,
  usage: Array.from({ length: uses }, () => ({ usedAt: "2026-10-01T00:00:00.000Z" })),
});

const competencies = [
  { slug: "ownership", name: "Ownership" },
  { slug: "conflict", name: "Conflict" },
  { slug: "failure", name: "Failure" },
];

describe("competencyCoverage", () => {
  it("marks competencies covered only by ready or practiced stories", () => {
    const coverage = competencyCoverage(competencies, [
      story("a", "READY", ["ownership"]),
      story("b", "DRAFT", ["conflict"]),
      story("c", "PRACTICED", ["ownership", "conflict"]),
    ]);
    expect(coverage.map((entry) => [entry.slug, entry.level, entry.ready, entry.drafts])).toEqual([
      ["ownership", "COVERED", 2, 0],
      ["conflict", "COVERED", 1, 1],
      ["failure", "MISSING", 0, 0],
    ]);
    expect(coverageSummary(coverage)).toEqual({ covered: 2, total: 3, percent: 67 });
    expect(competencyCoverage(competencies, [story("d", "DRAFT", ["failure"])])[2]?.level).toBe(
      "DRAFT_ONLY",
    );
  });
});

describe("matchStories", () => {
  it("ranks by shared competencies, readiness and least use", () => {
    const stories = [
      story("draft-both", "DRAFT", ["ownership", "conflict"]),
      story("ready-one-used", "READY", ["ownership"], 3),
      story("ready-one", "READY", ["ownership"]),
      story("ready-both", "READY", ["ownership", "conflict"]),
      story("unrelated", "READY", ["failure"]),
    ];
    expect(matchStories(["ownership", "conflict"], stories, 4).map((s) => s.id)).toEqual([
      "ready-both",
      "draft-both",
      "ready-one",
      "ready-one-used",
    ]);
    expect(matchStories([], stories)).toEqual([]);
  });
});

describe("suggestStoriesForRound", () => {
  it("picks ready stories that together cover the most competencies", () => {
    const picks = suggestStoriesForRound([
      story("wide", "READY", ["ownership", "conflict"]),
      story("same", "READY", ["ownership"]),
      story("failure", "PRACTICED", ["failure"]),
      story("draft", "DRAFT", ["leadership"]),
    ]);
    expect(picks.map((s) => s.id)).toEqual(["wide", "failure"]);
  });
});

describe("StoryInputSchema", () => {
  const input = {
    title: "Migrated payments",
    situation: "",
    task: "",
    action: "",
    result: "",
    impact: "",
    competencies: [],
    projectRef: "",
    status: "DRAFT",
  };

  it("allows incomplete drafts but requires S/A/R and a competency for ready stories", () => {
    expect(StoryInputSchema.safeParse(input).success).toBe(true);
    const ready = StoryInputSchema.safeParse({ ...input, status: "READY" });
    expect(ready.success).toBe(false);
    expect(ready.error?.issues.map((issue) => issue.path[0])).toEqual([
      "situation",
      "action",
      "result",
      "competencies",
    ]);
  });
});
