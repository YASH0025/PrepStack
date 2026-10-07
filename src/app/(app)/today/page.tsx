import type { Metadata } from "next";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import {
  Brain,
  CalendarCheck,
  ClipboardCheck,
  PartyPopper,
  Route,
  TriangleAlert,
} from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page";
import { SubmitButton } from "@/components/form-bits";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { DEPTH_LEVEL } from "@/lib/domain";
import { addDays, todayIn } from "@/lib/local-date";
import { assessmentServiceFor } from "@/modules/assessment/service";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { noticePlannerFor } from "@/modules/notice-planner/service";
import { NoticeWidget } from "@/modules/notice-planner/ui/notice-widget";
import { requireProfile } from "@/modules/profile/service";
import { TOPIC_STATUS_LABELS } from "@/modules/progress/schemas";
import { progressServiceFor } from "@/modules/progress/service";
import { regenerateRoadmapAction } from "@/modules/roadmap/actions";
import { roadmapServiceFor } from "@/modules/roadmap/service";
import { reviewServiceFor } from "@/modules/review/service";
import { RoadmapItemRow } from "@/modules/roadmap/ui/roadmap-item-row";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const user = await requireUser("/today");
  const profile = await requireProfile(user.id);
  const { welcome } = await searchParams;
  const today = todayIn(profile.timezone);

  const content = getContentService();
  const roadmapService = roadmapServiceFor(user.id);
  const [roadmap, topics, depths, history, flagged, notice, reviewStats, reviewQueue] =
    await Promise.all([
      roadmapService.get(),
      content.topics({ trackId: profile.trackId, publishedOnly: true }),
      assessmentServiceFor(user.id).latestDepths(profile.trackId),
      assessmentServiceFor(user.id).history(),
      progressServiceFor(user.id).flaggedTopicIds(),
      noticePlannerFor(user.id).outcome(),
      reviewServiceFor(user.id).stats(),
      reviewServiceFor(user.id).queue(),
    ]);
  const topicMap = new Map(topics.map((topic) => [topic.id, topic]));

  const todayItems = roadmap?.items.filter((item) => item.scheduledDate === today) ?? [];
  const upcoming =
    roadmap?.items.filter(
      (item) => item.scheduledDate > today && item.scheduledDate <= addDays(today, 3),
    ) ?? [];
  const missed = roadmap ? roadmapService.missedItems(roadmap, today) : [];
  const todayDone = todayItems.filter((item) => item.status === "DONE").length;
  const todayHours = todayItems.reduce((sum, item) => sum + item.hours, 0);

  // Weak topics: flagged by the user, or below the required depth in the latest diagnostic.
  const weak = [
    ...flagged.map((entry) => ({
      topicId: entry.topicId,
      reason: TOPIC_STATUS_LABELS[entry.status],
      weight: 10,
    })),
    ...Object.entries(depths).flatMap(([topicId, depth]) => {
      const topic = topicMap.get(topicId);
      if (!topic) return [];
      const required = DEPTH_LEVEL[topic.depthByBand[profile.experienceBand].depth];
      return depth < required
        ? [
            {
              topicId,
              reason: `Diagnostic: ${required - depth} level(s) below target`,
              weight: required - depth,
            },
          ]
        : [];
    }),
  ]
    .filter(
      (entry, index, all) => all.findIndex((other) => other.topicId === entry.topicId) === index,
    )
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  const greeting = profile.displayName ? `Hi ${profile.displayName.split(" ")[0]}` : "Today";

  return (
    <>
      <PageHeader title={greeting} description={format(parseISO(today), "EEEE, d MMMM")} />
      <div className="grid gap-6">
        {welcome === "1" && (
          <Alert variant="success">
            <PartyPopper aria-hidden />
            <AlertTitle>Your roadmap is ready</AlertTitle>
            <AlertDescription>
              Start with today&apos;s tasks below. Add your interviews to the tracker and the plan
              will work back from those dates.
            </AlertDescription>
          </Alert>
        )}

        {missed.length > 0 && (
          <Alert variant="warning">
            <TriangleAlert aria-hidden />
            <AlertTitle>{missed.length} unfinished task(s) from earlier days</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>Re-plan to fit them into the days left. Completed work is kept.</span>
              <form action={regenerateRoadmapAction}>
                <SubmitButton size="sm" variant="outline" pendingText="Re-planning…">
                  Re-plan now
                </SubmitButton>
              </form>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <Card>
            <CardHeader>
              <CardTitle>What to study today</CardTitle>
              <CardDescription>
                {todayItems.length
                  ? `${todayDone} of ${todayItems.length} done · about ${todayHours.toFixed(1)}h`
                  : "Nothing scheduled today."}
              </CardDescription>
              <CardAction>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/roadmap">Full roadmap</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {!roadmap ? (
                <EmptyState
                  icon={Route}
                  title="No roadmap yet"
                  description="Build a plan from your experience, target role and available time."
                  action={
                    <form action={regenerateRoadmapAction}>
                      <SubmitButton pendingText="Building…">Build my roadmap</SubmitButton>
                    </form>
                  }
                />
              ) : todayItems.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title="Free day"
                  description="No tasks today. Review saved questions or get ahead on the next topic."
                  action={
                    <Button asChild variant="outline">
                      <Link href="/practice/saved">Open saved questions</Link>
                    </Button>
                  }
                />
              ) : (
                <>
                  <Progress
                    value={(todayDone / todayItems.length) * 100}
                    aria-label="Today's progress"
                    className="mb-2"
                  />
                  <div className="divide-y">
                    {todayItems.map((item) => (
                      <RoadmapItemRow key={item.id} item={item} topics={topicMap} />
                    ))}
                  </div>
                </>
              )}
              {upcoming.length > 0 && (
                <div className="mt-6 grid gap-1">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Next few days
                  </h3>
                  <ul className="grid gap-1 text-sm">
                    {upcoming.slice(0, 6).map((item) => (
                      <li key={item.id} className="flex justify-between gap-2">
                        <span className="truncate">
                          {item.topicId ? topicMap.get(item.topicId)?.name : "Weekly self-check"}
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          {format(parseISO(item.scheduledDate), "EEE")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid content-start gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Review</CardTitle>
                <CardDescription>
                  {reviewQueue.cards.length > 0
                    ? `${reviewQueue.cards.length} card${reviewQueue.cards.length === 1 ? "" : "s"} due`
                    : reviewEmptyText(reviewStats.total)}
                </CardDescription>
                <CardAction>
                  <Brain className="size-5 text-primary" aria-hidden />
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-3">
                {reviewQueue.reason && (
                  <p className="text-xs text-muted-foreground">{reviewQueue.reason}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  {reviewQueue.cards.length > 0 ? (
                    <Button asChild size="sm">
                      <Link href="/practice/review/session">Start review</Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/practice/review">Open review</Link>
                    </Button>
                  )}
                  {reviewStats.reviewedThisWeek > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {reviewStats.reviewedThisWeek} this week
                      {reviewStats.streakDays > 1 && ` · ${reviewStats.streakDays}-day streak`}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <NoticeWidget
              plan={notice?.plan ?? null}
              outcome={notice?.outcome ?? null}
              today={today}
            />

            <Card>
              <CardHeader>
                <CardTitle>Weak topics</CardTitle>
                <CardDescription>From your diagnostic and your own flags.</CardDescription>
              </CardHeader>
              <CardContent>
                {weak.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    None flagged yet. Mark a topic as difficult, or take the diagnostic.
                  </p>
                ) : (
                  <ul className="grid gap-2">
                    {weak.map((entry) => {
                      const topic = topicMap.get(entry.topicId);
                      if (!topic) return null;
                      return (
                        <li key={entry.topicId} className="grid gap-0.5">
                          <Link
                            href={`/practice/topics/${topic.slug}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {topic.name}
                          </Link>
                          <span className="text-xs text-muted-foreground">{entry.reason}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {history.length === 0 && (
              <Card>
                <CardHeader>
                  <ClipboardCheck className="size-5 text-primary" aria-hidden />
                  <CardTitle>Take the diagnostic</CardTitle>
                  <CardDescription>
                    10–15 minutes. Topics you already know are removed from your plan.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild size="sm">
                    <Link href="/practice/diagnostic?start=1">Start</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {roadmap && (
              <Card>
                <CardHeader>
                  <CardTitle>Plan window</CardTitle>
                  <CardDescription>{roadmap.deadlineLabel}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm">
                  <span>Ends {format(parseISO(roadmap.endDate), "d MMM")}</span>
                  <Badge variant="muted">
                    {Math.max(
                      0,
                      Math.round(
                        (parseISO(roadmap.endDate).getTime() - parseISO(today).getTime()) /
                          86_400_000,
                      ) + 1,
                    )}{" "}
                    days left
                  </Badge>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function reviewEmptyText(total: number): string {
  return total === 0 ? "Add questions to review from topic pages." : "All caught up for today.";
}
