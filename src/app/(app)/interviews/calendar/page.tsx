import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ClipboardList } from "lucide-react";

import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { getStorageService } from "@/lib/services/file-storage";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { requireProfile } from "@/modules/profile/service";
import { roadmapServiceFor } from "@/modules/roadmap/service";
import { followUpMarkers, revisionMarkers } from "@/modules/tracker/domain/calendar";
import { trackerFor } from "@/modules/tracker/service";
import { CalendarView } from "@/modules/tracker/ui/calendar-view";

export const metadata: Metadata = { title: "Interview calendar" };

export default async function CalendarPage() {
  const user = await requireUser("/interviews/calendar");
  const profile = await requireProfile(user.id);
  const tracker = trackerFor(user.id);
  const [applications, rounds, roadmap, topics] = await Promise.all([
    tracker.listApplications(),
    tracker.listRounds(),
    roadmapServiceFor(user.id).get(),
    getContentService().topics({ trackId: profile.trackId, publishedOnly: true }),
  ]);
  const topicNames = new Map(topics.map((topic) => [topic.id, topic.name]));
  const markers = [
    ...followUpMarkers(rounds, applications),
    ...revisionMarkers(roadmap?.items ?? [], (id) => topicNames.get(id)),
  ];

  return (
    <>
      <PageHeader
        title="Interview calendar"
        description="Every round, follow-up and revision session. Private to you."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/interviews/tracker">
              <ClipboardList /> Tracker
            </Link>
          </Button>
        }
      />
      <Suspense>
        <CalendarView
          applications={applications}
          rounds={rounds}
          markers={markers}
          timezone={profile.timezone}
          reminderMinutes={profile.reminderMinutes}
          uploadsEnabled={getStorageService().enabled}
        />
      </Suspense>
    </>
  );
}
