import "server-only";

import { randomUUID } from "node:crypto";

import { type z } from "zod";

import { JsonCollection } from "@/lib/storage/json-collection";
import { type ContentFile, contentPath } from "@/lib/storage/paths";
import { JsonRepository } from "@/lib/storage/repository";
import { type BaseRecord } from "@/lib/storage/types";

import {
  type ContentRepositories,
  type QuestionRepository,
  type ResourceRepository,
  type TopicPrerequisiteRepository,
} from "./repository";
import {
  BehavioralQuestionSchema,
  CompetencySchema,
  InterviewerQuestionSchema,
  type Question,
  QuestionSchema,
  type Resource,
  ResourceSchema,
  RoleSchema,
  type TopicPrerequisite,
  TopicPrerequisiteSchema,
  TopicSchema,
  TrackSchema,
} from "./schemas";

export const CONTENT_SCHEMA_VERSION = 1;

function collection<T extends BaseRecord>(file: ContentFile, schema: z.ZodType<T>) {
  return new JsonCollection<T>({
    filePath: contentPath(file),
    recordSchema: schema,
    schemaVersion: CONTENT_SCHEMA_VERSION,
  });
}

class SimpleRepository<T extends BaseRecord> extends JsonRepository<T> {
  constructor(file: ContentFile, schema: z.ZodType<T>) {
    super(collection(file, schema));
  }
}

class JsonPrerequisiteRepository
  extends JsonRepository<TopicPrerequisite>
  implements TopicPrerequisiteRepository
{
  constructor() {
    super(collection("topic-prerequisites.json", TopicPrerequisiteSchema));
  }

  replaceForTopic(topicId: string, prerequisiteIds: string[]): Promise<void> {
    return this.collection.transaction((records) => {
      const now = new Date().toISOString();
      const kept = records.filter((record) => record.topicId !== topicId);
      const added = [...new Set(prerequisiteIds)].map((prerequisiteId) =>
        TopicPrerequisiteSchema.parse({
          id: randomUUID(),
          topicId,
          prerequisiteId,
          createdAt: now,
          updatedAt: now,
        }),
      );
      return { records: [...kept, ...added], result: undefined };
    });
  }

  async deleteForTopic(topicId: string): Promise<void> {
    await this.collection.deleteWhere(
      (record) => record.topicId === topicId || record.prerequisiteId === topicId,
    );
  }
}

class JsonQuestionRepository extends JsonRepository<Question> implements QuestionRepository {
  constructor() {
    super(collection("questions.json", QuestionSchema));
  }

  deleteForTopic(topicId: string): Promise<number> {
    return this.collection.deleteWhere((record) => record.topicId === topicId);
  }
}

class JsonResourceRepository extends JsonRepository<Resource> implements ResourceRepository {
  constructor() {
    super(collection("resources.json", ResourceSchema));
  }

  deleteForTopic(topicId: string): Promise<number> {
    return this.collection.deleteWhere((record) => record.topicId === topicId);
  }
}

export function createJsonContentRepositories(): ContentRepositories {
  return {
    tracks: new SimpleRepository("tracks.json", TrackSchema),
    roles: new SimpleRepository("roles.json", RoleSchema),
    competencies: new SimpleRepository("competencies.json", CompetencySchema),
    topics: new SimpleRepository("topics.json", TopicSchema),
    prerequisites: new JsonPrerequisiteRepository(),
    questions: new JsonQuestionRepository(),
    resources: new JsonResourceRepository(),
    behavioral: new SimpleRepository("behavioral-questions.json", BehavioralQuestionSchema),
    interviewerQuestions: new SimpleRepository(
      "interviewer-questions.json",
      InterviewerQuestionSchema,
    ),
  };
}
