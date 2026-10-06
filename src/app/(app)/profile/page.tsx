import type { Metadata } from "next";

import { PageHeader, Section } from "@/components/page";
import { Separator } from "@/components/ui/separator";
import { requireUser } from "@/modules/auth/service";
import { ChangePasswordForm } from "@/modules/auth/ui/auth-forms";
import { getContentService } from "@/modules/content/service";
import { requireProfile } from "@/modules/profile/service";
import { ProfileForm } from "@/modules/profile/ui/profile-form";

export const metadata: Metadata = { title: "Profile & settings" };

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const profile = await requireProfile(user.id);
  const content = getContentService();
  const [tracks, roles] = await Promise.all([content.activeTracks(), content.roles()]);

  return (
    <>
      <PageHeader title="Profile & settings" description={user.email} />
      <div className="grid max-w-3xl gap-10">
        <Section
          title="Profile"
          description="Experience, target role and time drive your roadmap. Changes apply on the next re-plan."
        >
          <ProfileForm
            tracks={tracks}
            roles={roles}
            defaults={{
              displayName: profile.displayName,
              stack: profile.stack,
              yearsOfExperience: profile.yearsOfExperience,
              trackId: profile.trackId,
              targetRoleId: profile.targetRoleId,
              targetCompanies: profile.targetCompanies,
              prepWindowDays: profile.prepWindowDays,
              dailyHours: profile.dailyHours,
              timezone: profile.timezone,
            }}
          />
        </Section>
        <Separator />
        <Section title="Password" description="Changing it signs out your other devices.">
          <ChangePasswordForm />
        </Section>
      </div>
    </>
  );
}
