import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { assessmentServiceFor } from "@/modules/assessment/service";
import { DiagnosticResults } from "@/modules/assessment/ui/diagnostic-results";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { requireProfile } from "@/modules/profile/service";

export const metadata: Metadata = { title: "Diagnostic results" };

export default async function OnboardingDiagnosticResultsPage({
  params,
}: PageProps<"/onboarding/diagnostic/[id]">) {
  const user = await requireUser();
  const profile = await requireProfile(user.id);
  const { id } = await params;
  const attempt = await assessmentServiceFor(user.id).get(id);
  if (!attempt) notFound();
  const topics = await getContentService().topics({ trackId: attempt.trackId });

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Your results</h1>
        <p className="text-sm text-muted-foreground">
          Your roadmap is ready and already reflects these results.
        </p>
      </div>
      <DiagnosticResults attempt={attempt} topics={topics} band={profile.experienceBand} />
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/roadmap">See my roadmap</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/today">Go to Today</Link>
        </Button>
      </div>
    </div>
  );
}
