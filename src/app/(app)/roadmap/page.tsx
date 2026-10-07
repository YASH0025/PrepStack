import type { Metadata } from "next";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { AlertTriangle, CalendarCheck, RefreshCw, Route } from "lucide-react";

import { EmptyState, PageHeader, Section } from "@/components/page";
import { SubmitButton } from "@/components/form-bits";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { startOfWeek, todayIn } from "@/lib/local-date";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { requireProfile } from "@/modules/profile/service";
import { regenerateRoadmapAction } from "@/modules/roadmap/actions";
import { type RoadmapItem } from "@/modules/roadmap/schemas";
import { roadmapServiceFor } from "@/modules/roadmap/service";
import { RoadmapItemRow } from "@/modules/roadmap/ui/roadmap-item-row";

export const metadata: Metadata = { title: "My Roadmap" };

function ReplanButton({ label = "Re-plan" }: { label?: string }) {
  return (
    <form action={regenerateRoadmapAction}>
      <SubmitButton variant="outline" size="sm" pendingText="Re-planning…">
        <RefreshCw /> {label}
      </SubmitButton>
    </form>
  );
}

export default async function RoadmapPage() {
  const user = await requireUser("/roadmap");
  const profile = await requireProfile(user.id);
  const service = roadmapServiceFor(user.id);
  const [roadmap, topics] = await Promise.all([
    service.get(),
    getContentService().topics({ trackId: profile.trackId }),
  ]);
  const topicMap = new Map(topics.map((topic) => [topic.id, topic]));

  if (!roadmap) {
    return (
      <>
        <PageHeader title="My Roadmap" />
        <EmptyState
          icon={Route}
          title="No roadmap yet"
          description="Build a day-by-day plan from your experience, target role and available time."
          action={
            <form action={regenerateRoadmapAction}>
              <SubmitButton pendingText="Building…">Build my roadmap</SubmitButton>
            </form>
          }
        />
      </>
    );
  }

  const today = todayIn(profile.timezone);
  const missed = service.missedItems(roadmap, today);
  const learn = roadmap.items.filter((item) => item.kind === "LEARN");
  const doneHours = learn
    .filter((item) => item.status === "DONE")
    .reduce((sum, item) => sum + item.hours, 0);
  const totalHours = learn.reduce((sum, item) => sum + item.hours, 0);
  const percent = totalHours ? Math.round((doneHours / totalHours) * 100) : 0;

  const weeks = new Map<string, Map<string, RoadmapItem[]>>();
  for (const item of roadmap.items) {
    const week = startOfWeek(item.scheduledDate);
    const days = weeks.get(week) ?? new Map<string, RoadmapItem[]>();
    const list = days.get(item.scheduledDate) ?? [];
    list.push(item);
    days.set(item.scheduledDate, list);
    weeks.set(week, days);
  }
  const currentWeek = startOfWeek(today);
  const pretty = (date: string, pattern = "EEE d MMM") => format(parseISO(date), pattern);

  return (
    <>
      <PageHeader
        title="My Roadmap"
        description={`${pretty(roadmap.startDate, "d MMM")} – ${pretty(roadmap.endDate, "d MMM yyyy")} · ${roadmap.deadlineLabel}`}
        actions={<ReplanButton />}
      />

      <div className="grid gap-6">
        {roadmap.endDate < today && (
          <Alert>
            <CalendarCheck aria-hidden />
            <AlertTitle>This plan ended on {pretty(roadmap.endDate, "d MMM")}</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>
                It was planned toward: {roadmap.deadlineLabel}. Re-plan toward your next interview
                or prep window. Completed work is kept.
              </span>
              <ReplanButton label="Plan the next stretch" />
            </AlertDescription>
          </Alert>
        )}
        {missed.length > 0 && roadmap.endDate >= today && (
          <Alert variant="warning">
            <AlertTriangle aria-hidden />
            <AlertTitle>
              {missed.length} task{missed.length === 1 ? "" : "s"} from earlier days not done
            </AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Re-plan to spread the remaining work over the days left. Completed work is kept.
              </span>
              <ReplanButton label="Re-plan now" />
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="gap-2">
            <CardHeader>
              <CardDescription>Progress</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{percent}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={percent} aria-label="Roadmap progress" />
              <p className="mt-2 text-xs text-muted-foreground">
                {doneHours.toFixed(1)}h of {totalHours.toFixed(1)}h of learning done
              </p>
            </CardContent>
          </Card>
          <Card className="gap-2">
            <CardHeader>
              <CardDescription>Study budget</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{roadmap.budgetHours}h</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {roadmap.dailyHours}h/day, with 15% kept for revision and weekly self-checks.
            </CardContent>
          </Card>
          <Card className="gap-2">
            <CardHeader>
              <CardDescription>Not in this plan</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{roadmap.skipped.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {roadmap.skipped.length
                ? "Topics that do not fit your time, with reasons below."
                : "Everything required fits in your time."}
            </CardContent>
          </Card>
        </div>

        <Section title="Plan by week">
          <div className="grid gap-3">
            {[...weeks].map(([week, days]) => {
              const weekItems = [...days.values()].flat();
              const weekDone = weekItems.filter((item) => item.status === "DONE").length;
              return (
                <details
                  key={week}
                  open={week >= currentWeek && week <= currentWeek}
                  className="group rounded-xl border"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-2 p-4">
                    <span className="font-medium">
                      Week of {pretty(week, "d MMM")}
                      {week === currentWeek && (
                        <Badge variant="info" className="ml-2">
                          This week
                        </Badge>
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {weekDone}/{weekItems.length} done
                    </span>
                  </summary>
                  <div className="grid gap-4 border-t px-4 pb-4">
                    {[...days].map(([date, items]) => (
                      <div key={date} className="grid gap-1 pt-3">
                        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          {pretty(date)}
                          {date === today && " · Today"}
                          {date < today &&
                            items.some((item) => item.status === "PENDING") &&
                            " · Missed"}
                        </h3>
                        <div className="divide-y">
                          {items.map((item) => (
                            <RoadmapItemRow key={item.id} item={item} topics={topicMap} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </Section>

        {roadmap.skipped.length > 0 && (
          <Section
            title="Skipped (does not fit your time)"
            description="Honest about time: these are left out, lowest priority first to go. Add time or extend your window to include them."
          >
            <ul className="divide-y rounded-xl border">
              {roadmap.skipped.map((entry) => {
                const topic = topicMap.get(entry.topicId);
                return (
                  <li key={entry.topicId} className="grid gap-0.5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      {topic ? (
                        <Link
                          href={`/practice/topics/${topic.slug}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {topic.name}
                        </Link>
                      ) : (
                        <span className="text-sm">Topic</span>
                      )}
                      <span className="text-xs text-muted-foreground">{entry.hours}h</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.reason}</p>
                  </li>
                );
              })}
            </ul>
            <p className="text-sm">
              <Link href="/profile" className="underline">
                Change your daily hours or prep window
              </Link>{" "}
              and re-plan.
            </p>
          </Section>
        )}

        {roadmap.alreadyMet.length > 0 && (
          <Section title="Already at the required depth" description="From your latest diagnostic.">
            <ul className="flex flex-wrap gap-2">
              {roadmap.alreadyMet.map((entry) => {
                const topic = topicMap.get(entry.topicId);
                return (
                  <li key={entry.topicId}>
                    <Badge variant="success" title={entry.reason}>
                      {topic?.name ?? "Topic"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}
      </div>
    </>
  );
}
