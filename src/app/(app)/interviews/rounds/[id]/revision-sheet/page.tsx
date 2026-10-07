import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Video } from "lucide-react";

import { RichText } from "@/components/rich-text";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import { ROUND_TYPE_LABELS } from "@/lib/domain";
import { formatRoundTime, relativeUntil, timezoneLabel } from "@/lib/format";
import { requireUser } from "@/modules/auth/service";
import { revisionSheetFor } from "@/modules/revision-sheet/service";
import { CheckRow, PrintButton } from "@/modules/revision-sheet/ui/check-row";
import { MODE_LABELS } from "@/modules/tracker/schemas";

export const metadata: Metadata = { title: "Revision sheet" };

function SheetSection({
  number,
  title,
  note,
  children,
}: {
  number: number;
  title: string;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid break-inside-avoid content-start gap-3 rounded-xl border p-4 print:rounded-none print:border-0 print:border-t print:px-0">
      <div className="grid gap-0.5">
        <h2 className="text-sm font-semibold">
          <span className="text-muted-foreground">{number}.</span> {title}
        </h2>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/** Server-side clock check, kept out of render for the React Compiler rules. */
function isUpcoming(startUtc: string): boolean {
  return new Date(startUtc).getTime() > new Date().getTime();
}

const RATING_LABEL: Record<string, string> = {
  NAILED: "nailed",
  PARTIAL: "partial",
  MISSED: "missed",
};

export default async function RevisionSheetPage({
  params,
}: PageProps<"/interviews/rounds/[id]/revision-sheet">) {
  const { id } = await params;
  const user = await requireUser(`/interviews/rounds/${id}/revision-sheet`);
  const view = await revisionSheetFor(user.id).view(id);
  if (!view) notFound();
  const { sheet, round, application, timezone } = view;
  const percent = sheet.progress.total
    ? Math.round((sheet.progress.done / sheet.progress.total) * 100)
    : 0;
  const upcoming = isUpcoming(round.startUtc);
  let n = 0;

  return (
    <article className="mx-auto grid max-w-4xl gap-5 print:max-w-none print:text-[12px]">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={`/interviews/calendar?round=${round.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back to the round
        </Link>
        <PrintButton />
      </div>

      {/* 1. Header */}
      <header className="grid gap-3 rounded-xl border bg-muted/30 p-5 print:border-0 print:bg-transparent print:p-0">
        <div className="grid gap-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Last-24-hours revision sheet
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {application.companyName}: {round.title ?? `${ROUND_TYPE_LABELS[round.type]} round`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {application.jobTitle} · Round {round.roundNumber}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span>
            {formatRoundTime(round.startUtc, round.endUtc, timezone)}{" "}
            <span className="text-muted-foreground">
              ({timezoneLabel(timezone, new Date(round.startUtc))})
            </span>
          </span>
          {upcoming && <Badge variant="info">{relativeUntil(new Date(round.startUtc))}</Badge>}
          <span className="text-muted-foreground">{MODE_LABELS[round.mode]}</span>
          {round.mode !== "ONSITE" && round.meetingLink && (
            <a
              href={round.meetingLink}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 font-medium underline"
            >
              <Video className="size-4" aria-hidden /> Join link
            </a>
          )}
          {round.mode === "ONSITE" && round.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" aria-hidden /> {round.location}
            </span>
          )}
        </div>
        {sheet.progress.total > 0 && (
          <div className="grid max-w-sm gap-1 print:hidden">
            <span className="text-xs text-muted-foreground">
              {sheet.progress.done} of {sheet.progress.total} checked
            </span>
            <Progress value={percent} aria-label="Revision sheet progress" />
          </div>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2 print:block print:space-y-3">
        {!sheet.isPeopleRound || sheet.weakTopics.length > 0 ? (
          <SheetSection
            number={++n}
            title="Weak topics to revise"
            note="From your diagnostic, debriefs, roadmap and your own flags."
          >
            {sheet.weakTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No weak topics found for this round type. Take the diagnostic or flag topics to see
                them here.
              </p>
            ) : (
              <div className="grid gap-3">
                {sheet.weakTopics.map((topic) => (
                  <CheckRow
                    key={topic.key}
                    roundId={round.id}
                    itemKey={topic.key}
                    checked={topic.checked}
                  >
                    <Link
                      href={`/practice/topics/${topic.slug}`}
                      className="font-medium hover:underline"
                    >
                      {topic.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {topic.reasons.join(" · ")}
                    </span>
                    <ul className="mt-1 grid list-disc gap-0.5 pl-4 text-xs">
                      {topic.keyPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </CheckRow>
                ))}
              </div>
            )}
          </SheetSection>
        ) : null}

        {sheet.weakTopics.length > 0 && (
          <SheetSection
            number={++n}
            title="Questions to go over"
            note="Your saved questions and cards you struggle with, on those topics."
          >
            {sheet.questions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved or difficult questions on these topics yet. Save questions on topic pages
                to see them here.
              </p>
            ) : (
              <div className="grid gap-2">
                {sheet.questions.map((question) => (
                  <CheckRow
                    key={question.key}
                    roundId={round.id}
                    itemKey={question.key}
                    checked={question.checked}
                  >
                    <RichText source={question.text} className="text-sm" />
                    {question.source === "DIFFICULT" && (
                      <span className="text-xs text-muted-foreground">From your review cards</span>
                    )}
                  </CheckRow>
                ))}
              </div>
            )}
          </SheetSection>
        )}

        {sheet.community.status !== "NONE" && (
          <SheetSection
            number={++n}
            title={`Often reported at ${application.companyName}`}
            note="User-submitted community reports, not official questions."
          >
            {sheet.community.status === "NOT_ENOUGH_DATA" ? (
              <p className="text-sm text-muted-foreground">
                Not enough data yet ({sheet.community.sampleSize} report
                {sheet.community.sampleSize === 1 ? "" : "s"}).
              </p>
            ) : (
              <div className="grid gap-2">
                <p className="text-xs text-muted-foreground">
                  Based on {sheet.community.sampleSize} reports, {sheet.community.from} to{" "}
                  {sheet.community.to}.
                </p>
                {sheet.community.topics.map((topic) => (
                  <CheckRow
                    key={topic.key}
                    roundId={round.id}
                    itemKey={topic.key}
                    checked={topic.checked}
                  >
                    <Link href={`/practice/topics/${topic.slug}`} className="hover:underline">
                      {topic.name}
                    </Link>{" "}
                    <span className="text-xs text-muted-foreground">
                      in {topic.count} of{" "}
                      {sheet.community.status === "SHOWN" ? sheet.community.sampleSize : 0} reports
                    </span>
                  </CheckRow>
                ))}
              </div>
            )}
          </SheetSection>
        )}

        {sheet.earlierQuestions.length > 0 && (
          <SheetSection
            number={++n}
            title={`Asked in your earlier rounds at ${application.companyName}`}
            note="From your own debriefs."
          >
            <div className="grid gap-2">
              {sheet.earlierQuestions.map((question) => (
                <CheckRow
                  key={question.key}
                  roundId={round.id}
                  itemKey={question.key}
                  checked={question.checked}
                >
                  {question.text}
                  <span className="block text-xs text-muted-foreground">
                    {question.roundLabel} · {question.date} ·{" "}
                    {RATING_LABEL[question.rating] ?? question.rating}
                  </span>
                </CheckRow>
              ))}
            </div>
          </SheetSection>
        )}

        {sheet.isPeopleRound && (
          <SheetSection
            number={++n}
            title="Stories to rehearse"
            note="Ready stories covering the most competencies."
          >
            {sheet.stories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No ready stories yet.{" "}
                <Link href="/practice/stories/new" className="underline print:no-underline">
                  Write one
                </Link>{" "}
                for ownership, conflict or failure.
              </p>
            ) : (
              <div className="grid gap-2">
                {sheet.stories.map((story) => (
                  <CheckRow
                    key={story.key}
                    roundId={round.id}
                    itemKey={story.key}
                    checked={story.checked}
                  >
                    <Link
                      href={`/practice/stories/${story.id}`}
                      className="font-medium hover:underline"
                    >
                      {story.title}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {story.competencies.join(", ")}
                    </span>
                  </CheckRow>
                ))}
              </div>
            )}
          </SheetSection>
        )}

        {sheet.hrQuestions.length > 0 && (
          <SheetSection
            number={++n}
            title="Common HR questions (India)"
            note="Informational guidance, not legal or financial advice."
          >
            <div className="grid gap-2">
              {sheet.hrQuestions.map((question) => (
                <CheckRow
                  key={question.key}
                  roundId={round.id}
                  itemKey={question.key}
                  checked={question.checked}
                >
                  <details className="print:hidden">
                    <summary className="cursor-pointer">{question.text}</summary>
                    <RichText
                      source={question.guidance}
                      className="mt-1 text-xs text-muted-foreground"
                    />
                  </details>
                  <span className="hidden print:block">
                    {question.text}
                    <RichText source={question.guidance} className="mt-1 text-xs" />
                  </span>
                </CheckRow>
              ))}
            </div>
          </SheetSection>
        )}

        <SheetSection number={++n} title="Questions to ask the interviewer">
          {sheet.interviewerQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add your own from the round&apos;s calendar panel.
            </p>
          ) : (
            <div className="grid gap-2">
              {sheet.interviewerQuestions.map((question) => (
                <CheckRow
                  key={question.key}
                  roundId={round.id}
                  itemKey={question.key}
                  checked={question.checked}
                >
                  {question.text}
                  {question.own && <span className="text-xs text-muted-foreground"> (yours)</span>}
                </CheckRow>
              ))}
            </div>
          )}
        </SheetSection>

        <SheetSection number={++n} title="Logistics checklist">
          <div className="grid gap-2">
            {sheet.logistics.map((entry) => (
              <CheckRow
                key={entry.key}
                roundId={round.id}
                itemKey={entry.key}
                checked={entry.checked}
              >
                {entry.label}
              </CheckRow>
            ))}
          </div>
        </SheetSection>
      </div>
    </article>
  );
}
