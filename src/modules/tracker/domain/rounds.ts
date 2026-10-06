/**
 * Pure tracker rules: status suggestions, conflict detection, timezone-safe
 * round times and the per-application round timeline.
 */
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { type RoundType } from "@/lib/domain";

import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  CLOSED_STATUSES,
  type RoundResult,
  type RoundStatus,
} from "../schemas";

const rank = (status: ApplicationStatus) => APPLICATION_STATUSES.indexOf(status);

/** The application status that a round of this type belongs to. */
export function stageForRoundType(type: RoundType): ApplicationStatus | null {
  switch (type) {
    case "RECRUITER_SCREEN":
      return "RECRUITER_SCREENING";
    case "TECHNICAL":
    case "CODING":
    case "SYSTEM_DESIGN":
    case "TAKE_HOME":
      return "TECHNICAL_INTERVIEW";
    case "MANAGERIAL":
    case "BEHAVIORAL":
      return "MANAGERIAL_INTERVIEW";
    case "HR":
      return "HR_ROUND";
    case "OTHER":
      return null;
  }
}

/** The stage that typically follows clearing a round of this type. */
function stageAfterClearing(type: RoundType): ApplicationStatus | null {
  switch (type) {
    case "RECRUITER_SCREEN":
      return "TECHNICAL_INTERVIEW";
    case "TECHNICAL":
    case "CODING":
    case "SYSTEM_DESIGN":
    case "TAKE_HOME":
      return "MANAGERIAL_INTERVIEW";
    case "MANAGERIAL":
    case "BEHAVIORAL":
      return "HR_ROUND";
    case "HR":
      return "OFFER_RECEIVED";
    case "OTHER":
      return null;
  }
}

export interface StatusSuggestion {
  status: ApplicationStatus;
  reason: string;
  /** Whether to also suggest scheduling the next round. */
  scheduleNext: boolean;
}

/**
 * After a round's outcome is recorded, suggests how the application should
 * move. Suggestions only ever move forward and never touch closed applications.
 * The user confirms; nothing changes automatically.
 */
export function suggestAfterRound(
  current: ApplicationStatus,
  round: { type: RoundType; status: RoundStatus; result: RoundResult },
): StatusSuggestion | null {
  if (CLOSED_STATUSES.includes(current)) return null;
  if (round.status === "COMPLETED" && round.result === "REJECTED") {
    return { status: "REJECTED", reason: "This round was not cleared.", scheduleNext: false };
  }
  if (round.status !== "COMPLETED" || round.result !== "CLEARED") return null;
  const next = stageAfterClearing(round.type);
  if (!next || rank(next) <= rank(current)) {
    return { status: current, reason: "Round cleared.", scheduleNext: true };
  }
  return {
    status: next,
    reason: `Cleared the ${round.type.toLowerCase().replace("_", " ")} round.`,
    scheduleNext: next !== "OFFER_RECEIVED",
  };
}

/** When a round is scheduled, the application moves to that stage if it is behind. */
export function statusWhenScheduling(
  current: ApplicationStatus,
  type: RoundType,
): ApplicationStatus {
  if (CLOSED_STATUSES.includes(current) || current === "ON_HOLD") return current;
  const stage = stageForRoundType(type);
  return stage && rank(stage) > rank(current) ? stage : current;
}

export interface TimedRound {
  id: string;
  startUtc: string;
  endUtc: string;
  status: RoundStatus;
}

/** Pairs of scheduled rounds whose times overlap. */
export function detectConflicts<T extends TimedRound>(rounds: T[]): [T, T][] {
  const scheduled = rounds
    .filter((round) => round.status === "SCHEDULED")
    .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  const conflicts: [T, T][] = [];
  for (let i = 0; i < scheduled.length; i += 1) {
    const a = scheduled[i] as T;
    for (let j = i + 1; j < scheduled.length; j += 1) {
      const b = scheduled[j] as T;
      if (b.startUtc >= a.endUtc) break;
      conflicts.push([a, b]);
    }
  }
  return conflicts;
}

/** Ids of rounds that overlap any other scheduled round. */
export function conflictingIds(rounds: TimedRound[]): Set<string> {
  const ids = new Set<string>();
  for (const [a, b] of detectConflicts(rounds)) {
    ids.add(a.id);
    ids.add(b.id);
  }
  return ids;
}

/** Wall-clock date + time in a timezone → UTC start/end ISO strings. */
export function toUtcRange(
  date: string,
  time: string,
  durationMinutes: number,
  timezone: string,
): { startUtc: string; endUtc: string } {
  const start = fromZonedTime(`${date}T${time}:00`, timezone);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid date or time");
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { startUtc: start.toISOString(), endUtc: end.toISOString() };
}

/** UTC instant → wall-clock date/time in a timezone (for edit forms). */
export function fromUtc(startUtc: string, timezone: string): { date: string; time: string } {
  return {
    date: formatInTimeZone(new Date(startUtc), timezone, "yyyy-MM-dd"),
    time: formatInTimeZone(new Date(startUtc), timezone, "HH:mm"),
  };
}

export function durationMinutes(startUtc: string, endUtc: string): number {
  return Math.round((new Date(endUtc).getTime() - new Date(startUtc).getTime()) / 60_000);
}

export type TimelineState = "done" | "current" | "upcoming" | "failed" | "cancelled";

/** Mini timeline for an application: Round 1 ✓ → Round 2 ● → HR ○. */
export function roundTimeline(
  rounds: {
    id: string;
    roundNumber: number;
    status: RoundStatus;
    result: RoundResult;
    startUtc: string;
  }[],
  now: Date,
): { id: string; roundNumber: number; state: TimelineState }[] {
  const ordered = [...rounds]
    .filter((round) => round.status !== "RESCHEDULED")
    .sort((a, b) => a.roundNumber - b.roundNumber || a.startUtc.localeCompare(b.startUtc));
  const nextScheduled = ordered.find(
    (round) => round.status === "SCHEDULED" && new Date(round.startUtc) >= now,
  );
  return ordered.map((round) => {
    let state: TimelineState;
    if (round.status === "CANCELLED") state = "cancelled";
    else if (round.status === "NO_SHOW_ME" || round.result === "REJECTED") state = "failed";
    else if (round.status === "COMPLETED") state = "done";
    else if (round.id === nextScheduled?.id) state = "current";
    else state = "upcoming";
    return { id: round.id, roundNumber: round.roundNumber, state };
  });
}

/** Next round number for an application. Rescheduled rounds keep their number. */
export function nextRoundNumber(rounds: { roundNumber: number; status: RoundStatus }[]): number {
  const active = rounds.filter((round) => round.status !== "RESCHEDULED");
  return active.reduce((max, round) => Math.max(max, round.roundNumber), 0) + 1;
}
