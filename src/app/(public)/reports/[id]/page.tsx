import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ROUND_TYPE_LABELS } from "@/lib/domain";
import { getCurrentUser } from "@/modules/auth/service";
import { getCommunityService } from "@/modules/community/service";
import { CommunityDisclaimer } from "@/modules/community/ui/report-card";
import { ReportView, formatMonthYear } from "@/modules/community/ui/report-view";
import { getContentService } from "@/modules/content/service";

export async function generateMetadata({ params }: PageProps<"/reports/[id]">): Promise<Metadata> {
  const { id } = await params;
  const report = await getCommunityService().getPublished(id);
  if (!report) return { title: "Report not found", robots: { index: false } };
  const rounds = report.rounds.map((round) => ROUND_TYPE_LABELS[round.type]).join(", ");
  const title = `${report.companyName} ${report.roleTitle} interview (${formatMonthYear(report.monthYear)})`;
  return {
    title,
    description: `${rounds} round${report.rounds.length === 1 ? "" : "s"} · difficulty ${report.overallDifficulty}/5 · questions and topics shared by a candidate.`,
    alternates: { canonical: `/reports/${report.id}` },
    openGraph: { title, type: "article" },
  };
}

/** Public, server-rendered report. Published reports contain no personal data. */
export default async function PublicReportPage({ params }: PageProps<"/reports/[id]">) {
  const { id } = await params;
  const community = getCommunityService();
  const report = await community.getPublished(id);
  if (!report) notFound();
  const [topics, user] = await Promise.all([
    getContentService().topics({ publishedOnly: true }),
    getCurrentUser(),
  ]);
  const topicNames = Object.fromEntries(topics.map((topic) => [topic.id, topic.name]));
  return (
    <div className="grid max-w-3xl gap-6">
      <Link
        href={`/reports?company=${encodeURIComponent(report.companyName)}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← More {report.companyName} interviews
      </Link>
      <ReportView report={report} topicNames={topicNames} />
      <CommunityDisclaimer />
      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm">
        <span className="flex-1">
          {user
            ? "Vote, save or report this in Interview Intel."
            : "Track your own interviews and get a revision sheet before each round."}
        </span>
        <Button asChild size="sm">
          <Link href={user ? `/intel/reports/${report.id}` : "/signup"}>
            {user ? "Open in Interview Intel" : "Get started free"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
