import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";

import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { assessmentServiceFor } from "@/modules/assessment/service";
import { DiagnosticResults } from "@/modules/assessment/ui/diagnostic-results";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { requireProfile } from "@/modules/profile/service";

export const metadata: Metadata = { title: "Diagnostic results" };

export default async function DiagnosticAttemptPage({
  params,
}: PageProps<"/practice/diagnostic/[id]">) {
  const user = await requireUser();
  const profile = await requireProfile(user.id);
  const { id } = await params;
  const attempt = await assessmentServiceFor(user.id).get(id);
  if (!attempt) notFound();
  const topics = await getContentService().topics({ trackId: attempt.trackId });

  return (
    <>
      <PageHeader
        title="Diagnostic results"
        description={format(new Date(attempt.completedAt), "d MMM yyyy, HH:mm")}
        actions={
          <Button asChild variant="outline">
            <Link href="/roadmap">See roadmap</Link>
          </Button>
        }
      />
      <DiagnosticResults attempt={attempt} topics={topics} band={profile.experienceBand} />
    </>
  );
}
