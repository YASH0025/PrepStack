import type { Metadata } from "next";
import { Download } from "lucide-react";

import { PageHeader, Section } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DeleteAccountForm } from "@/modules/account/ui/delete-account-form";
import { requireUser } from "@/modules/auth/service";
import { ChangePasswordForm } from "@/modules/auth/ui/auth-forms";
import { getContentService } from "@/modules/content/service";
import { requireProfile } from "@/modules/profile/service";
import { ProfileForm } from "@/modules/profile/ui/profile-form";
import { debriefsFor } from "@/modules/tracker/debrief-service";

export const metadata: Metadata = { title: "Profile & settings" };

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const profile = await requireProfile(user.id);
  const content = getContentService();
  const [tracks, roles, debriefs] = await Promise.all([
    content.activeTracks(),
    content.roles(),
    debriefsFor(user.id).list(),
  ]);
  const sharedCount = debriefs.reduce((sum, debrief) => sum + debrief.publishedReportIds.length, 0);

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
        <Separator />
        <Section
          title="Your data"
          description="Download everything PrepStack stores about you, including decrypted notes, as a JSON file."
        >
          <Button asChild variant="outline" className="w-fit">
            <a href="/api/account/export" download>
              <Download /> Download my data
            </a>
          </Button>
        </Section>
        <Separator />
        <Section title="Delete account" description="Permanently remove your account and data.">
          <DeleteAccountForm sharedCount={sharedCount} />
        </Section>
      </div>
    </>
  );
}
