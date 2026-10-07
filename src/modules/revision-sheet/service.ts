import "server-only";

import { formatInTimeZone } from "date-fns-tz";

import { DEPTH_LEVEL } from "@/lib/domain";
import { env } from "@/lib/env";
import { assessmentServiceFor } from "@/modules/assessment/service";
import { getContentService } from "@/modules/content/service";
import { getProfile } from "@/modules/profile/service";
import { progressServiceFor } from "@/modules/progress/service";
import { reviewServiceFor } from "@/modules/review/service";
import { roadmapServiceFor } from "@/modules/roadmap/service";
import { suggestStoriesForRound } from "@/modules/story-bank/domain/coverage";
import { storyBankFor } from "@/modules/story-bank/service";
import { type Application, type Round } from "@/modules/tracker/schemas";
import { trackerFor } from "@/modules/tracker/service";

import {
  type RevisionSheet,
  type RevisionSheetInput,
  buildRevisionSheet,
} from "./domain/generator";
import { type RevisionSheetStateRepository } from "./repository";
import { JsonRevisionSheetStateRepository } from "./repository.json";
import { collectSheetSignals } from "./signals";

export interface RevisionSheetView {
  sheet: RevisionSheet;
  round: Round;
  application: Application;
  timezone: string;
}

export class RevisionSheetService {
  constructor(
    private readonly userId: string,
    private readonly state: RevisionSheetStateRepository,
  ) {}

  setChecked(roundId: string, key: string, checked: boolean): Promise<string[]> {
    return this.state.setChecked(roundId, key, checked);
  }

  deleteForRounds(roundIds: string[]): Promise<void> {
    return this.state.deleteForRounds(roundIds);
  }

  /** Assembles every input from its owning module, then runs the pure generator. */
  async view(roundId: string): Promise<RevisionSheetView | null> {
    const tracker = trackerFor(this.userId);
    const round = await tracker.getRound(roundId);
    if (!round) return null;
    const application = await tracker.getApplication(round.applicationId);
    const profile = await getProfile(this.userId);
    if (!application || !profile) return null;

    const content = getContentService();
    const progress = progressServiceFor(this.userId);
    const [
      topics,
      assessedDepth,
      flagged,
      saved,
      roadmap,
      cards,
      stories,
      competencies,
      hrQuestions,
      curated,
      checkedKeys,
    ] = await Promise.all([
      content.topics({ trackId: profile.trackId, publishedOnly: true }),
      assessmentServiceFor(this.userId).latestDepths(profile.trackId),
      progress.flaggedTopicIds(),
      progress.savedQuestions(),
      roadmapServiceFor(this.userId).get(),
      reviewServiceFor(this.userId).list(),
      storyBankFor(this.userId).list(),
      content.competencies(),
      content.behavioralQuestions("HR_INDIA"),
      content.interviewerQuestions(),
      this.state.checkedKeys(round.id),
    ]);

    const roleTopics = topics.filter((topic) =>
      topic.roleImportance.some((entry) => entry.roleId === profile.targetRoleId),
    );
    const questions = await content.questions({ topicIds: new Set(roleTopics.map((t) => t.id)) });
    const questionById = new Map(questions.map((question) => [question.id, question]));
    const roundDate = formatInTimeZone(new Date(round.startUtc), profile.timezone, "yyyy-MM-dd");
    const names = new Map(competencies.map((item) => [item.slug, item.name]));

    const signals = await collectSheetSignals(this.userId, {
      round,
      application,
      roleId: profile.targetRoleId,
      band: profile.experienceBand,
    });

    const input: RevisionSheetInput = {
      round: {
        id: round.id,
        type: round.type,
        title: round.title,
        startUtc: round.startUtc,
        endUtc: round.endUtc,
        mode: round.mode,
        meetingLink: round.meetingLink,
        location: round.location,
      },
      company: application.companyName,
      jobTitle: application.jobTitle,
      topics: roleTopics.map((topic) => ({
        id: topic.id,
        slug: topic.slug,
        name: topic.name,
        category: topic.category,
        keyConcepts: topic.keyConcepts,
        requiredDepth: DEPTH_LEVEL[topic.depthByBand[profile.experienceBand].depth],
      })),
      assessedDepth,
      flagged: flagged.map((entry) => ({
        topicId: entry.topicId,
        status: entry.status === "DIFFICULT" ? "DIFFICULT" : "NEEDS_REVISION",
      })),
      pendingBeforeRound: [
        ...new Set(
          (roadmap?.items ?? [])
            .filter(
              (item) =>
                item.kind === "LEARN" &&
                item.status === "PENDING" &&
                item.topicId &&
                item.scheduledDate <= roundDate,
            )
            .map((item) => item.topicId as string),
        ),
      ],
      debriefWeakness: signals.debriefWeakness,
      savedQuestions: saved
        .map((entry) => questionById.get(entry.questionId))
        .filter((question) => question !== undefined)
        .map((question) => ({
          id: question.id,
          topicId: question.topicId,
          prompt: question.prompt,
        })),
      difficultCards: cards
        .filter((card) => !card.mastered && card.box <= 2 && card.history.length > 0)
        .map((card) => ({
          id: card.id,
          topicId: card.topicId,
          prompt: card.prompt.split("\n")[0] ?? "",
        })),
      community: signals.community,
      minCommunitySample: env.COMMUNITY_MIN_SAMPLE,
      earlierQuestions: signals.earlierQuestions,
      stories: suggestStoriesForRound(stories).map((story) => ({
        id: story.id,
        title: story.title,
        competencies: story.competencies.map((slug) => names.get(slug) ?? slug),
      })),
      hrQuestions: hrQuestions.map((question) => ({
        id: question.id,
        text: question.text,
        guidance: question.guidance,
      })),
      interviewerQuestions: {
        curated: curated
          .filter((question) => question.roundTypes.includes(round.type))
          .map((question) => question.text),
        own: round.interviewerQuestions,
      },
      checkedKeys,
    };
    return { sheet: buildRevisionSheet(input), round, application, timezone: profile.timezone };
  }
}

/** Always scoped to one user's private folder. Pass the authenticated user's id. */
export function revisionSheetFor(userId: string): RevisionSheetService {
  return new RevisionSheetService(userId, new JsonRevisionSheetStateRepository(userId));
}
