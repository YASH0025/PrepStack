import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { bandForYears } from "@/lib/domain";
import { getContentService } from "@/modules/content/service";

import { type ProfileRepository } from "./repository";
import { JsonProfileRepository } from "./repository.json";
import {
  DEFAULT_REMINDER_MINUTES,
  type Profile,
  type ProfileInput,
  type ReminderSettings,
} from "./schemas";

export class ProfileValidationError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = "ProfileValidationError";
  }
}

export class ProfileService {
  constructor(private readonly repo: ProfileRepository) {}

  get(): Promise<Profile | null> {
    return this.repo.get();
  }

  /**
   * Creates or updates the profile from onboarding/profile input. The
   * experience band is always derived from years, never trusted from input.
   */
  async save(
    input: ProfileInput,
    options: { completeOnboarding?: boolean } = {},
  ): Promise<Profile> {
    const content = getContentService();
    const role = await content.role(input.targetRoleId);
    if (!role || role.trackId !== input.trackId) {
      throw new ProfileValidationError("Pick a role from the selected track", "targetRoleId");
    }
    const track = await content.track(input.trackId);
    if (!track?.active) throw new ProfileValidationError("This track is not available", "trackId");

    const current = await this.repo.get();
    const completedAt =
      current?.onboardingCompletedAt ??
      (options.completeOnboarding ? new Date().toISOString() : null);

    return this.repo.set({
      ...input,
      experienceBand: bandForYears(input.yearsOfExperience),
      reminderMinutes: current?.reminderMinutes ?? DEFAULT_REMINDER_MINUTES,
      reviewDailyCap: current?.reviewDailyCap ?? 20,
      onboardingCompletedAt: completedAt,
    });
  }

  async saveReminderSettings(settings: ReminderSettings): Promise<Profile | null> {
    return this.repo.update(settings);
  }
}

/** Always scoped to one user's private folder. Pass the authenticated user's id. */
export function profileServiceFor(userId: string): ProfileService {
  return new ProfileService(new JsonProfileRepository(userId));
}

export const getProfile = cache(async (userId: string) => profileServiceFor(userId).get());

/** For pages that need a completed onboarding: redirects to /onboarding otherwise. */
export async function requireProfile(userId: string): Promise<Profile> {
  const profile = await getProfile(userId);
  if (!profile?.onboardingCompletedAt) redirect("/onboarding");
  return profile;
}
