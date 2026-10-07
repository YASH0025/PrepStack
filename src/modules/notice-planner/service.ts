import "server-only";

import { formatInTimeZone } from "date-fns-tz";

import { getProfile } from "@/modules/profile/service";
import { trackerFor } from "@/modules/tracker/service";

import { type NoticeOutcome, type PlannerContext, computeNoticePlan } from "./domain/planner";
import { type NoticePlanRepository } from "./repository";
import { JsonNoticePlanRepository } from "./repository.json";
import { type NoticePlan, type NoticePlanInput } from "./schemas";

const TECHNICAL_TYPES = new Set(["TECHNICAL", "CODING", "SYSTEM_DESIGN", "TAKE_HOME"]);

export class NoticePlannerService {
  constructor(
    private readonly userId: string,
    private readonly repo: NoticePlanRepository,
  ) {}

  get(): Promise<NoticePlan | null> {
    return this.repo.get();
  }

  save(input: NoticePlanInput): Promise<NoticePlan> {
    // Fields that do not apply to the chosen state are not kept.
    const serving = input.resignationState === "SERVING";
    return this.repo.set({
      ...input,
      resignationDate: serving ? input.resignationDate : null,
      noticeDays: input.resignationState === "RELIEVED" ? null : input.noticeDays,
    });
  }

  clear(): Promise<void> {
    return this.repo.clear();
  }

  /** The stored plan plus its computed outcome, or null if the user has no plan. */
  async outcome(
    now: Date = new Date(),
  ): Promise<{ plan: NoticePlan; outcome: NoticeOutcome } | null> {
    const plan = await this.repo.get();
    if (!plan) return null;
    return { plan, outcome: computeNoticePlan(plan, await this.context(now)) };
  }

  private async context(now: Date): Promise<PlannerContext> {
    const tracker = trackerFor(this.userId);
    const [profile, rounds, applications] = await Promise.all([
      getProfile(this.userId),
      tracker.listRounds(),
      tracker.listApplications(),
    ]);
    const timezone = profile?.timezone ?? "UTC";
    const local = (iso: string) => formatInTimeZone(new Date(iso), timezone, "yyyy-MM-dd");
    return {
      today: formatInTimeZone(now, timezone, "yyyy-MM-dd"),
      prepWindowDays: profile?.prepWindowDays ?? 30,
      scheduledRoundDates: rounds
        .filter((round) => round.status === "SCHEDULED" && new Date(round.startUtc) > now)
        .map((round) => local(round.startUtc)),
      offers: applications
        .filter((app) => app.status === "OFFER_RECEIVED" || app.status === "OFFER_ACCEPTED")
        .map((app) => ({ company: app.companyName, joiningDate: app.offerJoiningDate })),
      hasClearedTechnical: rounds.some(
        (round) =>
          round.status === "COMPLETED" &&
          round.result === "CLEARED" &&
          TECHNICAL_TYPES.has(round.type),
      ),
    };
  }
}

/** Always scoped to one user's private folder. Pass the authenticated user's id. */
export function noticePlannerFor(userId: string): NoticePlannerService {
  return new NoticePlannerService(userId, new JsonNoticePlanRepository(userId));
}
