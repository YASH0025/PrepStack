import { formatInTimeZone } from "date-fns-tz";

/**
 * Calendar-day helpers for "yyyy-MM-dd" strings (a date in the user's
 * timezone, without a time). All arithmetic is done in UTC so results never
 * shift with the server's timezone or daylight-saving changes.
 */
export type LocalDateString = string;

const PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toUtc(date: LocalDateString): number {
  if (!PATTERN.test(date)) throw new Error(`Invalid local date: ${date}`);
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day);
}

function fromUtc(ms: number): LocalDateString {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: LocalDateString, days: number): LocalDateString {
  return fromUtc(toUtc(date) + days * 86_400_000);
}

/** Whole days from `from` to `to` (positive if `to` is later). */
export function daysBetween(from: LocalDateString, to: LocalDateString): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

export function compareLocalDates(a: LocalDateString, b: LocalDateString): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minDate(...dates: LocalDateString[]): LocalDateString {
  return dates.reduce((min, date) => (date < min ? date : min));
}

export function maxDate(...dates: LocalDateString[]): LocalDateString {
  return dates.reduce((max, date) => (date > max ? date : max));
}

/** Day of week, 0 = Sunday. */
export function dayOfWeek(date: LocalDateString): number {
  return new Date(toUtc(date)).getUTCDay();
}

/** The calendar date "now" in the given IANA timezone. */
export function todayIn(timezone: string, now: Date = new Date()): LocalDateString {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

/** Converts a UTC instant to the local calendar date in a timezone. */
export function localDateOf(instant: Date | string, timezone: string): LocalDateString {
  return formatInTimeZone(new Date(instant), timezone, "yyyy-MM-dd");
}

export function isLocalDate(value: string): boolean {
  if (!PATTERN.test(value)) return false;
  return fromUtc(toUtc(value)) === value;
}

/** Monday-based start of the week containing `date`. */
export function startOfWeek(date: LocalDateString): LocalDateString {
  const offset = (dayOfWeek(date) + 6) % 7;
  return addDays(date, -offset);
}
