/**
 * Notice-period planner (PURE, deterministic). Turns the user's notice
 * situation into a last working day, suggested phases, calendar markers and
 * warnings. Informational only: no legal or HR advice.
 *
 * All dates are "yyyy-MM-dd" in the user's timezone.
 */
import { type LocalDateString, addDays, daysBetween } from "@/lib/local-date";

import { type NoticePlan } from "../schemas";

export type PhaseKind = "PREP" | "INTERVIEWS" | "OFFER" | "BUFFER";

export const PHASE_LABELS: Record<PhaseKind, string> = {
  PREP: "Prep phase",
  INTERVIEWS: "Interview window",
  OFFER: "Offer & negotiation",
  BUFFER: "Buffer before last day",
};

export interface Phase {
  kind: PhaseKind;
  /** Inclusive. */
  start: LocalDateString;
  /** Inclusive. */
  end: LocalDateString;
  label: string;
}

export type MarkerKind = "RESIGNATION" | "LWD" | "PHASE" | "TARGET_JOINING";

export interface NoticeMarker {
  date: LocalDateString;
  kind: MarkerKind;
  label: string;
}

export type WarningCode =
  | "NO_INTERVIEWS_NEAR_LWD"
  | "JOINING_BEFORE_LWD"
  | "INTERVIEWS_CLUSTERED_LATE"
  | "LWD_PASSED"
  | "TARGET_BEFORE_LWD";

export interface NoticeWarning {
  code: WarningCode;
  message: string;
}

export type ResignationAdvice = "OFFER_IN_HAND" | "CLEARED_TECHNICAL" | "KEEP_INTERVIEWING";

export interface PlannerContext {
  today: LocalDateString;
  prepWindowDays: number;
  /** Upcoming scheduled rounds (local dates). */
  scheduledRoundDates: LocalDateString[];
  /** Offers with a joining date (OFFER_RECEIVED / OFFER_ACCEPTED applications). */
  offers: { company: string; joiningDate: LocalDateString | null }[];
  /** True when any application has a completed + cleared technical-type round. */
  hasClearedTechnical: boolean;
}

export interface NoticeOutcome {
  /** Last working day, when it can be computed. */
  lwd: LocalDateString | null;
  /** For not-resigned users with a known notice period: LWD if they resigned today. */
  lwdIfResignToday: LocalDateString | null;
  phases: Phase[];
  markers: NoticeMarker[];
  warnings: NoticeWarning[];
  /** Notice served so far, for serving users. */
  progress: { elapsedDays: number; totalDays: number; percent: number } | null;
  /** End of the prep phase: a roadmap deadline (null when there is no fixed timeline). */
  prepPhaseEnd: LocalDateString | null;
  resignationAdvice: ResignationAdvice | null;
}

/** Phase split of a timeline (fractions of the total length). */
const SPLIT: [PhaseKind, number][] = [
  ["PREP", 0.25],
  ["INTERVIEWS", 0.45],
  ["OFFER", 0.2],
  ["BUFFER", 0.1],
];
const MIN_BUFFER_DAYS = 3;

/** LWD convention: resignation date + notice days. Confirm with HR. */
export function lastWorkingDay(resignationDate: LocalDateString, noticeDays: number) {
  return addDays(resignationDate, noticeDays);
}

/**
 * Splits [start, end] (inclusive) into consecutive phases. Every phase gets at
 * least one day when the span allows; the buffer gets at least three days.
 */
export function splitPhases(
  start: LocalDateString,
  end: LocalDateString,
  split: [PhaseKind, number][] = SPLIT,
): Phase[] {
  const total = daysBetween(start, end) + 1;
  if (total <= 0) return [];
  const kinds = split.filter(([, share]) => share > 0);
  if (total < kinds.length) {
    return [{ kind: kinds[kinds.length - 1]?.[0] ?? "BUFFER", start, end, label: "" }].map(
      withLabel,
    );
  }
  const lengths = kinds.map(([, share]) => Math.max(1, Math.round(total * share)));
  const bufferIndex = kinds.findIndex(([kind]) => kind === "BUFFER");
  if (bufferIndex >= 0) {
    lengths[bufferIndex] = Math.max(
      lengths[bufferIndex] ?? 1,
      Math.min(MIN_BUFFER_DAYS, total - (kinds.length - 1)),
    );
  }
  // Absorb rounding into the largest non-buffer phase so lengths sum to total.
  let diff = total - lengths.reduce((sum, length) => sum + length, 0);
  while (diff !== 0) {
    const index = largestAdjustable(lengths, bufferIndex, diff < 0);
    if (index < 0) break;
    lengths[index] = (lengths[index] ?? 1) + Math.sign(diff);
    diff -= Math.sign(diff);
  }
  const phases: Phase[] = [];
  let cursor = start;
  kinds.forEach(([kind], index) => {
    const length = lengths[index] ?? 1;
    const phaseEnd = addDays(cursor, length - 1);
    phases.push(withLabel({ kind, start: cursor, end: phaseEnd, label: "" }));
    cursor = addDays(phaseEnd, 1);
  });
  return phases;
}

function largestAdjustable(lengths: number[], bufferIndex: number, shrinking: boolean): number {
  let best = -1;
  lengths.forEach((length, index) => {
    if (index === bufferIndex && lengths.length > 1) return;
    if (shrinking && length <= 1) return;
    if (best < 0 || length > (lengths[best] ?? 0)) best = index;
  });
  return best;
}

function withLabel(phase: Phase): Phase {
  return { ...phase, label: PHASE_LABELS[phase.kind] };
}

const NEAR_LWD_DAYS = 21;

export function computeNoticePlan(plan: NoticePlan, ctx: PlannerContext): NoticeOutcome {
  const warnings: NoticeWarning[] = [];
  const markers: NoticeMarker[] = [];
  const upcoming = ctx.scheduledRoundDates.filter((date) => date >= ctx.today).sort();

  let lwd: LocalDateString | null = null;
  let lwdIfResignToday: LocalDateString | null = null;
  let phases: Phase[] = [];
  let progress: NoticeOutcome["progress"] = null;
  let resignationAdvice: ResignationAdvice | null = null;

  if (plan.resignationState === "SERVING" && plan.resignationDate && plan.noticeDays !== null) {
    lwd = lastWorkingDay(plan.resignationDate, plan.noticeDays);
    phases = splitPhases(plan.resignationDate, lwd);
    markers.push({
      date: plan.resignationDate,
      kind: "RESIGNATION",
      label: "Resigned",
    });
    const total = Math.max(1, plan.noticeDays);
    const elapsed = Math.min(total, Math.max(0, daysBetween(plan.resignationDate, ctx.today)));
    progress = {
      elapsedDays: elapsed,
      totalDays: total,
      percent: Math.round((elapsed / total) * 100),
    };

    if (lwd < ctx.today) {
      warnings.push({
        code: "LWD_PASSED",
        message: `Your last working day (${lwd}) has passed. If you have been relieved, switch to "Already relieved".`,
      });
    } else {
      const daysLeft = daysBetween(ctx.today, lwd);
      if (daysLeft <= NEAR_LWD_DAYS && upcoming.length === 0) {
        warnings.push({
          code: "NO_INTERVIEWS_NEAR_LWD",
          message: `Your last working day is in ${daysLeft} day${daysLeft === 1 ? "" : "s"} and you have no interviews scheduled.`,
        });
      }
      const interviewWindow = phases.find((phase) => phase.kind === "INTERVIEWS");
      if (interviewWindow && upcoming.length >= 2) {
        const late = upcoming.filter((date) => date > interviewWindow.end).length;
        if (late / upcoming.length > 0.6) {
          warnings.push({
            code: "INTERVIEWS_CLUSTERED_LATE",
            message: `Most of your interviews are after ${interviewWindow.end}; you may run short on time for offers and negotiation.`,
          });
        }
      }
    }
  } else if (plan.resignationState === "NOT_RESIGNED") {
    if (plan.noticeDays !== null) lwdIfResignToday = lastWorkingDay(ctx.today, plan.noticeDays);
    phases = splitPhases(ctx.today, addDays(ctx.today, Math.max(7, ctx.prepWindowDays) - 1), [
      ["PREP", 0.4],
      ["INTERVIEWS", 0.45],
      ["OFFER", 0.15],
    ]);
    resignationAdvice = ctx.offers.length
      ? "OFFER_IN_HAND"
      : ctx.hasClearedTechnical
        ? "CLEARED_TECHNICAL"
        : "KEEP_INTERVIEWING";
  } else if (plan.resignationState === "RELIEVED") {
    const end =
      plan.targetJoiningFrom && plan.targetJoiningFrom > ctx.today
        ? addDays(plan.targetJoiningFrom, -1)
        : addDays(ctx.today, Math.max(7, ctx.prepWindowDays) - 1);
    phases = splitPhases(ctx.today, end, [
      ["PREP", 0.35],
      ["INTERVIEWS", 0.45],
      ["OFFER", 0.2],
    ]);
  }

  // Offers whose joining date falls before the date the user is free to join.
  const freeFrom = lwd ? addDays(lwd, 1) : lwdIfResignToday ? addDays(lwdIfResignToday, 1) : null;
  if (freeFrom) {
    for (const offer of ctx.offers) {
      if (offer.joiningDate && offer.joiningDate < freeFrom) {
        warnings.push({
          code: "JOINING_BEFORE_LWD",
          message: `${offer.company}'s joining date (${offer.joiningDate}) is before you are free to join (${freeFrom}); consider asking about buyout, early release or a later joining date.`,
        });
      }
    }
  }
  if (lwd && plan.targetJoiningFrom && plan.targetJoiningFrom <= lwd) {
    warnings.push({
      code: "TARGET_BEFORE_LWD",
      message: `Your target joining window starts on or before your last working day (${lwd}).`,
    });
  }

  if (lwd) markers.push({ date: lwd, kind: "LWD", label: "Last working day" });
  for (const phase of phases.slice(1)) {
    markers.push({ date: phase.start, kind: "PHASE", label: `${phase.label} starts` });
  }
  if (plan.targetJoiningFrom) {
    markers.push({
      date: plan.targetJoiningFrom,
      kind: "TARGET_JOINING",
      label: "Target joining window starts",
    });
  }

  const prep = phases.find((phase) => phase.kind === "PREP");
  const hasFixedTimeline =
    plan.resignationState === "SERVING" ||
    (plan.resignationState === "RELIEVED" && plan.targetJoiningFrom !== null);
  // A prep phase that already ended is not a constraint (the roadmap ignores past deadlines).
  const prepPhaseEnd = hasFixedTimeline && prep && prep.end >= ctx.today ? prep.end : null;

  return {
    lwd,
    lwdIfResignToday,
    phases,
    markers: markers.sort((a, b) => a.date.localeCompare(b.date)),
    warnings,
    progress,
    prepPhaseEnd,
    resignationAdvice,
  };
}
