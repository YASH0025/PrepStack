/**
 * Anonymizer (PURE). Turns a private debrief into a public report draft.
 *
 * 1. ALLOWLIST: the draft is built only from fields that are safe to share
 *    (company, role, technologies, experience band, month/year, round type,
 *    difficulty, rounded duration, question texts, outcome category). People,
 *    salaries, notes, feedback, links, attachments and exact dates are never
 *    copied.
 * 2. SCRUB: every free-text field is scanned and redacted for the user's known
 *    personal terms (HR/interviewer/referrer names, emails, phones, the user's
 *    own name) and for patterns: emails, phone numbers, links, money amounts
 *    and full dates.
 *
 * The same scrub runs again on the user's edited draft before publishing.
 */
import { type ExperienceBand, type QuestionType, type RoundType } from "@/lib/domain";

import { type Outcome, type ReportDraft } from "../schemas";

export type FindingKind = "NAME" | "EMAIL" | "PHONE" | "LINK" | "AMOUNT" | "DATE";

export interface Finding {
  kind: FindingKind;
  /** Where it was found, e.g. "rounds.0.questions.2.text". */
  field: string;
}

const REPLACEMENT: Record<FindingKind, string> = {
  NAME: "[name removed]",
  EMAIL: "[email removed]",
  PHONE: "[phone removed]",
  LINK: "[link removed]",
  AMOUNT: "[amount removed]",
  DATE: "[date removed]",
};

const MONTHS =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

/** Ordered: emails before links (an email is not a link), links before phones. */
const PATTERNS: [FindingKind, RegExp][] = [
  ["EMAIL", /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi],
  ["LINK", /\b(?:https?:\/\/|www\.)[^\s)]*[^\s).,;:!?'"]/gi],
  ["LINK", /\b(?:linkedin\.com|lnkd\.in|github\.com|wa\.me|t\.me)\/(?:[^\s)]*[^\s).,;:!?'"])?/gi],
  ["PHONE", /(?<![\d+])(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g],
  ["PHONE", /\+\d{1,3}[\s-]?\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g],
  [
    "AMOUNT",
    /(?:₹|\$|\b(?:rs\.?|inr|usd))\s?\d[\d,.]*\s?(?:k|l|lakh|lakhs|lpa|cr|crore|m|mn)?\b/gi,
  ],
  ["AMOUNT", /\b\d[\d,.]*\s?(?:lpa|lakhs?|lacs?|crores?|cr|ctc|k\s?(?:per|\/)\s?month)\b/gi],
  ["DATE", /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g],
  ["DATE", /\b\d{4}-\d{2}-\d{2}\b/g],
  ["DATE", new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+${MONTHS}\\.?,?\\s+\\d{4}\\b`, "gi")],
  ["DATE", new RegExp(`\\b${MONTHS}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}\\b`, "gi")],
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalises personal terms: trims, drops very short terms (they would match
 * ordinary words), and adds each part of multi-word names (≥ 3 letters).
 */
export function normalizeTerms(terms: (string | null | undefined)[]): string[] {
  const result = new Set<string>();
  for (const raw of terms) {
    const term = raw?.trim();
    if (!term || term.length < 3) continue;
    result.add(term);
    if (!term.includes("@")) {
      for (const part of term.split(/\s+/)) if (part.length >= 3) result.add(part);
    } else {
      const local = term.split("@")[0];
      if (local && local.length >= 3) result.add(local);
    }
  }
  // Longest first, so "Asha Rao" is replaced before "Asha".
  return [...result].sort((a, b) => b.length - a.length);
}

/** Redacts one text. Returns the cleaned text and what was found. */
export function scrubText(
  text: string,
  terms: string[],
  field: string,
): { text: string; findings: Finding[] } {
  const findings: Finding[] = [];
  let output = text;
  for (const [kind, pattern] of PATTERNS) {
    output = output.replace(pattern, () => {
      findings.push({ kind, field });
      return REPLACEMENT[kind];
    });
  }
  for (const term of terms) {
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`, "giu");
    output = output.replace(pattern, () => {
      findings.push({ kind: "NAME", field });
      return REPLACEMENT.NAME;
    });
  }
  return { text: output, findings };
}

/** Scrubs every free-text field of a draft. */
export function scrubDraft(
  draft: ReportDraft,
  terms: string[],
): { draft: ReportDraft; findings: Finding[] } {
  const findings: Finding[] = [];
  const clean = (value: string, field: string) => {
    const result = scrubText(value, terms, field);
    findings.push(...result.findings);
    return result.text;
  };
  const cleanNullable = (value: string | null, field: string) =>
    value === null ? null : clean(value, field);
  return {
    draft: {
      ...draft,
      // Callers exclude the real company's words from `terms` (personalTermsExcept),
      // so the company survives while a name typed into this field does not.
      companyName: clean(draft.companyName, "companyName"),
      roleTitle: clean(draft.roleTitle, "roleTitle"),
      technologies: draft.technologies.map((tech, index) => clean(tech, `technologies.${index}`)),
      summary: clean(draft.summary, "summary"),
      rounds: draft.rounds.map((round, roundIndex) => ({
        ...round,
        questions: round.questions.map((question, questionIndex) => ({
          ...question,
          text: clean(question.text, `rounds.${roundIndex}.questions.${questionIndex}.text`),
          topicLabel: cleanNullable(
            question.topicLabel,
            `rounds.${roundIndex}.questions.${questionIndex}.topicLabel`,
          ),
        })),
      })),
    },
    findings,
  };
}

export interface AnonymizerInput {
  companyName: string;
  jobTitle: string;
  technologies: string[];
  experienceBand: ExperienceBand;
  /** Local date of the round, "yyyy-MM-dd"; rounded to month/year. */
  roundDate: string;
  roundType: RoundType;
  roundResult: "AWAITING" | "CLEARED" | "REJECTED" | "ON_HOLD" | "NOT_APPLICABLE";
  difficulty: number;
  durationMinutes: number | null;
  questions: {
    text: string;
    type: QuestionType;
    topicId: string | null;
    topicLabel: string | null;
  }[];
  codingProblem: string;
  systemDesignPrompt: string;
  takeHome: string;
  /** Personal terms to remove (people, contacts, the user's own name and email, salaries). */
  personalTerms: (string | null | undefined)[];
}

export function outcomeFromResult(result: AnonymizerInput["roundResult"]): Outcome {
  if (result === "CLEARED") return "CLEARED";
  if (result === "REJECTED") return "REJECTED";
  if (result === "AWAITING" || result === "ON_HOLD") return "PENDING";
  return "UNDISCLOSED";
}

/** Rounds to the nearest 15 minutes (minimum 15), so exact durations do not identify a slot. */
export function roundDuration(minutes: number | null): number | null {
  if (minutes === null || minutes <= 0) return null;
  return Math.min(600, Math.max(15, Math.round(minutes / 15) * 15));
}

/**
 * Normalised personal terms minus the company name and its words: the company
 * is the subject of the report, so "Acme" in "Acme Corp" is never redacted.
 */
export function personalTermsExcept(
  personalTerms: (string | null | undefined)[],
  companyName: string,
): string[] {
  const companyWords = new Set(
    [companyName, ...companyName.split(/\s+/)].map((word) => word.trim().toLowerCase()),
  );
  return normalizeTerms(personalTerms).filter((term) => !companyWords.has(term.toLowerCase()));
}

/** Builds the scrubbed public draft from allowlisted fields only. */
export function anonymizeDebrief(input: AnonymizerInput): {
  draft: ReportDraft;
  findings: Finding[];
} {
  const extra: AnonymizerInput["questions"] = [];
  const addExtra = (text: string, type: QuestionType) => {
    if (text.trim()) extra.push({ text: text.trim(), type, topicId: null, topicLabel: null });
  };
  addExtra(input.codingProblem, "CODING");
  addExtra(input.systemDesignPrompt, "SYSTEM_DESIGN");
  if (input.takeHome.trim()) addExtra(`Take-home: ${input.takeHome.trim()}`, "CODING");

  const draft: ReportDraft = {
    companyName: input.companyName.trim(),
    roleTitle: input.jobTitle.trim().slice(0, 120),
    technologies: input.technologies.slice(0, 12).map((tech) => tech.trim().slice(0, 40)),
    experienceBand: input.experienceBand,
    monthYear: input.roundDate.slice(0, 7),
    outcome: outcomeFromResult(input.roundResult),
    overallDifficulty: Math.min(5, Math.max(1, Math.round(input.difficulty))),
    summary: "",
    rounds: [
      {
        type: input.roundType,
        difficulty: Math.min(5, Math.max(1, Math.round(input.difficulty))),
        durationMinutes: roundDuration(input.durationMinutes),
        questions: [...input.questions, ...extra].slice(0, 30).map((question) => ({
          text: question.text.slice(0, 1000),
          type: question.type,
          topicId: question.topicId,
          topicLabel: question.topicId ? null : (question.topicLabel?.slice(0, 80) ?? null),
        })),
      },
    ],
  };
  // The company name is the subject of the report, so it is never treated as a personal term.
  const terms = personalTermsExcept(input.personalTerms, draft.companyName);
  return scrubDraft(draft, terms);
}
