/**
 * Leitner-style spaced repetition (PURE, deterministic).
 *
 * Boxes 1–5 with intervals of 1, 3, 7, 14 and 30 days.
 *   AGAIN → box 1        HARD → same box
 *   GOOD  → up one box   EASY → up two boxes (max 5)
 * A card in box 5 rated GOOD or EASY becomes "mastered" (still reviewable).
 * A mastered card rated AGAIN loses mastery and goes back to box 1.
 */
import { type LocalDateString, addDays, daysBetween } from "@/lib/local-date";

export const INTERVALS = [1, 3, 7, 14, 30] as const;
export const MAX_BOX = 5;

export type Rating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export interface SchedulableCard {
  box: number;
  dueDate: LocalDateString;
  mastered: boolean;
}

export interface RatingResult {
  box: number;
  dueDate: LocalDateString;
  mastered: boolean;
}

export function intervalFor(box: number): number {
  return INTERVALS[Math.min(MAX_BOX, Math.max(1, box)) - 1] as number;
}

export function applyRating(
  card: SchedulableCard,
  rating: Rating,
  today: LocalDateString,
): RatingResult {
  const from = Math.min(MAX_BOX, Math.max(1, card.box));
  let box: number;
  switch (rating) {
    case "AGAIN":
      box = 1;
      break;
    case "HARD":
      box = from;
      break;
    case "GOOD":
      box = from + 1;
      break;
    case "EASY":
      box = from + 2;
      break;
  }
  const mastered =
    rating === "AGAIN"
      ? false
      : card.mastered || (from === MAX_BOX && (rating === "GOOD" || rating === "EASY"));
  box = Math.min(MAX_BOX, box);
  return { box, mastered, dueDate: addDays(today, intervalFor(box)) };
}

export type QueuePriority = "TECHNICAL" | "STORIES" | null;

interface QueueCard extends SchedulableCard {
  id: string;
  sourceType: string;
  topicId: string | null;
}

/**
 * Cards due today (or overdue), capped. When an interview is within three
 * days, cards relevant to it come first: technical cards (those tied to a
 * topic) before a technical round, story cards before an HR/behavioral round.
 * Then oldest due date first, then lower box, then id (stable).
 */
export function buildQueue<T extends QueueCard>(
  cards: T[],
  today: LocalDateString,
  options: { cap: number; priority: QueuePriority },
): T[] {
  const relevant = (card: T) =>
    options.priority === "TECHNICAL"
      ? card.topicId !== null
      : options.priority === "STORIES"
        ? card.sourceType === "STORY"
        : false;
  return cards
    .filter((card) => card.dueDate <= today)
    .sort(
      (a, b) =>
        Number(relevant(b)) - Number(relevant(a)) ||
        a.dueDate.localeCompare(b.dueDate) ||
        a.box - b.box ||
        a.id.localeCompare(b.id),
    )
    .slice(0, Math.max(0, options.cap));
}

interface StatsCard extends SchedulableCard {
  history: { day: LocalDateString }[];
}

export interface ReviewStats {
  total: number;
  dueToday: number;
  reviewedThisWeek: number;
  mastered: number;
  /** Consecutive days with at least one review, ending today or yesterday. */
  streakDays: number;
  byBox: number[];
}

export function reviewStats(cards: StatsCard[], today: LocalDateString): ReviewStats {
  const weekStart = addDays(today, -6);
  const days = new Set<string>();
  let reviewedThisWeek = 0;
  for (const card of cards) {
    for (const entry of card.history) {
      days.add(entry.day);
      if (entry.day >= weekStart && entry.day <= today) reviewedThisWeek += 1;
    }
  }
  // A streak survives until the end of today even if today has no review yet.
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streakDays = 0;
  while (days.has(cursor) && streakDays < 3650) {
    streakDays += 1;
    cursor = addDays(cursor, -1);
  }
  const byBox = [0, 0, 0, 0, 0];
  for (const card of cards) {
    const index = Math.min(MAX_BOX, Math.max(1, card.box)) - 1;
    byBox[index] = (byBox[index] ?? 0) + 1;
  }
  return {
    total: cards.length,
    dueToday: cards.filter((card) => card.dueDate <= today).length,
    reviewedThisWeek,
    mastered: cards.filter((card) => card.mastered).length,
    streakDays,
    byBox,
  };
}

/** Days until a card is due (negative when overdue). */
export function daysUntilDue(card: SchedulableCard, today: LocalDateString): number {
  return daysBetween(today, card.dueDate);
}
