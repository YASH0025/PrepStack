import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays } from "lucide-react";

import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/modules/auth/service";
import { requireProfile } from "@/modules/profile/service";
import { trackerFor } from "@/modules/tracker/service";
import { TrackerView } from "@/modules/tracker/ui/tracker-view";

export const metadata: Metadata = { title: "Interview tracker" };

export default async function TrackerPage() {
  const user = await requireUser("/interviews/tracker");
  const profile = await requireProfile(user.id);
  const tracker = trackerFor(user.id);
  const [applications, rounds, customFields] = await Promise.all([
    tracker.listApplications(),
    tracker.listRounds(),
    tracker.listCustomFields(),
  ]);

  return (
    <>
      <PageHeader
        title="Interview tracker"
        description="Private to you. Every application and round in one place."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/interviews/calendar">
              <CalendarDays /> Calendar
            </Link>
          </Button>
        }
      />
      <Suspense>
        <TrackerView
          applications={applications}
          rounds={rounds}
          customFields={customFields}
          timezone={profile.timezone}
          reminderMinutes={profile.reminderMinutes}
        />
      </Suspense>
    </>
  );
}
