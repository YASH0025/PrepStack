import "server-only";

import { cache } from "react";

import { type ContentRepositories } from "./repository";
import { createJsonContentRepositories } from "./repository.json";
import {
  type BehavioralQuestion,
  type Competency,
  type InterviewerQuestion,
  type Question,
  type Resource,
  type Role,
  type Topic,
  type TopicPrerequisite,
  type Track,
} from "./schemas";

/** Everything the pure engines need about one track, loaded in one go. */
export interface ContentCatalog {
  track: Track;
  roles: Role[];
  topics: Topic[];
  prerequisites: TopicPrerequisite[];
  questions: Question[];
}

/** Read-only access to curated content. Admin writes live in admin.ts. */
export class ContentService {
  constructor(readonly repos: ContentRepositories) {}

  async tracks(): Promise<Track[]> {
    return (await this.repos.tracks.list()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async activeTracks(): Promise<Track[]> {
    return (await this.tracks()).filter((track) => track.active);
  }

  async track(id: string): Promise<Track | null> {
    return this.repos.tracks.getById(id);
  }

  async roles(trackId?: string): Promise<Role[]> {
    const roles = await this.repos.roles.list();
    return roles
      .filter((role) => !trackId || role.trackId === trackId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async role(id: string): Promise<Role | null> {
    return this.repos.roles.getById(id);
  }

  async competencies(): Promise<Competency[]> {
    return (await this.repos.competencies.list()).sort((a, b) => a.order - b.order);
  }

  async topics(options: { trackId?: string; publishedOnly?: boolean } = {}): Promise<Topic[]> {
    const topics = await this.repos.topics.list();
    return topics
      .filter((topic) => !options.trackId || topic.trackId === options.trackId)
      .filter((topic) => !options.publishedOnly || topic.published)
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }

  async topic(id: string): Promise<Topic | null> {
    return this.repos.topics.getById(id);
  }

  async topicBySlug(slug: string): Promise<Topic | null> {
    const topics = await this.repos.topics.list();
    return topics.find((topic) => topic.slug === slug) ?? null;
  }

  async prerequisites(): Promise<TopicPrerequisite[]> {
    return this.repos.prerequisites.list();
  }

  async questions(options: { topicId?: string; topicIds?: Set<string> } = {}): Promise<Question[]> {
    const questions = await this.repos.questions.list();
    return questions.filter(
      (question) =>
        (!options.topicId || question.topicId === options.topicId) &&
        (!options.topicIds || options.topicIds.has(question.topicId)),
    );
  }

  async question(id: string): Promise<Question | null> {
    return this.repos.questions.getById(id);
  }

  async resources(topicId: string): Promise<Resource[]> {
    const resources = await this.repos.resources.list();
    return resources.filter((resource) => resource.topicId === topicId);
  }

  async behavioralQuestions(kind?: BehavioralQuestion["kind"]): Promise<BehavioralQuestion[]> {
    const all = await this.repos.behavioral.list();
    return all.filter((question) => !kind || question.kind === kind);
  }

  async interviewerQuestions(): Promise<InterviewerQuestion[]> {
    return this.repos.interviewerQuestions.list();
  }

  async catalog(trackId: string): Promise<ContentCatalog | null> {
    const track = await this.track(trackId);
    if (!track) return null;
    const [roles, topics, prerequisites, questions] = await Promise.all([
      this.roles(trackId),
      this.topics({ trackId, publishedOnly: true }),
      this.prerequisites(),
      this.repos.questions.list(),
    ]);
    const topicIds = new Set(topics.map((topic) => topic.id));
    return {
      track,
      roles,
      topics,
      prerequisites: prerequisites.filter(
        (edge) => topicIds.has(edge.topicId) && topicIds.has(edge.prerequisiteId),
      ),
      questions: questions.filter((question) => topicIds.has(question.topicId)),
    };
  }
}

let repositories: ContentRepositories | null = null;

export function contentRepositories(): ContentRepositories {
  repositories ??= createJsonContentRepositories();
  return repositories;
}

/** Per-request cached instance. */
export const getContentService = cache(() => new ContentService(contentRepositories()));
