import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { assessmentServiceFor } from "@/modules/assessment/service";
import { DiagnosticRunner } from "@/modules/assessment/ui/diagnostic-runner";
import { requireUser } from "@/modules/auth/service";
import { requireProfile } from "@/modules/profile/service";

export const metadata: Metadata = { title: "Diagnostic" };

export default async function OnboardingDiagnosticPage() {
  const user = await requireUser("/onboarding/diagnostic");
  const profile = await requireProfile(user.id);
  const questions = await assessmentServiceFor(user.id).questionsFor(profile);

  if (questions.length === 0) {
    return (
      <EmptyState
        title="No diagnostic questions for this role yet"
        description="You can still build your roadmap from your experience level."
        action={
          <Button asChild>
            <Link href="/onboarding/next">Back</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Diagnostic</h1>
        <p className="text-sm text-muted-foreground">
          Skip anything you do not know. Guessing only puts topics you need out of your plan.
        </p>
      </div>
      <DiagnosticRunner questions={questions} resultsPath="/onboarding/diagnostic/{id}" />
    </div>
  );
}
