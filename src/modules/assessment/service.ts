import "server-only";

import { type DepthLevel } from "@/lib/domain";
import { getContentService } from "@/modules/content/service";
import { type Profile } from "@/modules/profile/schemas";

import {
  estimateTopicDepths,
  gradeAnswers,
  modelAnswerFor,
  selectDiagnosticQuestions,
} from "./domain/diagnostic";
import { type AssessmentRepository } from "./repository";
import { JsonAssessmentRepository } from "./repository.json";
import {
  type AssessmentAttempt,
  type ClientDiagnosticQuestion,
  type SubmitDiagnosticInput,
} from "./schemas";

export class AssessmentService {
  constructor(private readonly repo: AssessmentRepository) {}

  /** Questions for the user's role, without answer keys. */
  async questionsFor(profile: Profile): Promise<ClientDiagnosticQuestion[]> {
    const catalog = await getContentService().catalog(profile.trackId);
    if (!catalog) return [];
    const topicName = new Map(catalog.topics.map((topic) => [topic.id, topic.name]));
    return selectDiagnosticQuestions(catalog.topics, catalog.questions, profile.targetRoleId).map(
      (question) => ({
        id: question.id,
        topicName: topicName.get(question.topicId) ?? "",
        prompt: question.prompt,
        format: question.format,
        options: question.options,
        modelAnswer: modelAnswerFor(question),
      }),
    );
  }

  /** Grades on the server (answer keys never reach the browser) and stores the attempt. */
  async submit(profile: Profile, input: SubmitDiagnosticInput): Promise<AssessmentAttempt> {
    const catalog = await getContentService().catalog(profile.trackId);
    if (!catalog) throw new Error("Track not found");
    const allowed = selectDiagnosticQuestions(
      catalog.topics,
      catalog.questions,
      profile.targetRoleId,
    );
    const answers = gradeAnswers(allowed, input.answers);
    const results = estimateTopicDepths(allowed, answers);
    return this.repo.create({
      trackId: profile.trackId,
      roleId: profile.targetRoleId,
      completedAt: new Date().toISOString(),
      answers,
      results,
    });
  }

  async history(): Promise<AssessmentAttempt[]> {
    const attempts = await this.repo.list();
    return attempts.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }

  get(id: string): Promise<AssessmentAttempt | null> {
    return this.repo.getById(id);
  }

  /** Demonstrated depth per topic from the latest attempt for the track. */
  async latestDepths(trackId: string): Promise<Record<string, DepthLevel>> {
    const latest = await this.repo.latestForTrack(trackId);
    const depths: Record<string, DepthLevel> = {};
    for (const result of latest?.results ?? []) {
      depths[result.topicId] = result.estimatedDepth as DepthLevel;
    }
    return depths;
  }
}

export function assessmentServiceFor(userId: string): AssessmentService {
  return new AssessmentService(new JsonAssessmentRepository(userId));
}
