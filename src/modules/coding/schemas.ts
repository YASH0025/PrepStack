import { z } from "zod";

import { IsoDateTimeSchema, recordSchema } from "@/lib/storage/types";

import { type EntrySpec } from "./runner/harness";

/* ------------------------------------------------------------------ catalogue */

export const CODING_TOPICS = [
  "ARRAYS",
  "STRINGS",
  "HASHING",
  "TWO_POINTERS",
  "SLIDING_WINDOW",
  "BINARY_SEARCH",
  "STACK",
  "INTERVALS",
  "GREEDY",
  "HEAPS",
  "LINKED_LIST",
  "TREES",
  "TRIES",
  "GRAPHS",
  "BACKTRACKING",
  "DYNAMIC_PROGRAMMING",
] as const;
export const CodingTopicSchema = z.enum(CODING_TOPICS);
export type CodingTopic = z.infer<typeof CodingTopicSchema>;

export const CODING_TOPIC_LABELS: Record<CodingTopic, string> = {
  ARRAYS: "Arrays",
  STRINGS: "Strings",
  HASHING: "Hashing",
  TWO_POINTERS: "Two pointers",
  SLIDING_WINDOW: "Sliding window",
  BINARY_SEARCH: "Binary search",
  STACK: "Stack",
  INTERVALS: "Intervals",
  GREEDY: "Greedy",
  HEAPS: "Heaps",
  LINKED_LIST: "Linked lists",
  TREES: "Trees",
  TRIES: "Tries",
  GRAPHS: "Graphs",
  BACKTRACKING: "Backtracking",
  DYNAMIC_PROGRAMMING: "Dynamic programming",
};

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export const DifficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof DifficultySchema>;
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export const LANGUAGES = ["js", "py"] as const;
export const LanguageSchema = z.enum(LANGUAGES);
export type Language = z.infer<typeof LanguageSchema>;
export const LANGUAGE_LABELS: Record<Language, string> = { js: "JavaScript", py: "Python 3" };

/** Skill-graph topics (roadmap) that have coding practice. */
export const CODING_SKILLS = ["dsa-arrays-hashing", "dsa-trees-graphs"] as const;
export type CodingSkill = (typeof CODING_SKILLS)[number];

const ValueTypeSchema = z.enum([
  "int",
  "float",
  "bool",
  "string",
  "int[]",
  "float[]",
  "bool[]",
  "string[]",
  "int[][]",
  "string[][]",
  "ListNode",
  "TreeNode",
  "void",
]);
const ParamSchema = z.object({ name: z.string(), type: ValueTypeSchema });

const EntrySpecSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("function"),
    name: z.object({ js: z.string(), py: z.string() }),
    params: z.array(ParamSchema),
    returns: ValueTypeSchema,
  }),
  z.object({
    kind: z.literal("class"),
    className: z.string(),
    constructorParams: z.array(ParamSchema),
    methods: z.array(
      z.object({ name: z.string(), params: z.array(ParamSchema), returns: ValueTypeSchema }),
    ),
  }),
]);

const TestSchema = z.object({ args: z.array(z.unknown()), expected: z.unknown() });

export const ProblemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  difficulty: DifficultySchema,
  topics: z.array(CodingTopicSchema).min(1),
  skill: z.enum(CODING_SKILLS),
  leetcodeUrl: z.url().nullable(),
  statement: z.string(),
  constraints: z.array(z.string()),
  hints: z.array(z.string()),
  entry: EntrySpecSchema,
  compare: z.enum(["exact", "unordered", "unordered-nested", "float"]),
  starter: z.object({ js: z.string(), py: z.string() }),
  examples: z.array(TestSchema.extend({ explanation: z.string().nullable() })),
  hiddenTests: z.array(TestSchema),
});
export type Problem = z.infer<typeof ProblemSchema> & { entry: EntrySpec };
export type ProblemTest = z.infer<typeof TestSchema>;

/** List view of a problem (no tests or starter code). */
export type ProblemSummary = Pick<
  Problem,
  "slug" | "title" | "difficulty" | "topics" | "skill" | "leetcodeUrl"
>;

/* ------------------------------------------------------------------ results */

export const VERDICTS = [
  "ACCEPTED",
  "WRONG_ANSWER",
  "RUNTIME_ERROR",
  "TIME_LIMIT",
  "COMPILE_ERROR",
] as const;
export const VerdictSchema = z.enum(VERDICTS);
export type Verdict = z.infer<typeof VerdictSchema>;
export const VERDICT_LABELS: Record<Verdict, string> = {
  ACCEPTED: "Accepted",
  WRONG_ANSWER: "Wrong answer",
  RUNTIME_ERROR: "Runtime error",
  TIME_LIMIT: "Time limit exceeded",
  COMPILE_ERROR: "Compile error",
};

/** Max stored solution size per language. */
export const MAX_CODE_LENGTH = 20_000;

/** The user's private progress on one problem (private/<userId>/coding.json). */
export const ProblemProgressSchema = recordSchema({
  problemSlug: z.string().min(1).max(120),
  status: z.enum(["ATTEMPTED", "SOLVED"]),
  submissions: z.number().int().min(0),
  lastVerdict: VerdictSchema,
  lastLanguage: LanguageSchema,
  lastSubmittedAt: IsoDateTimeSchema,
  firstSolvedAt: IsoDateTimeSchema.nullable(),
  /** Slowest test time of the best accepted submission, in ms. */
  bestTimeMs: z.number().min(0).nullable(),
  /** Last submitted code per language. */
  code: z.object({
    js: z.string().max(MAX_CODE_LENGTH).optional(),
    py: z.string().max(MAX_CODE_LENGTH).optional(),
  }),
});
export type ProblemProgress = z.infer<typeof ProblemProgressSchema>;

export const SubmissionInputSchema = z.object({
  slug: z.string().min(1).max(120),
  language: LanguageSchema,
  code: z.string().max(MAX_CODE_LENGTH),
  verdict: VerdictSchema,
  passed: z.number().int().min(0).max(1000),
  total: z.number().int().min(1).max(1000),
  maxTimeMs: z.number().min(0).max(600_000).nullable(),
});
export type SubmissionInput = z.infer<typeof SubmissionInputSchema>;

/* ------------------------------------------------------------------ system design */

/** "Done" marks for system design practice in ScaleLab (private/<userId>/system-design.json). */
export const DesignPracticeSchema = recordSchema({
  problemId: z.string().min(1).max(80),
  doneAt: IsoDateTimeSchema,
});
export type DesignPractice = z.infer<typeof DesignPracticeSchema>;
