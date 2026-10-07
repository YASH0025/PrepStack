import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft } from "lucide-react";

import { PageHeader, Section } from "@/components/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SELF_RATING_LABELS, levelForBand } from "@/lib/domain";
import { relativeUntil } from "@/lib/format";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { canGiveFeedback, canReportNoShow, isLateCancel } from "@/modules/mock/domain/rules";
import { FEEDBACK_AREAS, FEEDBACK_AREA_LABELS } from "@/modules/mock/schemas";
import { mockFor } from "@/modules/mock/service";
import {
  FeedbackForm,
  InterviewTimer,
  MeetingLinkForm,
  QuestionTools,
  SessionActions,
} from "@/modules/mock/ui/session-room";

export const metadata: Metadata = { title: "Mock interview" };

const STATUS = {
  SCHEDULED: { label: "Scheduled", variant: "info" },
  COMPLETED: { label: "Done", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "muted" },
  NO_SHOW: { label: "No-show", variant: "warning" },
} as const;

export default async function MockSessionPage({
  params,
}: PageProps<"/practice/mock/sessions/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/practice/mock/sessions/${id}`);
  const mock = mockFor(user.id);
  const [view, me, blocked] = await Promise.all([
    mock.session(id),
    mock.profile(),
    mock.blockedIds(),
  ]);
  if (!view || !me) notFound();
  const { session, partner } = view;
  const now = new Date();
  const tz = me.timezone;
  const start = Date.parse(session.startUtc);
  const scheduled = session.status === "SCHEDULED";

  const content = getContentService();
  const [questions, topics] = await Promise.all([content.questions(), content.topics()]);
  const byId = new Map(questions.map((question) => [question.id, question]));
  const topicName = new Map(topics.map((topic) => [topic.id, topic.name]));
  const partnerLevel = levelForBand(partner.band ?? me.band);
  const toAsk = view.questionsToAsk
    .map((questionId) => byId.get(questionId))
    .filter((question) => question !== undefined);
  const alternatives = questions
    .filter(
      (question) =>
        question.format === "OPEN" &&
        question.answers.length > 0 &&
        view.partnerTopics.includes(question.topicId) &&
        !view.questionsToAsk.includes(question.id),
    )
    .slice(0, 40)
    .map((question) => ({ id: question.id, prompt: question.prompt }));
  const showFeedbackForm =
    !view.myFeedbackGiven &&
    (session.status === "SCHEDULED" || session.status === "COMPLETED") &&
    canGiveFeedback(session.startUtc, now);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Link
        href="/practice/mock"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Mock interviews
      </Link>
      <PageHeader
        title={`Mock interview with ${partner.displayName}`}
        description={`${formatInTimeZone(new Date(session.startUtc), tz, "EEEE d MMMM, HH:mm")}${
          scheduled && start > now.getTime() ? ` · ${relativeUntil(new Date(start), now)}` : ""
        }`}
        actions={
          <Badge variant={STATUS[session.status].variant}>{STATUS[session.status].label}</Badge>
        }
        className="pb-0"
      />

      {session.status === "CANCELLED" && (
        <Alert>
          <AlertDescription>
            {session.cancelledBy === user.id ? "You cancelled" : `${partner.displayName} cancelled`}{" "}
            this session.
          </AlertDescription>
        </Alert>
      )}
      {session.status === "NO_SHOW" && (
        <Alert>
          <AlertDescription>
            {session.noShowUserId === user.id
              ? "You were marked as not joining this session."
              : `${partner.displayName} did not join.`}
          </AlertDescription>
        </Alert>
      )}

      {scheduled && (
        <Section title="Meeting">
          <MeetingLinkForm sessionId={session.id} link={session.meetingLink} />
        </Section>
      )}

      {scheduled && (
        <Section
          title="How it works"
          description="60 minutes. One of you interviews for 30 minutes, then you swap."
        >
          <InterviewTimer myName="You" partnerName={partner.displayName} />
        </Section>
      )}

      <Section
        title={`Questions to ask ${partner.displayName}`}
        description={`From the topics they chose: ${view.partnerTopics.map((topicId) => topicName.get(topicId) ?? "Topic").join(", ")}. Model answers are for you only.`}
      >
        {toAsk.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No library questions for these topics yet. Ask your own.
          </p>
        ) : (
          <ol className="grid gap-3">
            {toAsk.map((question, index) => {
              const answer =
                question.answers.find((entry) => entry.level === partnerLevel) ??
                question.answers[0];
              return (
                <li key={question.id} className="grid gap-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">
                    {index + 1}. {question.prompt}
                  </p>
                  <p className="text-xs text-muted-foreground">{topicName.get(question.topicId)}</p>
                  {answer && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground">
                        Model answer ({partnerLevel.toLowerCase()} level)
                      </summary>
                      <p className="mt-2 whitespace-pre-line">{answer.answer}</p>
                    </details>
                  )}
                  <QuestionTools
                    sessionId={session.id}
                    questionId={question.id}
                    alternatives={alternatives}
                    disabled={!scheduled}
                  />
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      <Section
        title="When it is your turn"
        description="Your partner gets questions from the topics you chose. You will not see them in advance."
      >
        <ul className="flex flex-wrap gap-1.5">
          {view.myTopics.map((topicId) => (
            <li key={topicId}>
              <Badge variant="secondary">{topicName.get(topicId) ?? "Topic"}</Badge>
            </li>
          ))}
        </ul>
      </Section>

      {showFeedbackForm && (
        <Section title={`Feedback for ${partner.displayName}`}>
          <FeedbackForm
            sessionId={session.id}
            partnerName={partner.displayName}
            questions={toAsk.map((question) => ({ id: question.id, prompt: question.prompt }))}
          />
        </Section>
      )}
      {view.myFeedbackGiven && (
        <p className="text-sm text-muted-foreground">You sent your feedback. Thank you!</p>
      )}

      {view.feedbackReceived && (
        <Section title={`Feedback from ${partner.displayName}`}>
          <div className="grid gap-3 text-sm">
            <ul className="grid gap-1 sm:grid-cols-2">
              {FEEDBACK_AREAS.map((area) => (
                <li key={area} className="flex justify-between rounded-md border px-3 py-1.5">
                  <span>{FEEDBACK_AREA_LABELS[area]}</span>
                  <span className="font-medium">{view.feedbackReceived?.ratings[area]}/5</span>
                </li>
              ))}
            </ul>
            {view.feedbackReceived.questions.length > 0 && (
              <ul className="grid gap-1">
                {view.feedbackReceived.questions.map((item) => (
                  <li key={item.questionId} className="flex gap-2">
                    <Badge
                      variant={
                        item.rating === "NAILED"
                          ? "success"
                          : item.rating === "PARTIAL"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {SELF_RATING_LABELS[item.rating]}
                    </Badge>
                    <span>{byId.get(item.questionId)?.prompt ?? "Question"}</span>
                  </li>
                ))}
              </ul>
            )}
            {view.feedbackReceived.strengths && (
              <p>
                <span className="font-medium">What went well: </span>
                {view.feedbackReceived.strengths}
              </p>
            )}
            {view.feedbackReceived.improvements && (
              <p>
                <span className="font-medium">What to work on: </span>
                {view.feedbackReceived.improvements}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Missed and partly answered questions were added to your review.
            </p>
          </div>
        </Section>
      )}

      <Section title="Session">
        <SessionActions
          sessionId={session.id}
          partnerName={partner.displayName}
          canCancel={scheduled && start > now.getTime()}
          lateCancel={isLateCancel(session.startUtc, now)}
          canReportNoShow={scheduled && canReportNoShow(session.startUtc, now)}
          isBlocked={blocked.has(partner.userId)}
        />
      </Section>
    </div>
  );
}
