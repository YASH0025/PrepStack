import "server-only";

import { z } from "zod";

import {
  DepthSchema,
  EXPERIENCE_BANDS,
  HttpUrlSchema,
  LEVELS,
  QuestionTypeSchema,
  RoundTypeSchema,
  SlugSchema,
} from "@/lib/domain";
import { audit } from "@/modules/admin/audit";

import { wouldCreateCycle } from "./graph";
import { type ContentRepositories } from "./repository";
import {
  BehavioralQuestionKindSchema,
  type DepthByBand,
  QuestionFormatSchema,
  ResourceKindSchema,
} from "./schemas";
import { contentRepositories } from "./service";

/* ---------------------------------------------------------------------------
 * Admin input schemas. They parse plain objects built from FormData, so
 * numbers arrive as strings and lists arrive as newline-separated text.
 * ------------------------------------------------------------------------ */

const lines = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("")])
  .optional()
  .transform((value) => value === "on" || value === "true");

const idList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]))
  .pipe(z.array(z.uuid()));

export const TrackInputSchema = z.object({
  slug: SlugSchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).default(""),
  active: checkbox,
});

export const RoleInputSchema = z.object({
  trackId: z.uuid(),
  slug: SlugSchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).default(""),
});

export const CompetencyInputSchema = z.object({
  slug: SlugSchema,
  name: z.string().trim().min(1).max(60),
  order: z.coerce.number().int().min(0).max(999),
});

const bandFields = Object.fromEntries(
  EXPERIENCE_BANDS.flatMap((band) => [
    [`depth_${band}`, DepthSchema],
    [`hours_${band}`, z.coerce.number().min(0.25).max(80)],
  ]),
) as Record<string, z.ZodType>;

export const TopicInputSchema = z
  .object({
    trackId: z.uuid(),
    slug: SlugSchema,
    name: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(60),
    description: z.string().trim().min(1).max(500),
    explanation: z.string().max(20_000).default(""),
    keyConcepts: lines,
    commonMistakes: lines,
    coreImportance: z.coerce.number().int().min(1).max(5),
    published: checkbox,
    prerequisiteIds: idList,
    ...bandFields,
  })
  .passthrough();

export const QuestionInputSchema = z.object({
  topicId: z.uuid(),
  prompt: z.string().trim().min(1).max(2000),
  type: QuestionTypeSchema,
  depth: DepthSchema,
  format: QuestionFormatSchema,
  answer_JUNIOR: z.string().trim().max(10_000).default(""),
  answer_MID: z.string().trim().max(10_000).default(""),
  answer_SENIOR: z.string().trim().max(10_000).default(""),
  options: lines,
  correctIndex: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce.number().int().min(0).max(5).nullable(),
  ),
  explanation: z.string().trim().max(4000).default(""),
  selfCheck: checkbox,
  diagnostic: checkbox,
});

export const ResourceInputSchema = z.object({
  topicId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  url: HttpUrlSchema,
  kind: ResourceKindSchema,
});

export const BehavioralInputSchema = z.object({
  text: z.string().trim().min(1).max(500),
  kind: BehavioralQuestionKindSchema,
  competencies: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]))
    .pipe(z.array(SlugSchema).max(6)),
  guidance: z.string().trim().max(4000).default(""),
});

export const InterviewerQuestionInputSchema = z.object({
  text: z.string().trim().min(1).max(300),
  roundTypes: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]))
    .pipe(z.array(RoundTypeSchema).min(1, "pick at least one round type")),
});

export class ContentValidationError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ContentValidationError";
  }
}

/* ---------------------------------------------------------------------------
 * Admin service: validates references, keeps the graph acyclic, cascades
 * deletes and writes an audit entry for every change.
 * ------------------------------------------------------------------------ */

export class ContentAdminService {
  constructor(
    private readonly repos: ContentRepositories,
    private readonly actorUserId: string,
  ) {}

  private log(action: string, entityType: string, entityId: string, details = "") {
    return audit({ actorUserId: this.actorUserId, action, entityType, entityId, details });
  }

  private async assertUniqueSlug(
    list: { id: string; slug: string }[],
    slug: string,
    exceptId?: string,
  ) {
    if (list.some((item) => item.slug === slug && item.id !== exceptId)) {
      throw new ContentValidationError("This slug is already used", "slug");
    }
  }

  /* Tracks ------------------------------------------------------------------ */

  async saveTrack(input: z.infer<typeof TrackInputSchema>, id?: string) {
    await this.assertUniqueSlug(await this.repos.tracks.list(), input.slug, id);
    const saved = id
      ? await this.repos.tracks.update(id, input)
      : await this.repos.tracks.create(input);
    if (!saved) throw new ContentValidationError("Track not found");
    await this.log(id ? "update" : "create", "track", saved.id, saved.slug);
    return saved;
  }

  async deleteTrack(id: string) {
    const roles = (await this.repos.roles.list()).filter((role) => role.trackId === id);
    const topics = (await this.repos.topics.list()).filter((topic) => topic.trackId === id);
    if (roles.length || topics.length) {
      throw new ContentValidationError("Delete or move this track's roles and topics first");
    }
    await this.repos.tracks.delete(id);
    await this.log("delete", "track", id);
  }

  /* Roles ------------------------------------------------------------------- */

  async saveRole(input: z.infer<typeof RoleInputSchema>, id?: string) {
    if (!(await this.repos.tracks.getById(input.trackId))) {
      throw new ContentValidationError("Unknown track", "trackId");
    }
    await this.assertUniqueSlug(await this.repos.roles.list(), input.slug, id);
    const saved = id
      ? await this.repos.roles.update(id, input)
      : await this.repos.roles.create(input);
    if (!saved) throw new ContentValidationError("Role not found");
    await this.log(id ? "update" : "create", "role", saved.id, saved.slug);
    return saved;
  }

  /** Deleting a role also removes it from every topic's role importance list. */
  async deleteRole(id: string) {
    for (const topic of await this.repos.topics.list()) {
      if (topic.roleImportance.some((entry) => entry.roleId === id)) {
        await this.repos.topics.update(topic.id, {
          roleImportance: topic.roleImportance.filter((entry) => entry.roleId !== id),
        });
      }
    }
    await this.repos.roles.delete(id);
    await this.log("delete", "role", id);
  }

  /* Competencies -------------------------------------------------------------- */

  async saveCompetency(input: z.infer<typeof CompetencyInputSchema>, id?: string) {
    await this.assertUniqueSlug(await this.repos.competencies.list(), input.slug, id);
    const saved = id
      ? await this.repos.competencies.update(id, input)
      : await this.repos.competencies.create(input);
    if (!saved) throw new ContentValidationError("Competency not found");
    await this.log(id ? "update" : "create", "competency", saved.id, saved.slug);
    return saved;
  }

  async deleteCompetency(id: string) {
    const competency = await this.repos.competencies.getById(id);
    if (!competency) return;
    for (const question of await this.repos.behavioral.list()) {
      if (question.competencies.includes(competency.slug)) {
        await this.repos.behavioral.update(question.id, {
          competencies: question.competencies.filter((slug) => slug !== competency.slug),
        });
      }
    }
    await this.repos.competencies.delete(id);
    await this.log("delete", "competency", id, competency.slug);
  }

  /* Topics -------------------------------------------------------------------- */

  async saveTopic(raw: z.infer<typeof TopicInputSchema>, id?: string) {
    if (!(await this.repos.tracks.getById(raw.trackId))) {
      throw new ContentValidationError("Unknown track", "trackId");
    }
    await this.assertUniqueSlug(await this.repos.topics.list(), raw.slug, id);

    const depthByBand = Object.fromEntries(
      EXPERIENCE_BANDS.map((band) => [
        band,
        { depth: raw[`depth_${band}`], hours: raw[`hours_${band}`] },
      ]),
    ) as DepthByBand;

    const roles = await this.repos.roles.list();
    const roleImportance = roles
      .filter((role) => role.trackId === raw.trackId)
      .map((role) => ({ roleId: role.id, importance: Number(raw[`role_${role.id}`] ?? 0) }))
      .filter((entry) => Number.isInteger(entry.importance) && entry.importance >= 1)
      .map((entry) => ({ ...entry, importance: Math.min(5, entry.importance) }));

    const allTopics = await this.repos.topics.list();
    const knownIds = new Set(allTopics.map((topic) => topic.id));
    const prerequisiteIds = raw.prerequisiteIds.filter((pid) => knownIds.has(pid));
    if (id && wouldCreateCycle(await this.repos.prerequisites.list(), id, prerequisiteIds)) {
      throw new ContentValidationError(
        "These prerequisites would create a cycle in the skill graph",
        "prerequisiteIds",
      );
    }

    const data = {
      trackId: raw.trackId,
      slug: raw.slug,
      name: raw.name,
      category: raw.category,
      description: raw.description,
      explanation: raw.explanation,
      keyConcepts: raw.keyConcepts,
      commonMistakes: raw.commonMistakes,
      coreImportance: raw.coreImportance,
      depthByBand,
      roleImportance,
      published: raw.published,
    };
    const saved = id
      ? await this.repos.topics.update(id, data)
      : await this.repos.topics.create(data);
    if (!saved) throw new ContentValidationError("Topic not found");
    await this.repos.prerequisites.replaceForTopic(saved.id, prerequisiteIds);
    await this.log(id ? "update" : "create", "topic", saved.id, saved.slug);
    return saved;
  }

  /** Cascades to the topic's questions, resources and prerequisite edges. */
  async deleteTopic(id: string) {
    const topic = await this.repos.topics.getById(id);
    if (!topic) return;
    await this.repos.questions.deleteForTopic(id);
    await this.repos.resources.deleteForTopic(id);
    await this.repos.prerequisites.deleteForTopic(id);
    await this.repos.topics.delete(id);
    await this.log("delete", "topic", id, topic.slug);
  }

  /* Questions ----------------------------------------------------------------- */

  async saveQuestion(raw: z.infer<typeof QuestionInputSchema>, id?: string) {
    if (!(await this.repos.topics.getById(raw.topicId))) {
      throw new ContentValidationError("Unknown topic", "topicId");
    }
    const answers = LEVELS.map((level) => ({ level, answer: raw[`answer_${level}`] })).filter(
      (entry) => entry.answer.length > 0,
    );
    const isMcq = raw.format === "MCQ";
    const data = {
      topicId: raw.topicId,
      prompt: raw.prompt,
      type: raw.type,
      depth: raw.depth,
      format: raw.format,
      answers,
      options: isMcq ? raw.options : [],
      correctIndex: isMcq ? raw.correctIndex : null,
      explanation: raw.explanation,
      selfCheck: raw.selfCheck,
      diagnostic: raw.diagnostic,
    };
    const saved = id
      ? await this.repos.questions.update(id, data)
      : await this.repos.questions.create(data);
    if (!saved) throw new ContentValidationError("Question not found");
    await this.log(id ? "update" : "create", "question", saved.id);
    return saved;
  }

  async deleteQuestion(id: string) {
    await this.repos.questions.delete(id);
    await this.log("delete", "question", id);
  }

  /* Resources ----------------------------------------------------------------- */

  async saveResource(input: z.infer<typeof ResourceInputSchema>, id?: string) {
    if (!(await this.repos.topics.getById(input.topicId))) {
      throw new ContentValidationError("Unknown topic", "topicId");
    }
    const saved = id
      ? await this.repos.resources.update(id, input)
      : await this.repos.resources.create(input);
    if (!saved) throw new ContentValidationError("Resource not found");
    await this.log(id ? "update" : "create", "resource", saved.id, saved.url);
    return saved;
  }

  async deleteResource(id: string) {
    await this.repos.resources.delete(id);
    await this.log("delete", "resource", id);
  }

  /* Behavioral & interviewer questions ---------------------------------------- */

  async saveBehavioral(input: z.infer<typeof BehavioralInputSchema>, id?: string) {
    const known = new Set((await this.repos.competencies.list()).map((item) => item.slug));
    const unknown = input.competencies.filter((slug) => !known.has(slug));
    if (unknown.length) {
      throw new ContentValidationError(`Unknown competency: ${unknown.join(", ")}`, "competencies");
    }
    const saved = id
      ? await this.repos.behavioral.update(id, input)
      : await this.repos.behavioral.create(input);
    if (!saved) throw new ContentValidationError("Question not found");
    await this.log(id ? "update" : "create", "behavioral-question", saved.id);
    return saved;
  }

  async deleteBehavioral(id: string) {
    await this.repos.behavioral.delete(id);
    await this.log("delete", "behavioral-question", id);
  }

  async saveInterviewerQuestion(
    input: z.infer<typeof InterviewerQuestionInputSchema>,
    id?: string,
  ) {
    const saved = id
      ? await this.repos.interviewerQuestions.update(id, input)
      : await this.repos.interviewerQuestions.create(input);
    if (!saved) throw new ContentValidationError("Question not found");
    await this.log(id ? "update" : "create", "interviewer-question", saved.id);
    return saved;
  }

  async deleteInterviewerQuestion(id: string) {
    await this.repos.interviewerQuestions.delete(id);
    await this.log("delete", "interviewer-question", id);
  }
}

export function contentAdminFor(actorUserId: string): ContentAdminService {
  return new ContentAdminService(contentRepositories(), actorUserId);
}
