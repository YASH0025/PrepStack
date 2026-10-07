import Link from "next/link";
import { BookOpen, CalendarCheck, Compass, NotebookPen } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/modules/auth/service";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Track every interview",
    text: "Applications, rounds, reminders, conflicts and follow-ups in one calendar.",
  },
  {
    icon: NotebookPen,
    title: "Prep for each round",
    text: "A roadmap that works back from your interview dates and a last-24-hours revision sheet.",
  },
  {
    icon: Compass,
    title: "Learn from real interviews",
    text: "Anonymized experiences from other developers, with topic frequency per company.",
  },
];

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const [{ deleted }, user] = await Promise.all([searchParams, getCurrentUser()]);
  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-20"
    >
      {deleted === "1" && (
        <Alert>
          <AlertDescription>Your account and all your private data were deleted.</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">PrepStack</h1>
        <p className="text-lg text-muted-foreground">
          Track every interview, prep specifically for it, and learn from real developer
          experiences, all in one place.
        </p>
        <div className="flex flex-wrap gap-2">
          {user ? (
            <Button asChild>
              <Link href="/today">Open PrepStack</Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link href="/signup">Get started</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="grid content-start gap-1.5 rounded-lg border p-4">
            <feature.icon className="size-5 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold">{feature.title}</h2>
            <p className="text-sm text-muted-foreground">{feature.text}</p>
          </li>
        ))}
      </ul>
      <nav aria-label="Explore" className="flex flex-wrap gap-4 text-sm">
        <Link href="/topics" className="inline-flex items-center gap-1 hover:underline">
          <BookOpen className="size-4" aria-hidden /> Interview topics
        </Link>
        <Link href="/reports" className="inline-flex items-center gap-1 hover:underline">
          <Compass className="size-4" aria-hidden /> Interview experiences
        </Link>
      </nav>
    </main>
  );
}
