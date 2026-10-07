/**
 * Mock interview timing and fairness rules (PURE).
 */
import { EXPERIENCE_BANDS, type ExperienceBand } from "@/lib/domain";

export const SESSION_MINUTES = 60;
/** Bookings and matches must start at least this far ahead. */
export const MIN_LEAD_MINUTES = 120;
/** Cancelling later than this before the start counts as a no-show. */
export const LATE_CANCEL_MINUTES = 120;
/** A no-show can be reported from this long after the start… */
export const NO_SHOW_AFTER_MINUTES = 15;
/** …until this long after it. */
export const NO_SHOW_WINDOW_HOURS = 24;
export const NO_SHOW_LIMIT = 2;
export const NO_SHOW_LOOKBACK_DAYS = 30;
export const SUSPENSION_DAYS = 7;
export const SCORE_MIN_SESSIONS = 3;

const MINUTE = 60_000;

export function bandDistance(a: ExperienceBand, b: ExperienceBand): number {
  return Math.abs(EXPERIENCE_BANDS.indexOf(a) - EXPERIENCE_BANDS.indexOf(b));
}

/** Partners must be within one experience band of each other. */
export function bandsCompatible(a: ExperienceBand, b: ExperienceBand): boolean {
  return bandDistance(a, b) <= 1;
}

export function startsSoonEnough(startUtc: string, now: Date): boolean {
  return Date.parse(startUtc) - now.getTime() >= MIN_LEAD_MINUTES * MINUTE;
}

export function isLateCancel(startUtc: string, now: Date): boolean {
  return Date.parse(startUtc) - now.getTime() < LATE_CANCEL_MINUTES * MINUTE;
}

export function canReportNoShow(startUtc: string, now: Date): boolean {
  const start = Date.parse(startUtc);
  return (
    now.getTime() >= start + NO_SHOW_AFTER_MINUTES * MINUTE &&
    now.getTime() <= start + NO_SHOW_WINDOW_HOURS * 60 * MINUTE
  );
}

/** Feedback can be given once the session has started. */
export function canGiveFeedback(startUtc: string, now: Date): boolean {
  return now.getTime() >= Date.parse(startUtc);
}

/** Two sessions overlap when their 60-minute windows intersect. */
export function overlaps(aStartUtc: string, bStartUtc: string): boolean {
  return Math.abs(Date.parse(aStartUtc) - Date.parse(bStartUtc)) < SESSION_MINUTES * MINUTE;
}

/**
 * After a new no-show: the updated list and, when the limit is reached within
 * the look-back window, the end of the booking pause.
 */
export function recordNoShow(
  noShows: string[],
  now: Date,
): { noShows: string[]; suspendedUntil: string | null } {
  const since = now.getTime() - NO_SHOW_LOOKBACK_DAYS * 24 * 60 * MINUTE;
  const recent = [...noShows, now.toISOString()].filter((date) => Date.parse(date) >= since);
  return {
    noShows: recent.slice(-50),
    suspendedUntil:
      recent.length >= NO_SHOW_LIMIT
        ? new Date(now.getTime() + SUSPENSION_DAYS * 24 * 60 * MINUTE).toISOString()
        : null,
  };
}

export function isSuspended(suspendedUntil: string | null, now: Date): boolean {
  return suspendedUntil !== null && Date.parse(suspendedUntil) > now.getTime();
}
