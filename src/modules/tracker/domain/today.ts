/**
 * Today dashboard selections from the tracker (PURE).
 */
import { needsDebriefPrompt } from "./reminders";

export const SHEET_WINDOW_HOURS = 48;

interface TodayRound {
  id: string;
  status: string;
  startUtc: string;
  endUtc: string;
}

/** The next scheduled round that has not ended yet (an ongoing one counts). */
export function nextInterview<T extends TodayRound>(rounds: T[], now: Date): T | null {
  return (
    rounds
      .filter((round) => round.status === "SCHEDULED" && Date.parse(round.endUtc) > now.getTime())
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc))[0] ?? null
  );
}

/** True when the round starts within the revision-sheet window (or is under way). */
export function inSheetWindow(round: TodayRound, now: Date): boolean {
  const start = Date.parse(round.startUtc);
  return (
    start - now.getTime() <= SHEET_WINDOW_HOURS * 3_600_000 &&
    Date.parse(round.endUtc) > now.getTime()
  );
}

/** Rounds that took place recently and still need a debrief, newest first. */
export function pendingDebriefs<T extends TodayRound>(
  rounds: T[],
  withDebrief: Set<string>,
  now: Date,
): T[] {
  return rounds
    .filter((round) => needsDebriefPrompt(round, now, withDebrief.has(round.id)))
    .sort((a, b) => b.startUtc.localeCompare(a.startUtc));
}

/** "in 2 days 3 h", "in 5 h 20 min", "in 12 min", "now". */
export function countdown(startUtc: string, now: Date): string {
  const minutes = Math.round((Date.parse(startUtc) - now.getTime()) / 60_000);
  if (minutes <= 0) return "now";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `in ${days} day${days === 1 ? "" : "s"}${hours ? ` ${hours} h` : ""}`;
  if (hours > 0) return `in ${hours} h${mins ? ` ${mins} min` : ""}`;
  return `in ${mins} min`;
}
