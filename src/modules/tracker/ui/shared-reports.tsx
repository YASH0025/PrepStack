"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type ReportStatus } from "@/modules/community/schemas";

import { unpublishReportAction } from "../share-actions";

const STATUS: Record<ReportStatus, { label: string; variant: "info" | "success" | "muted" }> = {
  PENDING: { label: "Awaiting moderation", variant: "info" },
  PUBLISHED: { label: "Published", variant: "success" },
  HIDDEN: { label: "Hidden by moderators", variant: "muted" },
};

/** The user's own shared versions of this round (ids come from their private debrief). */
export function SharedReports({
  roundId,
  reports,
}: {
  roundId: string;
  reports: { id: string; status: ReportStatus; title: string; moderationNote: string | null }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <ul className="grid gap-2">
      {reports.map((report) => (
        <li
          key={report.id}
          className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm"
        >
          <Badge variant={STATUS[report.status].variant}>{STATUS[report.status].label}</Badge>
          {report.status === "PUBLISHED" ? (
            <Link href={`/intel/reports/${report.id}`} className="font-medium hover:underline">
              {report.title}
            </Link>
          ) : (
            <span className="font-medium">{report.title}</span>
          )}
          {report.moderationNote && (
            <span className="w-full text-xs text-muted-foreground">
              Moderator note: {report.moderationNote}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Delete this shared report? This cannot be undone.")) return;
              startTransition(async () => {
                await unpublishReportAction(roundId, report.id);
                router.refresh();
              });
            }}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete
          </Button>
        </li>
      ))}
    </ul>
  );
}
