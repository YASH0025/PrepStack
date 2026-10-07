import "server-only";

import { getContentService } from "@/modules/content/service";

import { type StoryRepository } from "./repository";
import { JsonStoryRepository } from "./repository.json";
import { type Story, type StoryInput, type StoryStatus } from "./schemas";

export class StoryError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "StoryError";
  }
}

export class StoryBankService {
  constructor(private readonly repo: StoryRepository) {}

  async list(): Promise<Story[]> {
    const stories = await this.repo.list();
    return stories.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  get(id: string): Promise<Story | null> {
    return this.repo.getById(id);
  }

  /** Competency slugs must exist in the curated list. */
  private async assertCompetencies(slugs: string[]): Promise<void> {
    const known = new Set((await getContentService().competencies()).map((item) => item.slug));
    const unknown = slugs.filter((slug) => !known.has(slug));
    if (unknown.length) throw new StoryError("Unknown competency", "competencies");
  }

  async create(input: StoryInput): Promise<Story> {
    await this.assertCompetencies(input.competencies);
    return this.repo.create({ ...input, usage: [] });
  }

  async update(id: string, input: StoryInput): Promise<Story> {
    await this.assertCompetencies(input.competencies);
    const updated = await this.repo.update(id, input);
    if (!updated) throw new StoryError("Story not found");
    return updated;
  }

  async setStatus(id: string, status: StoryStatus): Promise<Story> {
    const story = await this.repo.getById(id);
    if (!story) throw new StoryError("Story not found");
    if (status !== "DRAFT" && (!story.situation || !story.action || !story.result)) {
      throw new StoryError("Fill in Situation, Action and Result before marking it ready");
    }
    return (await this.repo.update(id, { status })) as Story;
  }

  delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  /** Records that a story was used in an interview round (from debriefs). */
  async recordUsage(id: string, roundId: string, debriefQuestionId: string | null): Promise<void> {
    const story = await this.repo.getById(id);
    if (!story) throw new StoryError("Story not found");
    const already = story.usage.some(
      (entry) => entry.roundId === roundId && entry.debriefQuestionId === debriefQuestionId,
    );
    if (already) return;
    await this.repo.update(id, {
      usage: [
        ...story.usage,
        { roundId, debriefQuestionId, usedAt: new Date().toISOString() },
      ].slice(-100),
    });
  }

  /** Removes usage entries for a round (e.g. when its debrief changes). */
  async removeUsageForRound(roundId: string, debriefQuestionId?: string | null): Promise<void> {
    for (const story of await this.repo.list()) {
      const kept = story.usage.filter(
        (entry) =>
          entry.roundId !== roundId ||
          (debriefQuestionId !== undefined && entry.debriefQuestionId !== debriefQuestionId),
      );
      if (kept.length !== story.usage.length) await this.repo.update(story.id, { usage: kept });
    }
  }
}

/** Always scoped to one user's private folder. Pass the authenticated user's id. */
export function storyBankFor(userId: string): StoryBankService {
  return new StoryBankService(new JsonStoryRepository(userId));
}
