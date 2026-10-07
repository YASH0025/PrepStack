import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Section } from "@/components/page";
import { requireUser } from "@/modules/auth/service";
import { reportBookmarksFor } from "@/modules/bookmarks/service";
import { BookmarkButton } from "@/modules/bookmarks/ui/bookmark-button";
import { getCommunityService } from "@/modules/community/service";
import { FlagDialog, VoteButton } from "@/modules/community/ui/report-actions";
import { CommunityDisclaimer, ReportCard } from "@/modules/community/ui/report-card";
import { ReportView } from "@/modules/community/ui/report-view";
import { getContentService } from "@/modules/content/service";

export async function generateMetadata({
  params,
}: PageProps<"/intel/reports/[id]">): Promise<Metadata> {
  const { id } = await params;
  const report = await getCommunityService().getPublished(id);
  return { title: report ? `${report.companyName} · ${report.roleTitle} interview` : "Report" };
}

export default async function ReportPage({ params }: PageProps<"/intel/reports/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/intel/reports/${id}`);
  const community = getCommunityService();
  const report = await community.getPublished(id);
  if (!report) notFound();
  const [topics, voted, bookmarks, sameCompany] = await Promise.all([
    getContentService().topics({ publishedOnly: true }),
    community.votedIds(user.id),
    reportBookmarksFor(user.id).ids(),
    community.recentForCompanies([report.companySlug], 6),
  ]);
  const topicNames = Object.fromEntries(topics.map((topic) => [topic.id, topic.name]));
  const more = sameCompany.filter((other) => other.id !== report.id).slice(0, 5);

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <Link
        href="/intel"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Interview Intel
      </Link>
      <ReportView report={report} topicNames={topicNames} />
      <div className="flex flex-wrap items-start gap-2 border-t pt-4">
        <VoteButton reportId={report.id} voted={voted.has(report.id)} count={report.usefulCount} />
        <BookmarkButton reportId={report.id} bookmarked={bookmarks.has(report.id)} />
        <div className="ml-auto">
          <FlagDialog reportId={report.id} />
        </div>
      </div>
      <CommunityDisclaimer />
      {more.length > 0 && (
        <Section title={`More from ${report.companyName}`} className="pt-4">
          <ul className="grid gap-3">
            {more.map((other) => (
              <ReportCard key={other.id} report={other} topicNames={topicNames} />
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
