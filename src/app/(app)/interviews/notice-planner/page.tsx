import type { Metadata } from "next";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { AlertTriangle, CalendarDays, Info } from "lucide-react";

import { PageHeader, Section } from "@/components/page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { daysBetween, todayIn } from "@/lib/local-date";
import { requireUser } from "@/modules/auth/service";
import { type ResignationAdvice } from "@/modules/notice-planner/domain/planner";
import { RESIGNATION_STATE_LABELS, TRI_STATE_LABELS } from "@/modules/notice-planner/schemas";
import { noticePlannerFor } from "@/modules/notice-planner/service";
import { type NoticeFormValues, NoticeForm } from "@/modules/notice-planner/ui/notice-form";
import { NoticeTimeline } from "@/modules/notice-planner/ui/notice-timeline";
import { requireProfile } from "@/modules/profile/service";

export const metadata: Metadata = { title: "Notice-period planner" };

const ADVICE: Record<ResignationAdvice, string> = {
  OFFER_IN_HAND:
    "You have an offer in your tracker. Many people resign once an offer letter is in hand and joining terms are agreed.",
  CLEARED_TECHNICAL:
    "You have cleared a technical round. Offers usually follow within a few weeks; keep your notice length in mind when timing your resignation.",
  KEEP_INTERVIEWING:
    "No offer or cleared technical round yet. Keep preparing and interviewing; your prep phase below is planned within your prep window.",
};

const pretty = (date: string) => format(parseISO(date), "EEE d MMM yyyy");

export default async function NoticePlannerPage() {
  const user = await requireUser("/interviews/notice-planner");
  const profile = await requireProfile(user.id);
  const service = noticePlannerFor(user.id);
  const result = await service.outcome();
  const today = todayIn(profile.timezone);
  const plan = result?.plan;
  const outcome = result?.outcome;

  const defaults: NoticeFormValues = {
    resignationState: plan?.resignationState ?? "NOT_RESIGNED",
    noticeDays: plan?.noticeDays ?? null,
    resignationDate: plan?.resignationDate ?? "",
    buyout: plan?.buyout ?? "UNSURE",
    earlyRelease: plan?.earlyRelease ?? "UNSURE",
    targetJoiningFrom: plan?.targetJoiningFrom ?? "",
    targetJoiningTo: plan?.targetJoiningTo ?? "",
  };

  return (
    <>
      <PageHeader
        title="Notice-period planner"
        description="Plan prep, interviews and offers around your notice period. Private to you."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/interviews/calendar">
              <CalendarDays /> Calendar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-8">
        {plan && outcome && (
          <>
            {outcome.warnings.length > 0 && (
              <Alert variant="warning">
                <AlertTriangle aria-hidden />
                <AlertTitle>Things to watch</AlertTitle>
                <AlertDescription>
                  <ul className="grid list-disc gap-1 pl-4">
                    {outcome.warnings.map((warning) => (
                      <li key={`${warning.code}-${warning.message}`}>{warning.message}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="gap-2">
                <CardHeader>
                  <CardDescription>Status</CardDescription>
                  <CardTitle>{RESIGNATION_STATE_LABELS[plan.resignationState]}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {plan.resignationState !== "RELIEVED" &&
                    `Buyout: ${TRI_STATE_LABELS[plan.buyout]} · Early release: ${TRI_STATE_LABELS[plan.earlyRelease]}`}
                </CardContent>
              </Card>
              <Card className="gap-2">
                <CardHeader>
                  <CardDescription>
                    {outcome.lwd
                      ? "Last working day"
                      : outcome.lwdIfResignToday
                        ? "If you resign today"
                        : "Timeline"}
                  </CardDescription>
                  <CardTitle>
                    {outcome.lwd
                      ? pretty(outcome.lwd)
                      : outcome.lwdIfResignToday
                        ? pretty(outcome.lwdIfResignToday)
                        : plan.targetJoiningFrom
                          ? `Join from ${pretty(plan.targetJoiningFrom)}`
                          : `${profile.prepWindowDays}-day prep window`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {outcome.lwd &&
                    outcome.lwd >= today &&
                    `${daysBetween(today, outcome.lwd)} days from today`}
                  {!outcome.lwd && outcome.lwdIfResignToday && "would be your last working day"}
                </CardContent>
              </Card>
              <Card className="gap-2">
                <CardHeader>
                  <CardDescription>
                    {outcome.progress ? "Notice served" : "Roadmap"}
                  </CardDescription>
                  <CardTitle className="tabular-nums">
                    {outcome.progress
                      ? `${outcome.progress.elapsedDays} / ${outcome.progress.totalDays} days`
                      : outcome.prepPhaseEnd
                        ? `Prep until ${format(parseISO(outcome.prepPhaseEnd), "d MMM")}`
                        : "Not constrained"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {outcome.progress ? (
                    <Progress value={outcome.progress.percent} aria-label="Notice period served" />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {outcome.prepPhaseEnd
                        ? "Your roadmap finishes by the end of the prep phase."
                        : "Your roadmap follows your prep window and interviews."}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {outcome.resignationAdvice && (
              <Alert>
                <Info aria-hidden />
                <AlertTitle>When to resign</AlertTitle>
                <AlertDescription>{ADVICE[outcome.resignationAdvice]}</AlertDescription>
              </Alert>
            )}

            {outcome.phases.length > 0 && (
              <Section
                title="Suggested phases"
                description="A guide, not a rule. Phase boundaries also appear on your calendar."
              >
                <NoticeTimeline phases={outcome.phases} today={today} />
              </Section>
            )}
          </>
        )}

        <Section
          title={plan ? "Your details" : "Set up your notice plan"}
          description="Only the essentials. Every field can be changed later."
        >
          <div className="max-w-2xl">
            <NoticeForm defaults={defaults} hasPlan={Boolean(plan)} />
          </div>
        </Section>

        <p className="text-xs text-muted-foreground">
          Informational only, not legal or HR advice. The last working day is calculated as your
          resignation date plus your notice days; confirm the exact date with your HR team.
        </p>
      </div>
    </>
  );
}
