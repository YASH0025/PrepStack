import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Route } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/modules/auth/service";
import { requireProfile } from "@/modules/profile/service";
import { buildRoadmapAndContinueAction } from "@/modules/roadmap/actions";

export const metadata: Metadata = { title: "Almost there" };

export default async function OnboardingNextPage() {
  const user = await requireUser("/onboarding/next");
  await requireProfile(user.id);

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">One optional step</h1>
        <p className="text-sm text-muted-foreground">
          A short diagnostic tells the roadmap what you already know, so it skips topics you have
          covered. Your self-assessment is never used instead of it.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <ClipboardCheck className="size-5 text-primary" aria-hidden />
            <CardTitle>Take the diagnostic</CardTitle>
            <CardDescription>
              About 10–15 minutes. Multiple choice plus a few short answers you grade against a
              model answer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/onboarding/diagnostic">Start diagnostic</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Route className="size-5 text-muted-foreground" aria-hidden />
            <CardTitle>Skip for now</CardTitle>
            <CardDescription>
              Build the roadmap from your experience level and target role. You can take the
              diagnostic later and the plan will adjust.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={buildRoadmapAndContinueAction}>
              <Button type="submit" variant="outline" className="w-full">
                Build my roadmap
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
