import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { ShieldCheck } from "lucide-react";

import { EmptyState, PageHeader, Section } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listAuditEntries } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/auth/service";
import {
  FLAG_REASON_LABELS,
  type InterviewReport,
  type ReportDraft,
  type ReportFlag,
} from "@/modules/community/schemas";
import { getCommunityService } from "@/modules/community/service";
import { ModerationControls } from "@/modules/community/ui/moderation-controls";
import { ReportView } from "@/modules/community/ui/report-view";
import { getContentService } from "@/modules/content/service";

export const metadata: Metadata = { title: "Moderation" };

const TABS = ["pending", "flagged", "hidden"] as const;
type Tab = (typeof TABS)[number];

function toDraft(report: InterviewReport): ReportDraft {
  return {
    companyName: report.companyName,
    roleTitle: report.roleTitle,
    technologies: report.technologies,
    experienceBand: report.experienceBand,
    monthYear: report.monthYear,
    outcome: report.outcome,
    overallDifficulty: report.overallDifficulty,
    summary: report.summary,
    rounds: report.rounds,
  };
}

export default async function ModerationPage({ searchParams }: PageProps<"/admin/moderation">) {
  await requireAdmin();
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "pending";
  const [queue, topics, audit] = await Promise.all([
    getCommunityService().moderationQueue(),
    getContentService().topics(),
    listAuditEntries(200),
  ]);
  const topicNames = Object.fromEntries(topics.map((topic) => [topic.id, topic.name]));
  const counts = {
    pending: queue.pending.length,
    flagged: queue.flagged.length,
    hidden: queue.hidden.length,
  };
  const entries: { report: InterviewReport; flags: ReportFlag[] }[] =
    tab === "flagged"
      ? queue.flagged
      : (tab === "pending" ? queue.pending : queue.hidden).map((report) => ({ report, flags: [] }));
  const history = audit.filter((entry) => entry.entityType === "interview-report").slice(0, 20);

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Moderation"
        description="Approve new reports, handle flags and edit anything that could identify someone."
      />
      <nav aria-label="Moderation queues" className="flex gap-1 border-b">
        {TABS.map((name) => (
          <Link
            key={name}
            href={`/admin/moderation?tab=${name}`}
            aria-current={tab === name ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm capitalize",
              tab === name
                ? "border-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {name} ({counts[name]})
          </Link>
        ))}
      </nav>
      {entries.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing to review"
          description="This queue is empty."
        />
      ) : (
        <ul className="grid gap-4">
          {entries.map(({ report, flags }) => (
            <li key={report.id} className="grid gap-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{report.status}</Badge>
                <span>Submitted {format(new Date(report.createdAt), "d MMM yyyy")}</span>
                {report.moderationNote && <span>· Note: {report.moderationNote}</span>}
              </div>
              {flags.length > 0 && (
                <ul className="grid gap-1 rounded-md bg-amber-50 p-3 text-sm dark:bg-amber-950/40">
                  {flags.map((flag) => (
                    <li key={flag.id}>
                      <span className="font-medium">{FLAG_REASON_LABELS[flag.reason]}</span>
                      {flag.note && <span className="text-muted-foreground"> — {flag.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
              <ReportView report={report} topicNames={topicNames} />
              <ModerationControls
                reportId={report.id}
                status={report.status}
                hasFlags={flags.length > 0}
                draft={toDraft(report)}
                topicNames={topicNames}
              />
            </li>
          ))}
        </ul>
      )}
      {history.length > 0 && (
        <Section title="Recent moderation" className="pt-4">
          <ul className="grid gap-1 text-sm text-muted-foreground">
            {history.map((entry) => (
              <li key={entry.id}>
                {format(new Date(entry.createdAt), "d MMM, HH:mm")} ·{" "}
                {entry.action.replace("report.", "")} ·{" "}
                <code className="text-xs">{entry.entityId.slice(0, 8)}</code>
                {entry.details && <> · {entry.details}</>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
