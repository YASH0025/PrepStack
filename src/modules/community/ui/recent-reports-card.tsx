import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUND_TYPE_LABELS } from "@/lib/domain";

import { type InterviewReport } from "../schemas";
import { formatMonthYear } from "./report-view";

/** Recent community reports for the companies the user is interviewing with. */
export function RecentReportsCard({
  reports,
  hasTrackedCompanies,
}: {
  reports: InterviewReport[];
  hasTrackedCompanies: boolean;
}) {
  if (!hasTrackedCompanies) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>From the community</CardTitle>
        <CardDescription>
          {reports.length
            ? "Recent reports for companies you are tracking."
            : "No reports yet for the companies you are tracking."}
        </CardDescription>
        <CardAction>
          <Compass className="size-5 text-primary" aria-hidden />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        {reports.length > 0 && (
          <ul className="grid gap-2 text-sm">
            {reports.map((report) => (
              <li key={report.id} className="grid gap-0.5">
                <Link href={`/intel/reports/${report.id}`} className="font-medium hover:underline">
                  {report.companyName} · {report.roleTitle}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {report.rounds.map((round) => ROUND_TYPE_LABELS[round.type]).join(", ")} ·{" "}
                  {formatMonthYear(report.monthYear)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild size="sm" variant="outline" className="w-fit">
          <Link href="/intel">Interview Intel</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
