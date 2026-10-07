import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";

import { PageHeader, Section } from "@/components/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { matchStories } from "@/modules/story-bank/domain/coverage";
import { storyBankFor } from "@/modules/story-bank/service";
import { StoryStatusBadge } from "@/modules/story-bank/ui/story-bits";
import { StoryForm } from "@/modules/story-bank/ui/story-form";
import { trackerFor } from "@/modules/tracker/service";

export const metadata: Metadata = { title: "Story" };

export default async function StoryPage({
  params,
  searchParams,
}: PageProps<"/practice/stories/[id]">) {
  const user = await requireUser("/practice/stories");
  const { id } = await params;
  const { saved } = await searchParams;
  const story = await storyBankFor(user.id).get(id);
  if (!story) notFound();

  const content = getContentService();
  const [competencies, behavioral] = await Promise.all([
    content.competencies(),
    content.behavioralQuestions("BEHAVIORAL"),
  ]);
  // Questions this story can answer: those whose best matches include it.
  const fits = behavioral.filter(
    (question) => matchStories(question.competencies, [story], 1).length > 0,
  );

  const tracker = trackerFor(user.id);
  const [rounds, applications] = await Promise.all([
    tracker.listRounds(),
    tracker.listApplications(),
  ]);
  const company = new Map(applications.map((app) => [app.id, app.companyName]));
  const usage = story.usage
    .map((entry) => ({ entry, round: rounds.find((round) => round.id === entry.roundId) }))
    .filter((item) => item.round);

  return (
    <>
      <PageHeader
        title={story.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StoryStatusBadge status={story.status} />
            Last edited {format(new Date(story.updatedAt), "d MMM yyyy")}
          </span>
        }
      />
      <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
        <div className="grid gap-4">
          {saved === "1" && (
            <Alert variant="success">
              <AlertDescription>Story created.</AlertDescription>
            </Alert>
          )}
          <StoryForm
            storyId={story.id}
            competencies={competencies}
            defaults={{
              title: story.title,
              situation: story.situation,
              task: story.task,
              action: story.action,
              result: story.result,
              impact: story.impact,
              competencies: story.competencies,
              projectRef: story.projectRef,
              status: story.status,
            }}
          />
        </div>
        <div className="grid content-start gap-8">
          <Section title="Questions it can answer">
            {fits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tag competencies to see matching questions.
              </p>
            ) : (
              <ul className="grid list-disc gap-1.5 pl-4 text-sm">
                {fits.slice(0, 6).map((question) => (
                  <li key={question.id}>{question.text}</li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="Used in interviews">
            {usage.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Link it from a debrief after you use it, so you can avoid repeating it with the same
                company.
              </p>
            ) : (
              <ul className="grid gap-1.5 text-sm">
                {usage.map(({ entry, round }) => (
                  <li
                    key={`${entry.roundId}-${entry.debriefQuestionId}`}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <Link
                      href={`/interviews/calendar?round=${entry.roundId}`}
                      className="hover:underline"
                    >
                      {company.get(round?.applicationId ?? "") ?? "Interview"}
                    </Link>
                    <Badge variant="muted">{format(new Date(entry.usedAt), "d MMM")}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
