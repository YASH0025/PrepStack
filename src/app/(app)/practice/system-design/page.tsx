import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { env } from "@/lib/env";
import { requireUser } from "@/modules/auth/service";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "@/modules/coding/schemas";
import { codingFor } from "@/modules/coding/service";
import { DESIGN_PROBLEMS, scaleLabUrl } from "@/modules/coding/system-design";
import { DifficultyBadge } from "@/modules/coding/ui/bits";
import { DesignDoneToggle } from "@/modules/coding/ui/design-done-toggle";

export const metadata: Metadata = { title: "System design practice" };

export default async function SystemDesignPage() {
  const user = await requireUser("/practice/system-design");
  const done = await codingFor(user.id).designDone();
  const doneCount = DESIGN_PROBLEMS.filter((problem) => done.has(problem.id)).length;

  return (
    <div className="grid gap-8">
      <PageHeader
        title="System design practice"
        description="Design classic systems in ScaleLab: estimate the scale, draw the architecture, and submit. ScaleLab sends peak traffic through your design, breaks parts of it, and reviews it like an interviewer."
        actions={
          <Button asChild variant="outline">
            <a href={scaleLabUrl(env.SCALELAB_URL)} target="_blank" rel="noreferrer noopener">
              Open ScaleLab <ExternalLink />
            </a>
          </Button>
        }
      />

      <div className="grid max-w-md gap-2 rounded-lg border p-4">
        <p className="text-sm">
          <span className="text-2xl font-semibold">{doneCount}</span>
          <span className="text-muted-foreground"> / {DESIGN_PROBLEMS.length} practised</span>
        </p>
        <Progress
          value={(doneCount / DESIGN_PROBLEMS.length) * 100}
          aria-label="System design problems practised"
        />
        <p className="text-xs text-muted-foreground">
          ScaleLab opens in a new tab and needs no account. Come back and mark a problem done to
          track it here.
        </p>
      </div>

      {DIFFICULTIES.map((difficulty) => {
        const problems = DESIGN_PROBLEMS.filter((problem) => problem.difficulty === difficulty);
        if (problems.length === 0) return null;
        return (
          <section key={difficulty} className="grid gap-3">
            <h2 className="text-sm font-semibold">{DIFFICULTY_LABELS[difficulty]}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {problems.map((problem) => (
                <li key={problem.id} className="grid content-between gap-3 rounded-lg border p-4">
                  <div className="grid gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium">{problem.title}</h3>
                      <DifficultyBadge difficulty={problem.difficulty} />
                    </div>
                    <p className="text-sm text-muted-foreground">{problem.tagline}</p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <Button asChild size="sm">
                      <a
                        href={scaleLabUrl(env.SCALELAB_URL, problem.id)}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Design in ScaleLab <ExternalLink />
                      </a>
                    </Button>
                    <DesignDoneToggle
                      problemId={problem.id}
                      title={problem.title}
                      initialDone={done.has(problem.id)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
