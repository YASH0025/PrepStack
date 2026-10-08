import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader, Section } from "@/components/page";
import { env } from "@/lib/env";
import { requireUser } from "@/modules/auth/service";
import { passportFor } from "@/modules/passport/service";
import { PassportControls, PassportNameForm } from "@/modules/passport/ui/passport-controls";
import { PassportView } from "@/modules/passport/ui/passport-view";
import { requireProfile } from "@/modules/profile/service";

export const metadata: Metadata = { title: "Readiness passport" };

export default async function PassportSettingsPage() {
  const user = await requireUser("/profile/passport");
  const profile = await requireProfile(user.id);
  const passport = passportFor(user.id);
  const [status, preview] = await Promise.all([passport.status(), passport.compute()]);
  const url = status.token ? new URL(`/passport/${status.token}`, env.APP_URL).toString() : null;

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Link
        href="/profile"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Profile
      </Link>
      <PageHeader
        title="Readiness passport"
        description="A shareable summary of your preparation, for recruiters or referrers. It never shows salaries, companies, interview history or notes."
        className="pb-0"
      />
      <Section title="Sharing">
        <PassportControls url={url} enabled={status.enabled} />
      </Section>
      <Section title="Name">
        <PassportNameForm defaultName={status.displayName || profile.displayName} />
      </Section>
      <Section
        title={status.enabled ? "What people see" : "Preview"}
        description={
          status.enabled
            ? "The shared page updates every day, or when you click Update now."
            : "This is what the page will show once you create a link."
        }
      >
        <div className="rounded-xl border bg-muted/30 p-4">
          {status.enabled && status.snapshot ? (
            <PassportView data={status.snapshot.data} generatedAt={status.snapshot.generatedAt} />
          ) : preview ? (
            <PassportView data={preview} generatedAt={null} />
          ) : null}
        </div>
      </Section>
    </div>
  );
}
