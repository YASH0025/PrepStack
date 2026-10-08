import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Play, Search } from "lucide-react";

import { EmptyState, PageHeader, Section } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/misc";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { requireUser } from "@/modules/auth/service";
import { problemSummaries } from "@/modules/coding/catalogue";
import {
  type ProblemFilter,
  type ProblemStatus,
  difficultyStats,
  filterProblems,
  practiceSet,
  statusOf,
  topicStats,
} from "@/modules/coding/domain/stats";
import {
  CODING_SKILLS,
  CODING_TOPIC_LABELS,
  CodingTopicSchema,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  DifficultySchema,
  type CodingSkill,
} from "@/modules/coding/schemas";
import { codingFor } from "@/modules/coding/service";
import { DifficultyBadge, STATUS_LABELS, StatusIcon } from "@/modules/coding/ui/bits";
import { getContentService } from "@/modules/content/service";

export const metadata: Metadata = { title: "Coding practice" };

const STATUSES: ProblemStatus[] = ["TODO", "ATTEMPTED", "SOLVED"];

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CodingPage({ searchParams }: PageProps<"/practice/coding">) {
  const user = await requireUser("/practice/coding");
  const params = await searchParams;
  const skillParam = one(params.skill);
  const skill = CODING_SKILLS.find((item) => item === skillParam) as CodingSkill | undefined;
  const filter: ProblemFilter = {
    topic: CodingTopicSchema.safeParse(one(params.topic)).data,
    difficulty: DifficultySchema.safeParse(one(params.difficulty)).data,
    status: STATUSES.find((status) => status === one(params.status)),
    skill,
    q: one(params.q)?.slice(0, 100),
  };

  const problems = problemSummaries();
  const [progress, skillTopic] = await Promise.all([
    codingFor(user.id).progress(),
    skill ? getContentService().topicBySlug(skill) : Promise.resolve(null),
  ]);
  const solved = problems.filter((p) => statusOf(progress.get(p.slug)) === "SOLVED").length;
  const byDifficulty = difficultyStats(problems, progress);
  const topics = topicStats(problems, progress);
  const weak = topics.filter((stat) => stat.weak);
  const todaysSet = practiceSet(problems, progress, { skill, topic: filter.topic });
  const shown = filterProblems(problems, progress, filter);
  const filtered = Boolean(filter.topic || filter.difficulty || filter.status || filter.q || skill);

  return (
    <div className="grid gap-8">
      <PageHeader
        title="Coding practice"
        description="Solve problems in JavaScript or Python, right in your browser. Your code runs on your device."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="grid gap-2 rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Solved</p>
          <p className="text-2xl font-semibold">
            {solved}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              / {problems.length}
            </span>
          </p>
          <Progress
            value={(solved / Math.max(1, problems.length)) * 100}
            aria-label="Problems solved"
          />
        </div>
        {DIFFICULTIES.map((difficulty) => (
          <div key={difficulty} className="grid content-start gap-2 rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{DIFFICULTY_LABELS[difficulty]}</p>
            <p className="text-2xl font-semibold">
              {byDifficulty[difficulty].solved}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {byDifficulty[difficulty].total}
              </span>
            </p>
          </div>
        ))}
      </div>

      <Section
        title={skillTopic ? `Today's set: ${skillTopic.name}` : "Today's practice set"}
        description={
          todaysSet.length > 0
            ? "Problems you started but haven't solved come first, then new ones: up to 3 easy, 2 medium and 1 hard."
            : undefined
        }
      >
        {todaysSet.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Everything here is solved. Pick any problem below to practise again.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {todaysSet.map((problem) => (
              <li key={problem.slug}>
                <Link
                  href={`/practice/coding/${problem.slug}`}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <StatusIcon status={statusOf(progress.get(problem.slug))} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {problem.title}
                  </span>
                  <DifficultyBadge difficulty={problem.difficulty} />
                  <Play className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Topics"
        description={
          weak.length > 0
            ? `Needs work: ${weak.map((stat) => CODING_TOPIC_LABELS[stat.topic]).join(", ")}.`
            : "Pick a topic to filter the list."
        }
      >
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {topics.map((stat) => {
            const active = filter.topic === stat.topic;
            return (
              <li key={stat.topic}>
                <Link
                  href={active ? "/practice/coding" : `/practice/coding?topic=${stat.topic}`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "grid gap-2 rounded-lg border p-3 transition-colors hover:bg-accent",
                    active && "border-primary bg-accent",
                  )}
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-medium">
                    {CODING_TOPIC_LABELS[stat.topic]}
                    {stat.weak && <Badge variant="warning">Needs work</Badge>}
                  </span>
                  <Progress
                    value={(stat.solved / stat.total) * 100}
                    aria-label={`${CODING_TOPIC_LABELS[stat.topic]}: ${stat.solved} of ${stat.total} solved`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {stat.solved} / {stat.total} solved
                    {stat.stuck > 0 ? ` · ${stat.stuck} in progress` : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="All problems">
        <form
          method="get"
          action="/practice/coding"
          role="search"
          className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end"
        >
          {skill && <input type="hidden" name="skill" value={skill} />}
          <div className="grid gap-1.5">
            <Label htmlFor="coding-q">Search</Label>
            <Input
              id="coding-q"
              name="q"
              type="search"
              defaultValue={filter.q ?? ""}
              placeholder="Problem name"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="coding-topic">Topic</Label>
            <NativeSelect id="coding-topic" name="topic" defaultValue={filter.topic ?? ""}>
              <option value="">All topics</option>
              {topics.map((stat) => (
                <option key={stat.topic} value={stat.topic}>
                  {CODING_TOPIC_LABELS[stat.topic]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="coding-difficulty">Difficulty</Label>
            <NativeSelect
              id="coding-difficulty"
              name="difficulty"
              defaultValue={filter.difficulty ?? ""}
            >
              <option value="">Any</option>
              {DIFFICULTIES.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {DIFFICULTY_LABELS[difficulty]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="coding-status">Status</Label>
            <NativeSelect id="coding-status" name="status" defaultValue={filter.status ?? ""}>
              <option value="">Any</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex gap-2">
            <Button type="submit">
              <Search /> Filter
            </Button>
            {filtered && (
              <Button asChild variant="ghost">
                <Link href="/practice/coding">Clear</Link>
              </Button>
            )}
          </div>
        </form>

        {skillTopic && (
          <p className="text-sm text-muted-foreground">
            Showing problems for your roadmap topic <strong>{skillTopic.name}</strong>.
          </p>
        )}

        {shown.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No problems match"
            description="Try another topic, difficulty or status."
            action={
              <Button asChild variant="outline">
                <Link href="/practice/coding">Show all problems</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {shown.map((problem) => (
              <li
                key={problem.slug}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3"
              >
                <StatusIcon status={statusOf(progress.get(problem.slug))} />
                <Link
                  href={`/practice/coding/${problem.slug}`}
                  className="min-w-0 flex-1 text-sm font-medium hover:underline"
                >
                  {problem.title}
                </Link>
                <span className="hidden gap-1 md:flex">
                  {problem.topics.map((topic) => (
                    <Badge key={topic} variant="muted">
                      {CODING_TOPIC_LABELS[topic]}
                    </Badge>
                  ))}
                </span>
                <DifficultyBadge difficulty={problem.difficulty} />
                {problem.leetcodeUrl && (
                  <a
                    href={problem.leetcodeUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-muted-foreground hover:text-foreground"
                    title="Also on LeetCode"
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    <span className="sr-only">{problem.title} on LeetCode</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
