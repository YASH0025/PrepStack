import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";

import { PageHeader, Section } from "@/components/page";
import { Button } from "@/components/ui/button";
import { assessmentServiceFor } from "@/modules/assessment/service";
import { DiagnosticRunner } from "@/modules/assessment/ui/diagnostic-runner";
import { requireUser } from "@/modules/auth/service";
import { requireProfile } from "@/modules/profile/service";

export const metadata: Metadata = { title: "Diagnostic" };

export default async function PracticeDiagnosticPage({
  searchParams,
}: PageProps<"/practice/diagnostic">) {
  const user = await requireUser("/practice/diagnostic");
  const profile = await requireProfile(user.id);
  const service = assessmentServiceFor(user.id);
  const [{ start }, history] = await Promise.all([searchParams, service.history()]);

  if (start === "1") {
    const questions = await service.questionsFor(profile);
    return (
      <div className="mx-auto grid max-w-2xl gap-6">
        <PageHeader
          title="Diagnostic"
          description="Your roadmap is re-planned from the results. Completed items are kept."
        />
        <DiagnosticRunner questions={questions} resultsPath="/practice/diagnostic/{id}" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Diagnostic"
        description="Retake it any time. The latest attempt drives your roadmap; earlier attempts are kept."
        actions={
          <Button asChild>
            <Link href="/practice/diagnostic?start=1">
              {history.length ? "Retake diagnostic" : "Start diagnostic"}
            </Link>
          </Button>
        }
      />
      <Section title="History">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attempts yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {history.map((attempt) => {
              const correct = attempt.answers.filter((answer) => answer.correct).length;
              return (
                <li
                  key={attempt.id}
                  className="flex items-center justify-between gap-2 p-3 text-sm"
                >
                  <Link href={`/practice/diagnostic/${attempt.id}`} className="hover:underline">
                    {format(new Date(attempt.completedAt), "d MMM yyyy, HH:mm")}
                  </Link>
                  <span className="text-muted-foreground">
                    {correct}/{attempt.answers.length} correct
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
