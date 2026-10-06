import { describe, expect, it } from "vitest";
import { type z } from "zod";

import { EXPERIENCE_BANDS } from "@/lib/domain";
import { collectionFileSchema } from "@/lib/storage/types";
import { allPrerequisites } from "@/modules/content/graph";
import {
  BehavioralQuestionSchema,
  CompetencySchema,
  InterviewerQuestionSchema,
  QuestionSchema,
  ResourceSchema,
  RoleSchema,
  TopicPrerequisiteSchema,
  TopicSchema,
  TrackSchema,
} from "@/modules/content/schemas";

import { CONTENT_SEED, seedContentIfMissing } from "./index";

function parse<T extends z.ZodType>(schema: T, data: unknown) {
  return collectionFileSchema(schema).parse(data).records as z.infer<T>[];
}

describe("seed content", () => {
  const tracks = parse(TrackSchema, CONTENT_SEED["tracks.json"]);
  const roles = parse(RoleSchema, CONTENT_SEED["roles.json"]);
  const competencies = parse(CompetencySchema, CONTENT_SEED["competencies.json"]);
  const topics = parse(TopicSchema, CONTENT_SEED["topics.json"]);
  const edges = parse(TopicPrerequisiteSchema, CONTENT_SEED["topic-prerequisites.json"]);
  const questions = parse(QuestionSchema, CONTENT_SEED["questions.json"]);
  const resources = parse(ResourceSchema, CONTENT_SEED["resources.json"]);
  const behavioral = parse(BehavioralQuestionSchema, CONTENT_SEED["behavioral-questions.json"]);
  const interviewer = parse(InterviewerQuestionSchema, CONTENT_SEED["interviewer-questions.json"]);

  it("validates every record against the schemas", () => {
    expect(tracks).toHaveLength(1);
    expect(roles).toHaveLength(3);
    expect(competencies.length).toBe(11);
    expect(topics.length).toBeGreaterThanOrEqual(35);
    expect(questions.length).toBeGreaterThan(topics.length * 2);
    expect(resources.length).toBeGreaterThan(0);
    expect(behavioral.some((question) => question.kind === "HR_INDIA")).toBe(true);
    expect(interviewer.length).toBeGreaterThan(0);
  });

  it("has unique ids and slugs", () => {
    const all = [
      tracks,
      roles,
      competencies,
      topics,
      edges,
      questions,
      resources,
      behavioral,
      interviewer,
    ].flat();
    expect(new Set(all.map((record) => record.id)).size).toBe(all.length);
    expect(new Set(topics.map((topic) => topic.slug)).size).toBe(topics.length);
  });

  it("keeps references valid", () => {
    const topicIds = new Set(topics.map((topic) => topic.id));
    const roleIds = new Set(roles.map((role) => role.id));
    const competencySlugs = new Set(competencies.map((competency) => competency.slug));
    for (const topic of topics) {
      expect(topic.trackId).toBe(tracks[0]?.id);
      for (const entry of topic.roleImportance) expect(roleIds.has(entry.roleId)).toBe(true);
    }
    for (const edge of edges) {
      expect(topicIds.has(edge.topicId)).toBe(true);
      expect(topicIds.has(edge.prerequisiteId)).toBe(true);
    }
    for (const question of questions) expect(topicIds.has(question.topicId)).toBe(true);
    for (const resource of resources) expect(topicIds.has(resource.topicId)).toBe(true);
    for (const question of behavioral) {
      for (const slug of question.competencies) expect(competencySlugs.has(slug)).toBe(true);
    }
  });

  it("has an acyclic prerequisite graph", () => {
    for (const topic of topics) {
      expect(allPrerequisites(edges, topic.id).has(topic.id)).toBe(false);
    }
  });

  it("gives every topic depth for all bands and at least one diagnostic question", () => {
    for (const topic of topics) {
      for (const band of EXPERIENCE_BANDS) expect(topic.depthByBand[band]).toBeDefined();
      expect(
        questions.some((question) => question.topicId === topic.id && question.diagnostic),
      ).toBe(true);
    }
  });

  it("covers every role with topics", () => {
    for (const role of roles) {
      const count = topics.filter((topic) =>
        topic.roleImportance.some((entry) => entry.roleId === role.id),
      ).length;
      expect(count).toBeGreaterThan(10);
    }
  });

  it("seeds missing files once and never overwrites", async () => {
    const first = await seedContentIfMissing();
    expect(first).toHaveLength(9);
    expect(await seedContentIfMissing()).toEqual([]);
  });
});
