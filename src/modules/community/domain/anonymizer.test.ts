import { describe, expect, it } from "vitest";

import {
  type AnonymizerInput,
  anonymizeDebrief,
  normalizeTerms,
  roundDuration,
  scrubText,
} from "./anonymizer";

const input = (overrides: Partial<AnonymizerInput> = {}): AnonymizerInput => ({
  companyName: "Acme Corp",
  jobTitle: "SDE 2",
  technologies: ["React", "Node.js"],
  experienceBand: "2-4",
  roundDate: "2026-10-04",
  roundType: "TECHNICAL",
  roundResult: "CLEARED",
  difficulty: 4,
  durationMinutes: 53,
  questions: [
    {
      text: "Explain the event loop",
      type: "CONCEPT",
      topicId: "11111111-1111-4111-8111-111111111111",
      topicLabel: "ignored",
    },
  ],
  codingProblem: "",
  systemDesignPrompt: "",
  takeHome: "",
  personalTerms: [
    "Asha Rao",
    "asha.rao@acme.test",
    "+91 98765 43210",
    "Ravi",
    "Prateek Jadhav",
    "me@example.com",
    "Al",
  ],
  ...overrides,
});

describe("anonymizeDebrief", () => {
  it("builds the draft from allowlisted fields only", () => {
    const { draft } = anonymizeDebrief(input());
    expect(draft).toEqual({
      companyName: "Acme Corp",
      roleTitle: "SDE 2",
      technologies: ["React", "Node.js"],
      experienceBand: "2-4",
      monthYear: "2026-10",
      outcome: "CLEARED",
      overallDifficulty: 4,
      summary: "",
      rounds: [
        {
          type: "TECHNICAL",
          difficulty: 4,
          durationMinutes: 60,
          questions: [
            {
              text: "Explain the event loop",
              type: "CONCEPT",
              topicId: "11111111-1111-4111-8111-111111111111",
              topicLabel: null,
            },
          ],
        },
      ],
    });
    // No identifiers can sneak in through extra keys.
    expect(Object.keys(draft).sort()).toEqual(
      [
        "companyName",
        "experienceBand",
        "monthYear",
        "outcome",
        "overallDifficulty",
        "roleTitle",
        "rounds",
        "summary",
        "technologies",
      ].sort(),
    );
  });

  it("redacts personal terms and patterns in question text and problem details", () => {
    const { draft, findings } = anonymizeDebrief(
      input({
        questions: [
          {
            text: "Asha asked me (prateek) about Ravi's caching idea; call +91 98765 43210 or mail asha.rao@acme.test",
            type: "CONCEPT",
            topicId: null,
            topicLabel: null,
          },
        ],
        codingProblem:
          "Design a rate limiter — see https://example.com/doc, offer was ₹24 LPA on 12 Oct 2026",
      }),
    );
    const [first, coding] = draft.rounds[0]?.questions ?? [];
    expect(first?.text).toBe(
      "[name removed] asked me ([name removed]) about [name removed]'s caching idea; call [phone removed] or mail [email removed]",
    );
    expect(coding?.text).toBe(
      "Design a rate limiter — see [link removed], offer was [amount removed] on [date removed]",
    );
    expect(coding?.type).toBe("CODING");
    expect(new Set(findings.map((finding) => finding.kind))).toEqual(
      new Set(["NAME", "PHONE", "EMAIL", "LINK", "AMOUNT", "DATE"]),
    );
  });

  it("maps outcomes and never treats the company as a personal term", () => {
    expect(anonymizeDebrief(input({ roundResult: "ON_HOLD" })).draft.outcome).toBe("PENDING");
    expect(anonymizeDebrief(input({ roundResult: "NOT_APPLICABLE" })).draft.outcome).toBe(
      "UNDISCLOSED",
    );
    const { draft } = anonymizeDebrief(input({ personalTerms: ["Acme Corp"] }));
    expect(draft.companyName).toBe("Acme Corp");
  });
});

describe("helpers", () => {
  it("normalises terms: drops short ones, adds name parts and email local parts, longest first", () => {
    expect(normalizeTerms(["Al", " Asha Rao ", "asha.rao@acme.test", null, "Bo"])).toEqual([
      "asha.rao@acme.test",
      "Asha Rao",
      "asha.rao",
      "Asha",
      "Rao",
    ]);
  });

  it("only matches whole words, so names inside other words are kept", () => {
    expect(scrubText("Ravindra met Ravi", ["Ravi"], "f").text).toBe("Ravindra met [name removed]");
  });

  it("detects Indian and international phone numbers and common amounts", () => {
    expect(scrubText("Call 9876543210 or +44 20 7946 0958", [], "f").text).toBe(
      "Call [phone removed] or [phone removed]",
    );
    expect(scrubText("CTC 18 LPA, expected 25 lakhs, Rs. 50,000", [], "f").text).toBe(
      "CTC [amount removed], expected [amount removed], [amount removed]",
    );
    expect(scrubText("Use a hash map of size 9876", [], "f").text).toBe(
      "Use a hash map of size 9876",
    );
    // "rs" inside a word is not a currency.
    expect(scrubText("It renders 10k rows, INR 5k bonus", [], "f").text).toBe(
      "It renders 10k rows, [amount removed] bonus",
    );
  });

  it("rounds durations to 15 minutes", () => {
    expect([roundDuration(53), roundDuration(7), roundDuration(null), roundDuration(0)]).toEqual([
      60,
      15,
      null,
      null,
    ]);
  });
});
