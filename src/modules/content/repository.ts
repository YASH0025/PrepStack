import { type CrudRepository } from "@/lib/storage/repository";

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

export type TrackRepository = CrudRepository<Track>;
export type RoleRepository = CrudRepository<Role>;
export type CompetencyRepository = CrudRepository<Competency>;
export type TopicRepository = CrudRepository<Topic>;
export type TopicPrerequisiteRepository = CrudRepository<TopicPrerequisite> & {
  /** Replaces all prerequisites of one topic atomically. */
  replaceForTopic(topicId: string, prerequisiteIds: string[]): Promise<void>;
  deleteForTopic(topicId: string): Promise<void>;
};
export type QuestionRepository = CrudRepository<Question> & {
  deleteForTopic(topicId: string): Promise<number>;
};
export type ResourceRepository = CrudRepository<Resource> & {
  deleteForTopic(topicId: string): Promise<number>;
};
export type BehavioralQuestionRepository = CrudRepository<BehavioralQuestion>;
export type InterviewerQuestionRepository = CrudRepository<InterviewerQuestion>;

/** All content repositories, so a Postgres implementation can be swapped in one place. */
export interface ContentRepositories {
  tracks: TrackRepository;
  roles: RoleRepository;
  competencies: CompetencyRepository;
  topics: TopicRepository;
  prerequisites: TopicPrerequisiteRepository;
  questions: QuestionRepository;
  resources: ResourceRepository;
  behavioral: BehavioralQuestionRepository;
  interviewerQuestions: InterviewerQuestionRepository;
}
