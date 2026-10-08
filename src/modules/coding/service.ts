import "server-only";

import { JsonCollection } from "@/lib/storage/json-collection";
import { privatePath } from "@/lib/storage/paths";

import { getProblem, testCount } from "./catalogue";
import {
  type DesignPractice,
  DesignPracticeSchema,
  type ProblemProgress,
  ProblemProgressSchema,
  type SubmissionInput,
} from "./schemas";
import { DESIGN_PROBLEMS } from "./system-design";

export class CodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodingError";
  }
}

/**
 * The user's coding practice progress and system design "done" marks. Code
 * runs in the user's browser, so a submission's verdict is self-reported:
 * fine for personal practice, never used for anything ranked or public.
 */
export class CodingService {
  private readonly progressStore: JsonCollection<ProblemProgress>;
  private readonly designStore: JsonCollection<DesignPractice>;

  constructor(userId: string) {
    this.progressStore = new JsonCollection({
      filePath: privatePath(userId, "coding.json"),
      recordSchema: ProblemProgressSchema,
      schemaVersion: 1,
    });
    this.designStore = new JsonCollection({
      filePath: privatePath(userId, "system-design.json"),
      recordSchema: DesignPracticeSchema,
      schemaVersion: 1,
    });
  }

  async progress(): Promise<Map<string, ProblemProgress>> {
    const records = await this.progressStore.list();
    return new Map(records.map((record) => [record.problemSlug, record]));
  }

  async progressFor(slug: string): Promise<ProblemProgress | null> {
    return this.progressStore.findOne((record) => record.problemSlug === slug);
  }

  list(): Promise<ProblemProgress[]> {
    return this.progressStore.list();
  }

  async recordSubmission(input: SubmissionInput, now = new Date()): Promise<ProblemProgress> {
    const problem = getProblem(input.slug);
    if (!problem) throw new CodingError("Unknown problem");
    // A submission runs every test (compile errors stop before the first one).
    if (input.verdict !== "COMPILE_ERROR" && input.total !== testCount(problem)) {
      throw new CodingError("The submission did not run every test");
    }
    if ((input.verdict === "ACCEPTED") !== (input.passed === input.total)) {
      throw new CodingError("Verdict and results do not match");
    }
    if (input.passed > input.total) throw new CodingError("Verdict and results do not match");

    const at = now.toISOString();
    const accepted = input.verdict === "ACCEPTED";
    return this.progressStore.transaction((records) => {
      const index = records.findIndex((record) => record.problemSlug === input.slug);
      const current = records[index];
      const solvedBefore = current?.status === "SOLVED";
      const bestTimeMs =
        accepted && input.maxTimeMs !== null
          ? Math.min(current?.bestTimeMs ?? Number.POSITIVE_INFINITY, input.maxTimeMs)
          : (current?.bestTimeMs ?? null);
      const fields = {
        problemSlug: input.slug,
        status: solvedBefore || accepted ? ("SOLVED" as const) : ("ATTEMPTED" as const),
        submissions: (current?.submissions ?? 0) + 1,
        lastVerdict: input.verdict,
        lastLanguage: input.language,
        lastSubmittedAt: at,
        firstSolvedAt: current?.firstSolvedAt ?? (accepted ? at : null),
        bestTimeMs: Number.isFinite(bestTimeMs) ? bestTimeMs : null,
        code: { ...current?.code, [input.language]: input.code },
      };
      const record = ProblemProgressSchema.parse(
        current
          ? { ...current, ...fields, updatedAt: at }
          : { id: crypto.randomUUID(), createdAt: at, updatedAt: at, ...fields },
      );
      const next = [...records];
      if (current) next[index] = record;
      else next.push(record);
      return { records: next, result: record };
    });
  }

  async designDone(): Promise<Set<string>> {
    const records = await this.designStore.list();
    return new Set(records.map((record) => record.problemId));
  }

  listDesign(): Promise<DesignPractice[]> {
    return this.designStore.list();
  }

  /** Marks or unmarks a ScaleLab problem as practised. Returns the new state. */
  async setDesignDone(problemId: string, done: boolean, now = new Date()): Promise<boolean> {
    if (!DESIGN_PROBLEMS.some((problem) => problem.id === problemId)) {
      throw new CodingError("Unknown problem");
    }
    if (!done) {
      await this.designStore.deleteWhere((record) => record.problemId === problemId);
      return false;
    }
    await this.designStore.transaction((records) => {
      if (records.some((record) => record.problemId === problemId)) {
        return { records, result: undefined };
      }
      const at = now.toISOString();
      const record = DesignPracticeSchema.parse({
        id: crypto.randomUUID(),
        createdAt: at,
        updatedAt: at,
        problemId,
        doneAt: at,
      });
      return { records: [...records, record], result: undefined };
    });
    return true;
  }
}

export function codingFor(userId: string): CodingService {
  return new CodingService(userId);
}
