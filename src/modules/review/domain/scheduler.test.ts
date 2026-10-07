import { describe, expect, it } from "vitest";

import { applyRating, buildQueue, intervalFor, reviewStats } from "./scheduler";

const today = "2026-10-07";
const card = (box: number, mastered = false) => ({ box, mastered, dueDate: today });

describe("applyRating", () => {
  it("moves boxes per rating and schedules by the new box's interval", () => {
    expect(applyRating(card(3), "AGAIN", today)).toEqual({
      box: 1,
      mastered: false,
      dueDate: "2026-10-08",
    });
    expect(applyRating(card(3), "HARD", today)).toEqual({
      box: 3,
      mastered: false,
      dueDate: "2026-10-14",
    });
    expect(applyRating(card(3), "GOOD", today)).toEqual({
      box: 4,
      mastered: false,
      dueDate: "2026-10-21",
    });
    expect(applyRating(card(3), "EASY", today)).toEqual({
      box: 5,
      mastered: false,
      dueDate: "2026-11-06",
    });
    expect(applyRating(card(4), "EASY", today).box).toBe(5);
  });

  it("masters cards rated GOOD/EASY in the top box, and AGAIN removes mastery", () => {
    expect(applyRating(card(5), "GOOD", today)).toEqual({
      box: 5,
      mastered: true,
      dueDate: "2026-11-06",
    });
    expect(applyRating(card(5), "HARD", today).mastered).toBe(false);
    expect(applyRating(card(5, true), "HARD", today).mastered).toBe(true);
    expect(applyRating(card(5, true), "AGAIN", today)).toEqual({
      box: 1,
      mastered: false,
      dueDate: "2026-10-08",
    });
  });

  it("uses the 1/3/7/14/30 day intervals and clamps boxes", () => {
    expect([1, 2, 3, 4, 5].map(intervalFor)).toEqual([1, 3, 7, 14, 30]);
    expect(intervalFor(9)).toBe(30);
    expect(applyRating(card(0), "GOOD", today).box).toBe(2);
  });
});

describe("buildQueue", () => {
  const cards = [
    {
      id: "c",
      box: 2,
      mastered: false,
      dueDate: "2026-10-05",
      sourceType: "MANUAL",
      topicId: null,
    },
    {
      id: "a",
      box: 1,
      mastered: false,
      dueDate: "2026-10-07",
      sourceType: "SAVED_QUESTION",
      topicId: "t1",
    },
    { id: "b", box: 3, mastered: false, dueDate: "2026-10-05", sourceType: "STORY", topicId: null },
    {
      id: "d",
      box: 1,
      mastered: false,
      dueDate: "2026-10-09",
      sourceType: "MANUAL",
      topicId: null,
    },
  ];

  it("returns due cards, oldest first, then lower box, capped", () => {
    expect(buildQueue(cards, today, { cap: 20, priority: null }).map((c) => c.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
    expect(buildQueue(cards, today, { cap: 2, priority: null })).toHaveLength(2);
  });

  it("puts interview-relevant cards first", () => {
    expect(buildQueue(cards, today, { cap: 20, priority: "TECHNICAL" }).map((c) => c.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
    expect(buildQueue(cards, today, { cap: 20, priority: "STORIES" }).map((c) => c.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });
});

describe("reviewStats", () => {
  it("counts due, weekly reviews, mastery, boxes and streaks", () => {
    const stats = reviewStats(
      [
        {
          box: 5,
          mastered: true,
          dueDate: "2026-11-01",
          history: [{ day: "2026-10-06" }, { day: "2026-10-05" }],
        },
        { box: 1, mastered: false, dueDate: "2026-10-07", history: [{ day: "2026-09-20" }] },
        { box: 2, mastered: false, dueDate: "2026-10-01", history: [{ day: "2026-10-04" }] },
      ],
      today,
    );
    expect(stats).toEqual({
      total: 3,
      dueToday: 2,
      reviewedThisWeek: 3,
      mastered: 1,
      streakDays: 3,
      byBox: [1, 1, 0, 0, 1],
    });
    expect(
      reviewStats(
        [{ box: 1, mastered: false, dueDate: today, history: [{ day: "2026-10-04" }] }],
        today,
      ).streakDays,
    ).toBe(0);
  });
});
