import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Hourglass, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { daysBetween } from "@/lib/local-date";

import { type NoticeOutcome } from "../domain/planner";
import { type NoticePlan, RESIGNATION_STATE_LABELS } from "../schemas";

const short = (date: string) => format(parseISO(date), "d MMM");

/** Today-dashboard card: notice progress, key dates and the first warning. */
export function NoticeWidget({
  plan,
  outcome,
  today,
}: {
  plan: NoticePlan | null;
  outcome: NoticeOutcome | null;
  today: string;
}) {
  if (!plan || !outcome) {
    return (
      <Card>
        <CardHeader>
          <Hourglass className="size-5 text-primary" aria-hidden />
          <CardTitle>Notice period</CardTitle>
          <CardDescription>
            Serving notice or planning to resign? Plan your timeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link href="/interviews/notice-planner">Open the planner</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const current = outcome.phases.find((phase) => today >= phase.start && today <= phase.end);
  const upcoming = outcome.markers.filter((marker) => marker.date > today).slice(0, 2);
  const warning = outcome.warnings[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notice period</CardTitle>
        <CardDescription>
          {RESIGNATION_STATE_LABELS[plan.resignationState]}
          {current && ` · ${current.label}`}
        </CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/interviews/notice-planner">Details</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {outcome.progress && outcome.lwd && (
          <div className="grid gap-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Day {outcome.progress.elapsedDays} of {outcome.progress.totalDays}
              </span>
              <span>
                LWD {short(outcome.lwd)}
                {outcome.lwd >= today && ` · ${daysBetween(today, outcome.lwd)} days left`}
              </span>
            </div>
            <Progress value={outcome.progress.percent} aria-label="Notice period served" />
          </div>
        )}
        {!outcome.lwd && outcome.lwdIfResignToday && (
          <p className="text-xs text-muted-foreground">
            Resigning today would make {short(outcome.lwdIfResignToday)} your last working day.
          </p>
        )}
        {upcoming.length > 0 && (
          <ul className="grid gap-1 text-xs">
            {upcoming.map((marker) => (
              <li key={`${marker.kind}-${marker.date}`} className="flex justify-between gap-2">
                <span>{marker.label}</span>
                <span className="text-muted-foreground">{short(marker.date)}</span>
              </li>
            ))}
          </ul>
        )}
        {warning && (
          <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {warning.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
