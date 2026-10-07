import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheckBig, CircleDashed, CircleOff, Plus, Sparkles } from "lucide-react";

import { EmptyState, PageHeader, Section } from "@/components/page";
import { RichText } from "@/components/rich-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import {
  type CoverageLevel,
  competencyCoverage,
  coverageSummary,
  matchStories,
} from "@/modules/story-bank/domain/coverage";
import { storyBankFor } from "@/modules/story-bank/service";
import { StoryLink } from "@/modules/story-bank/ui/story-bits";
import { debriefsFor } from "@/modules/tracker/debrief-service";
import { questionsNeedingStories } from "@/modules/tracker/domain/debriefs";

export const metadata: Metadata = { title: "Story bank" };

const TABS = [
  { id: "stories", label: "My stories" },
  { id: "coverage", label: "Coverage" },
  { id: "questions", label: "Question library" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const LEVEL: Record<CoverageLevel, { icon: typeof CircleOff; label: string; className: string }> = {
  COVERED: {
    icon: CircleCheckBig,
    label: "Covered",
    className: "text-emerald-600 dark:text-emerald-400",
  },
  DRAFT_ONLY: {
    icon: CircleDashed,
    label: "Draft only",
    className: "text-amber-600 dark:text-amber-400",
  },
  MISSING: { icon: CircleOff, label: "Missing", className: "text-muted-foreground" },
};

export default async function StoryBankPage({ searchParams }: PageProps<"/practice/stories">) {
  const user = await requireUser("/practice/stories");
  const params = await searchParams;
  const tab: Tab = TABS.some((entry) => entry.id === params.tab) ? (params.tab as Tab) : "stories";
  const content = getContentService();
  const [stories, competencies, behavioral, hr, debriefQuestions] = await Promise.all([
    storyBankFor(user.id).list(),
    content.competencies(),
    content.behavioralQuestions("BEHAVIORAL"),
    content.behavioralQuestions("HR_INDIA"),
    debriefsFor(user.id).listQuestions(),
  ]);
  const needStories = questionsNeedingStories(debriefQuestions);
  const names = new Map(competencies.map((competency) => [competency.slug, competency.name]));
  const coverage = competencyCoverage(competencies, stories);
  const summary = coverageSummary(coverage);

  return (
    <>
      <PageHeader
        title="Story bank"
        description="Behavioral stories in STAR form, tagged by competency, ready for any HR or managerial round."
        actions={
          <Button asChild>
            <Link href="/practice/stories/new">
              <Plus /> New story
            </Link>
          </Button>
        }
      />

      <nav aria-label="Story bank sections" className="mb-6 inline-flex rounded-lg bg-muted p-1">
        {TABS.map((entry) => (
          <Link
            key={entry.id}
            href={`/practice/stories?tab=${entry.id}`}
            aria-current={tab === entry.id ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium text-muted-foreground",
              tab === entry.id && "bg-background text-foreground shadow-sm",
            )}
          >
            {entry.label}
          </Link>
        ))}
      </nav>

      {tab === "stories" && needStories.length > 0 && (
        <section className="mb-6 grid gap-2 rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="text-sm font-semibold">
            From your debriefs: {needStories.length} question{needStories.length === 1 ? "" : "s"}{" "}
            you wanted a better story for
          </h2>
          <ul className="grid list-disc gap-1 pl-5 text-sm">
            {needStories.slice(0, 5).map((question) => (
              <li key={question.id}>
                {question.text}{" "}
                <Link
                  href={`/interviews/rounds/${question.roundId}/debrief`}
                  className="text-xs text-muted-foreground underline"
                >
                  debrief
                </Link>
              </li>
            ))}
          </ul>
          <Button asChild size="sm" variant="outline" className="w-fit">
            <Link href="/practice/stories/new">
              <Plus /> Write a story
            </Link>
          </Button>
        </section>
      )}

      {tab === "stories" &&
        (stories.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No stories yet"
            description="Write 5–8 stories that cover ownership, conflict, failure and leadership, and you can answer most behavioral questions."
            action={
              <Button asChild>
                <Link href="/practice/stories/new">Write your first story</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y rounded-xl border">
            {stories.map((story) => (
              <li key={story.id} className="p-4">
                <StoryLink story={story} competencyNames={names} />
              </li>
            ))}
          </ul>
        ))}

      {tab === "coverage" && (
        <div className="grid gap-6">
          <div className="grid max-w-md gap-2">
            <p className="text-sm">
              <span className="font-semibold">{summary.covered}</span> of {summary.total}{" "}
              competencies have a ready story.
            </p>
            <Progress value={summary.percent} aria-label="Competency coverage" />
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {coverage.map((entry) => {
              const level = LEVEL[entry.level];
              const Icon = level.icon;
              return (
                <li
                  key={entry.slug}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="grid gap-0.5">
                    <span className="font-medium">{entry.name}</span>
                    <span className={cn("flex items-center gap-1 text-xs", level.className)}>
                      <Icon className="size-3.5" aria-hidden /> {level.label}
                      {entry.ready > 0 && ` · ${entry.ready} ready`}
                      {entry.drafts > 0 &&
                        ` · ${entry.drafts} draft${entry.drafts === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  {entry.level !== "COVERED" && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/practice/stories/new?competency=${entry.slug}`}>Add</Link>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tab === "questions" && (
        <div className="grid gap-10">
          <Section
            title="Behavioral questions"
            description="Matching stories are picked by competency."
          >
            <ul className="grid gap-3">
              {behavioral.map((question) => {
                const matches = matchStories(question.competencies, stories, 2);
                return (
                  <li key={question.id} className="rounded-lg border p-4">
                    <details>
                      <summary className="cursor-pointer">
                        <span className="font-medium">{question.text}</span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {question.competencies.map((slug) => (
                            <Badge key={slug} variant="outline">
                              {names.get(slug) ?? slug}
                            </Badge>
                          ))}
                          {matches.length === 0 && <Badge variant="warning">No story yet</Badge>}
                        </span>
                      </summary>
                      <div className="mt-4 grid gap-4">
                        <RichText source={question.guidance} className="text-muted-foreground" />
                        {matches.length > 0 ? (
                          <div className="grid gap-3 rounded-lg bg-muted/40 p-3">
                            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                              Your matching stories
                            </p>
                            {matches.map((story) => (
                              <StoryLink key={story.id} story={story} competencyNames={names} />
                            ))}
                          </div>
                        ) : (
                          <Button asChild variant="outline" size="sm" className="w-fit">
                            <Link
                              href={`/practice/stories/new?competency=${question.competencies[0] ?? ""}`}
                            >
                              <Plus /> Write a story for this
                            </Link>
                          </Button>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </Section>
          <Section
            title="HR questions (India)"
            description="Common questions about switching, compensation and notice. Informational guidance, not legal or financial advice."
          >
            <ul className="grid gap-3">
              {hr.map((question) => (
                <li key={question.id} className="rounded-lg border p-4">
                  <details>
                    <summary className="cursor-pointer font-medium">{question.text}</summary>
                    <RichText source={question.guidance} className="mt-3 text-muted-foreground" />
                  </details>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </>
  );
}
