import { describe, expect, it } from "vitest";

import { reviewServiceFor } from "./service";

const USER = "56565656-5656-4565-8565-565656565656";

describe("ReviewService", () => {
  it("adds one card per source, records reviews and schedules the next due date", async () => {
    const service = reviewServiceFor(USER);
    const now = new Date("2026-10-07T06:00:00.000Z");
    const input = {
      sourceType: "SAVED_QUESTION" as const,
      sourceId: "q1",
      topicId: "11111111-1111-4111-8111-111111111111",
      prompt: "What is the event loop?",
      answer: "It schedules callbacks.",
    };
    const first = await service.addFromSource(input, now);
    const second = await service.addFromSource(input, now);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.card.id).toBe(first.card.id);
    expect(first.card).toMatchObject({ box: 1, dueDate: "2026-10-07", mastered: false });

    const reviewed = await service.review(first.card.id, "GOOD", now);
    expect(reviewed).toMatchObject({ box: 2, dueDate: "2026-10-10" });
    expect(reviewed.history).toEqual([
      { at: now.toISOString(), day: "2026-10-07", rating: "GOOD", fromBox: 1, toBox: 2 },
    ]);
    expect((await service.queue(now)).cards).toHaveLength(0);
    expect((await service.queue(new Date("2026-10-10T06:00:00.000Z"))).cards).toHaveLength(1);

    const stats = await service.stats(now);
    expect(stats).toMatchObject({ total: 1, dueToday: 0, reviewedThisWeek: 1, streakDays: 1 });
  });

  it("keeps manual cards separate and respects the daily cap", async () => {
    const service = reviewServiceFor("67676767-6767-4676-8676-676767676767");
    const now = new Date("2026-10-07T06:00:00.000Z");
    for (let i = 0; i < 25; i += 1) {
      await service.addManual({ prompt: `Card ${i}`, answer: "A" }, now);
    }
    // No profile → default cap of 20.
    expect((await service.queue(now)).cards).toHaveLength(20);
    expect((await service.sourceIds("MANUAL")).size).toBe(0);
  });
});
