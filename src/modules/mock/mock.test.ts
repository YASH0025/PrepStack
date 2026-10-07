import { beforeAll, describe, expect, it } from "vitest";

import { getContentService } from "@/modules/content/service";
import { seedContentIfMissing } from "@/seed";

import { MockError, mockFor, runMatching } from "./service";

const A = "a1a1a1a1-0000-4000-8000-000000000001";
const B = "b2b2b2b2-0000-4000-8000-000000000002";
const C = "c3c3c3c3-0000-4000-8000-000000000003";
const now = new Date("2026-10-07T04:30:00Z"); // 10:00 in Kolkata
let roleId = "";
let topics: string[] = [];

async function join(userId: string, name: string, band: "2-4" | "6+" = "2-4") {
  return mockFor(userId).join({
    displayName: name,
    roleId,
    band,
    timezone: "Asia/Kolkata",
    showScore: true,
  });
}

beforeAll(async () => {
  await seedContentIfMissing();
  const content = getContentService();
  roleId = (await content.roles())[0]?.id ?? "";
  const questions = (await content.questions()).filter((q) => q.format === "OPEN");
  topics = [...new Set(questions.map((q) => q.topicId))].slice(0, 2);
  await join(A, "Asha");
  await join(B, "Bala");
  await join(C, "Chetan", "6+");
});

describe("slots and sessions", () => {
  it("posts, lists and books a slot; partners see only what they should", async () => {
    const slot = await mockFor(A).postSlot(
      {
        date: "2026-10-08",
        time: "19:00",
        topics: [topics[0] as string],
        meetingLink: null,
        note: "",
      },
      now,
    );
    expect(slot.startUtc).toBe("2026-10-08T13:30:00.000Z");
    // Too soon and overlapping slots are refused.
    await expect(
      mockFor(A).postSlot(
        { date: "2026-10-07", time: "11:00", topics, meetingLink: null, note: "" },
        now,
      ),
    ).rejects.toThrow(/2 hours/);
    await expect(
      mockFor(A).postSlot(
        { date: "2026-10-08", time: "19:30", topics, meetingLink: null, note: "" },
        now,
      ),
    ).rejects.toThrow(/already have/);

    expect((await mockFor(B).openSlots({}, now)).map((s) => [s.id, s.hostName])).toEqual([
      [slot.id, "Asha"],
    ]);
    expect(await mockFor(A).openSlots({}, now)).toEqual([]); // not my own
    expect(await mockFor(C).openSlots({ matchMyLevel: true }, now)).toEqual([]); // 6+ vs 2-4

    const session = await mockFor(B).bookSlot(slot.id, [topics[1] as string], now);
    await expect(mockFor(C).bookSlot(slot.id, topics, now)).rejects.toThrow(/no longer available/);

    const asA = await mockFor(A).session(session.id);
    const asB = await mockFor(B).session(session.id);
    expect(asA?.partner.displayName).toBe("Bala");
    // Each side gets the questions to ASK the other, never their own.
    const hostQuestions = session.participants[0].questionIds;
    const bookerQuestions = session.participants[1].questionIds;
    expect(asA?.questionsToAsk).toEqual(bookerQuestions);
    expect(asB?.questionsToAsk).toEqual(hostQuestions);
    expect(hostQuestions.length).toBeGreaterThan(0);
    expect(await mockFor(C).session(session.id)).toBeNull();
    expect(JSON.stringify(asA)).not.toMatch(/@/);

    // Interviewer swaps a question for their partner.
    const swapped = await mockFor(A).swapPartnerQuestion(session.id, bookerQuestions[0] as string);
    expect(swapped).toHaveLength(bookerQuestions.length);

    // Feedback after the start; once per person; score follows.
    const later = new Date("2026-10-08T14:40:00Z");
    await expect(
      mockFor(A).submitFeedback(
        session.id,
        {
          ratings: { communication: 4, problemSolving: 3, technicalDepth: 3, structure: 4 },
          questions: [{ questionId: "00000000-0000-4000-8000-000000000000", rating: "MISSED" }],
          strengths: "",
          improvements: "",
        },
        later,
      ),
    ).rejects.toThrow(/only the questions you asked/);
    await mockFor(A).submitFeedback(
      session.id,
      {
        ratings: { communication: 4, problemSolving: 3, technicalDepth: 3, structure: 4 },
        questions: [{ questionId: swapped[0] as string, rating: "MISSED" }],
        strengths: "Clear",
        improvements: "Go deeper",
      },
      later,
    );
    await expect(
      mockFor(A).submitFeedback(
        session.id,
        {
          ratings: { communication: 4, problemSolving: 3, technicalDepth: 3, structure: 4 },
          questions: [],
          strengths: "",
          improvements: "",
        },
        later,
      ),
    ).rejects.toThrow(/already gave/);
    expect((await mockFor(B).score()).overall).toBe(3.5);
    expect((await mockFor(B).session(session.id))?.session.status).toBe("COMPLETED");
  });
});

describe("matching", () => {
  it("pairs two compatible requests at a common time and respects blocks", async () => {
    const times = [{ date: "2026-10-10", time: "20:00" }];
    const first = await mockFor(A).requestMatch(
      { times, topics: [topics[0] as string], meetingLink: null },
      now,
    );
    expect(first.session).toBeNull();
    // C is 6+ (too far from 2-4): no match.
    await mockFor(C).requestMatch({ times, topics: [topics[0] as string], meetingLink: null }, now);
    expect(await runMatching(now)).toBe(0);
    const second = await mockFor(B).requestMatch(
      { times, topics: [topics[1] as string], meetingLink: "https://meet.example.com/abc" },
      now,
    );
    expect(second.session?.startUtc).toBe("2026-10-10T14:30:00.000Z");
    expect(second.session?.meetingLink).toBe("https://meet.example.com/abc");
    expect(await mockFor(A).myRequests()).toEqual([]);
  });

  it("never matches or lets blocked users book each other", async () => {
    await mockFor(B).block(A);
    const slot = await mockFor(A).postSlot(
      {
        date: "2026-10-12",
        time: "18:00",
        topics: [topics[0] as string],
        meetingLink: null,
        note: "",
      },
      now,
    );
    expect((await mockFor(B).openSlots({}, now)).map((s) => s.id)).not.toContain(slot.id);
    await expect(mockFor(B).bookSlot(slot.id, topics, now)).rejects.toBeInstanceOf(MockError);
    const times = [{ date: "2026-10-13", time: "20:00" }];
    await mockFor(A).requestMatch({ times, topics: [topics[0] as string], meetingLink: null }, now);
    const res = await mockFor(B).requestMatch(
      { times, topics: [topics[0] as string], meetingLink: null },
      now,
    );
    expect(res.session).toBeNull();
    await mockFor(B).unblock(A);
  });
});

describe("no-shows, late cancels and reports", () => {
  it("counts late cancels and reported no-shows, then pauses booking", async () => {
    const slot = await mockFor(C).postSlot(
      {
        date: "2026-10-15",
        time: "19:00",
        topics: [topics[0] as string],
        meetingLink: null,
        note: "",
      },
      now,
    );
    const session = await mockFor(B)
      .bookSlot(slot.id, [topics[0] as string], now)
      .catch(() => null);
    // B (2-4) cannot book a 6+ slot: level mismatch.
    expect(session).toBeNull();

    const slot2 = await mockFor(A).postSlot(
      {
        date: "2026-10-15",
        time: "19:00",
        topics: [topics[0] as string],
        meetingLink: null,
        note: "",
      },
      now,
    );
    const s2 = await mockFor(B).bookSlot(slot2.id, [topics[0] as string], now);
    // Reporting too early is refused; 20 minutes after the start it works.
    await expect(mockFor(A).reportNoShow(s2.id, new Date("2026-10-15T13:35:00Z"))).rejects.toThrow(
      /15 minutes/,
    );
    await mockFor(A).reportNoShow(s2.id, new Date("2026-10-15T13:50:00Z"));
    expect((await mockFor(B).profile())?.noShows).toHaveLength(1);

    // A late cancel is the second no-show: booking paused for a week.
    const slot3 = await mockFor(A).postSlot(
      {
        date: "2026-10-16",
        time: "19:00",
        topics: [topics[0] as string],
        meetingLink: null,
        note: "",
      },
      now,
    );
    const s3 = await mockFor(B).bookSlot(slot3.id, [topics[0] as string], now);
    expect(await mockFor(B).cancelSession(s3.id, new Date("2026-10-16T13:00:00Z"))).toEqual({
      late: true,
    });
    const paused = new Date("2026-10-17T00:00:00Z");
    await expect(
      mockFor(B).postSlot(
        { date: "2026-10-18", time: "19:00", topics, meetingLink: null, note: "" },
        paused,
      ),
    ).rejects.toThrow(/paused/);

    // Reports only against past partners.
    await mockFor(A).report(B, { reason: "NO_SHOW", note: "" }, s2.id);
    await expect(mockFor(C).report(B, { reason: "SPAM", note: "" }, null)).rejects.toThrow(
      /past partner/,
    );
  });

  it("removes a user's own shared data on account deletion", async () => {
    await mockFor(C).removeAllMyData();
    expect(await mockFor(C).profile()).toBeNull();
    expect((await mockFor(A).openSlots({}, now)).some((slot) => slot.hostId === C)).toBe(false);
  });
});
