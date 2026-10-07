import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader, Section } from "@/components/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/modules/auth/service";
import { getCommunityService } from "@/modules/community/service";
import { getContentService } from "@/modules/content/service";
import { requireProfile } from "@/modules/profile/service";
import { ShareError, initialShareDraft, shareContext } from "@/modules/tracker/share";
import { ShareForm } from "@/modules/tracker/ui/share-form";
import { SharedReports } from "@/modules/tracker/ui/shared-reports";

export const metadata: Metadata = { title: "Share anonymized version" };

export default async function SharePage({ params }: PageProps<"/interviews/rounds/[id]/share">) {
  const { id } = await params;
  const user = await requireUser(`/interviews/rounds/${id}/share`);
  const profile = await requireProfile(user.id);

  let context;
  try {
    context = await shareContext(user, id);
  } catch (error) {
    if (!(error instanceof ShareError)) throw error;
    if (error.message === "Round not found") notFound();
    return (
      <div className="mx-auto grid max-w-3xl gap-4">
        <PageHeader title="Share anonymized version" />
        <Alert>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
        <Button asChild className="w-fit">
          <Link href={`/interviews/rounds/${id}/debrief`}>Write debrief</Link>
        </Button>
      </div>
    );
  }

  const [topics, shared] = await Promise.all([
    getContentService().topics({ publishedOnly: true }),
    getCommunityService().getMany(context.debrief.publishedReportIds),
  ]);
  const topicNames = Object.fromEntries(topics.map((topic) => [topic.id, topic.name]));
  const { draft, findings } = initialShareDraft(context, profile.experienceBand, profile.timezone);
  const removed = [...new Set(findings.map((finding) => finding.kind))].map((kind) => ({
    kind,
    count: findings.filter((finding) => finding.kind === kind).length,
  }));

  return (
    <div className="mx-auto grid max-w-3xl gap-2">
      <Link
        href={`/interviews/calendar?round=${id}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to the round
      </Link>
      <PageHeader
        title="Share anonymized version"
        description="Help the next candidate. Your debrief stays private; this creates a separate, anonymous report that never links back to you."
      />
      {shared.length > 0 && (
        <Section title="Already shared" className="pb-6">
          <SharedReports
            roundId={id}
            reports={shared.map((report) => ({
              id: report.id,
              status: report.status,
              title: `${report.companyName} · ${report.roleTitle}`,
              moderationNote: report.moderationNote,
            }))}
          />
        </Section>
      )}
      <ShareForm roundId={id} initial={draft} initiallyRemoved={removed} topicNames={topicNames} />
    </div>
  );
}
