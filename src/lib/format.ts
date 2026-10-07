import { formatInTimeZone } from "date-fns-tz";

/** "Mon 12 Oct, 11:00–12:00" in the given timezone. */
export function formatRoundTime(startUtc: string, endUtc: string, timezone: string): string {
  const start = new Date(startUtc);
  const end = new Date(endUtc);
  const sameDay =
    formatInTimeZone(start, timezone, "yyyy-MM-dd") ===
    formatInTimeZone(end, timezone, "yyyy-MM-dd");
  return sameDay
    ? `${formatInTimeZone(start, timezone, "EEE d MMM, HH:mm")}–${formatInTimeZone(end, timezone, "HH:mm")}`
    : `${formatInTimeZone(start, timezone, "EEE d MMM, HH:mm")} – ${formatInTimeZone(end, timezone, "EEE d MMM, HH:mm")}`;
}

/** Short timezone label such as "GMT+5:30". */
export function timezoneLabel(timezone: string, at: Date = new Date()): string {
  return formatInTimeZone(at, timezone, "zzz");
}

export function formatLocalDate(date: string, pattern = "d MMM yyyy"): string {
  return formatInTimeZone(new Date(`${date}T12:00:00Z`), "UTC", pattern);
}

/** "in 2 days", "in 3 hours", "in 25 minutes" or "now". */
export function relativeUntil(target: Date, now: Date = new Date()): string {
  const minutes = Math.round((target.getTime() - now.getTime()) / 60_000);
  if (minutes <= 0) return "now";
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} days`;
}
