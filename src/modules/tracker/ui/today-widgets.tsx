import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarClock, MessageSquareText, NotebookPen, Reply } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatLocalDate, formatRoundTime } from "@/lib/format";

import { MODE_LABELS } from "../schemas";
import { type TrackerToday } from "../today";

export function NextInterviewCard({
  next,
  timezone,
}: {
  next: TrackerToday["next"];
  timezone: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Next interview</CardTitle>
        <CardDescription>
          {next ? `${next.companyName} · ${next.label}` : "Nothing scheduled."}
        </CardDescription>
        <CardAction>
          <CalendarClock className="size-5 text-primary" aria-hidden />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        {next ? (
          <>
            <div>
              <p className="text-2xl font-semibold tracking-tight">{next.countdown}</p>
              <p className="text-xs text-muted-foreground">
                {formatRoundTime(next.startUtc, next.endUtc, timezone)} · {MODE_LABELS[next.mode]}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {next.showSheet && (
                <Button asChild size="sm">
                  <Link href={`/interviews/rounds/${next.roundId}/revision-sheet`}>
                    <NotebookPen /> Revision sheet
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <Link href={`/interviews/calendar?round=${next.roundId}`}>Details</Link>
              </Button>
            </div>
          </>
        ) : (
          <Button asChild size="sm" variant="outline" className="w-fit">
            <Link href="/interviews/tracker">Add an interview</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function PendingDebriefsCard({
  items,
  timezone,
}: {
  items: TrackerToday["pendingDebriefs"];
  timezone: string;
}) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Debriefs to write</CardTitle>
        <CardDescription>Two minutes each, while you still remember.</CardDescription>
        <CardAction>
          <MessageSquareText className="size-5 text-primary" aria-hidden />
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {items.map((item) => (
            <li key={item.roundId} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.companyName}</span>
                <span className="text-xs text-muted-foreground">
                  {item.label} · {formatInTimeZone(new Date(item.startUtc), timezone, "EEE d MMM")}
                </span>
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href={`/interviews/rounds/${item.roundId}/debrief`}>Write</Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function FollowUpsCard({ items }: { items: TrackerToday["followUps"] }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Follow-ups due</CardTitle>
        <CardAction>
          <Reply className="size-5 text-primary" aria-hidden />
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 text-sm">
          {items.map((item) => (
            <li key={item.key} className="grid gap-0.5">
              <Link href={item.href} className="font-medium hover:underline">
                {item.companyName}
              </Link>
              <span className="text-xs text-muted-foreground">
                Due {formatLocalDate(item.date, "d MMM")}
                {item.note && ` · ${item.note}`}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
