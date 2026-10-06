import type { Metadata } from "next";

import { EmptyState } from "@/components/page";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { getProfile } from "@/modules/profile/service";
import { OnboardingWizard } from "@/modules/profile/ui/onboarding-wizard";

export const metadata: Metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  const content = getContentService();
  const [tracks, roles, profile] = await Promise.all([
    content.activeTracks(),
    content.roles(),
    getProfile(user.id),
  ]);

  if (tracks.length === 0) {
    return (
      <EmptyState
        title="No tracks available yet"
        description="An admin needs to publish a track before onboarding can start."
      />
    );
  }

  return (
    <OnboardingWizard
      tracks={tracks}
      roles={roles}
      defaults={
        profile
          ? {
              displayName: profile.displayName,
              stack: profile.stack,
              yearsOfExperience: profile.yearsOfExperience,
              trackId: profile.trackId,
              targetRoleId: profile.targetRoleId,
              targetCompanies: profile.targetCompanies,
              prepWindowDays: profile.prepWindowDays,
              dailyHours: profile.dailyHours,
              timezone: profile.timezone,
            }
          : {}
      }
    />
  );
}
