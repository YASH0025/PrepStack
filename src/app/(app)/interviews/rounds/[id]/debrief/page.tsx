import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ROUND_TYPE_LABELS } from "@/lib/domain";
import { formatRoundTime } from "@/lib/format";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { requireProfile } from "@/modules/profile/service";
import { storyBankFor } from "@/modules/story-bank/service";
import { debriefsFor } from "@/modules/tracker/debrief-service";
import { trackerFor } from "@/modules/tracker/service";
import { type DebriefFormValues, emptyQuestion } from "@/modules/tracker/debrief-defaults";
import { DebriefForm } from "@/modules/tracker/ui/debrief-form";

export const metadata: Metadata = { title: "Debrief" };

export default async function DebriefPage({
  params,
}: PageProps<"/interviews/rounds/[id]/debrief">) {
  const { id } = await params;
  const user = await requireUser(`/interviews/rounds/${id}/debrief`);
  const profile = await requireProfile(user.id);
  const tracker = trackerFor(user.id);
  const round = await tracker.getRound(id);
  if (!round) notFound();
  const [application, debrief, topics, stories] = await Promise.all([
    tracker.getApplication(round.applicationId),
    debriefsFor(user.id).get(round.id),
    getContentService().topics({ trackId: profile.trackId, publishedOnly: true }),
    storyBankFor(user.id).list(),
  ]);
  const cannotDebrief = round.status === "CANCELLED" || round.status === "RESCHEDULED";
  const people = round.type === "BEHAVIORAL" || round.type === "HR" || round.type === "MANAGERIAL";

  const defaults: DebriefFormValues = debrief
    ? {
        questions: debrief.questions.map((question) => ({
          id: question.id,
          text: question.text,
          topicId: question.topicId ?? "",
          topicLabel: question.topicLabel ?? "",
          type: question.type,
          selfRating: question.selfRating,
          answerNotes: question.answerNotes,
          linkedStoryId: question.linkedStoryId ?? "",
          needsStory: question.needsStory,
          // Already-saved questions were offered for review when first saved.
          addToReview: false,
        })),
        codingProblem: debrief.codingProblem,
        systemDesignPrompt: debrief.systemDesignPrompt,
        takeHome: debrief.takeHome,
        interviewerFeedback: debrief.interviewerFeedback ?? "",
        feeling: debrief.feeling ?? "",
        nextSteps: debrief.nextSteps ?? "",
        lessons: debrief.lessons ?? "",
        overallRating: String(debrief.overallRating),
        difficulty: String(debrief.difficulty),
        actualDurationMinutes: debrief.actualDurationMinutes,
        followUpActions: debrief.followUpActions.join("\n"),
      }
    : {
        questions: [{ ...emptyQuestion(), type: people ? "BEHAVIORAL" : "CONCEPT" }],
        codingProblem: "",
        systemDesignPrompt: "",
        takeHome: "",
        interviewerFeedback: "",
        feeling: "",
        nextSteps: "",
        lessons: "",
        overallRating: "",
        difficulty: "",
        actualDurationMinutes: null,
        followUpActions: "",
      };

  return (
    <div className="mx-auto grid max-w-3xl gap-2">
      <Link
        href={`/interviews/calendar?round=${round.id}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to the round
      </Link>
      <PageHeader
        title={`${debrief ? "Debrief" : "How did it go"}: ${application?.companyName ?? "Interview"}`}
        description={`${round.title ?? ROUND_TYPE_LABELS[round.type]} · ${formatRoundTime(round.startUtc, round.endUtc, profile.timezone)}`}
      />
      {cannotDebrief ? (
        <Alert>
          <AlertDescription>
            This round was {round.status === "CANCELLED" ? "cancelled" : "rescheduled"}, so there is
            nothing to debrief.
          </AlertDescription>
        </Alert>
      ) : (
        <DebriefForm
          roundId={round.id}
          defaults={defaults}
          isNew={!debrief}
          topics={topics
            .filter((topic) =>
              topic.roleImportance.some((entry) => entry.roleId === profile.targetRoleId),
            )
            .map((topic) => ({ id: topic.id, name: topic.name, category: topic.category }))}
          stories={stories.map((story) => ({ id: story.id, title: story.title }))}
        />
      )}
    </div>
  );
}
