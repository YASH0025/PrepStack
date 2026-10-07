import type { Metadata } from "next";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Brain, Info, Play } from "lucide-react";

import { EmptyState, PageHeader, Section } from "@/components/page";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { todayIn } from "@/lib/local-date";
import { requireUser } from "@/modules/auth/service";
import { requireProfile } from "@/modules/profile/service";
import { CARD_SOURCE_LABELS } from "@/modules/review/schemas";
import { reviewServiceFor } from "@/modules/review/service";
import { CardActions } from "@/modules/review/ui/card-actions";
import { ManualCardForm } from "@/modules/review/ui/manual-card-form";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage() {
  const user = await requireUser("/practice/review");
  const profile = await requireProfile(user.id);
  const service = reviewServiceFor(user.id);
  const [cards, stats, { cards: queue, reason }] = await Promise.all([
    service.list(),
    service.stats(),
    service.queue(),
  ]);
  const today = todayIn(profile.timezone);

  return (
    <>
      <PageHeader
        title="Review"
        description="Spaced repetition: each card comes back after 1, 3, 7, 14 and 30 days as you recall it."
        actions={
          queue.length > 0 && (
            <Button asChild>
              <Link href="/practice/review/session">
                <Play /> Start review ({queue.length})
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-8">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Due today", value: stats.dueToday },
            { label: "Reviewed this week", value: stats.reviewedThisWeek },
            { label: "Mastered", value: stats.mastered },
            { label: "Day streak", value: stats.streakDays },
          ].map((stat) => (
            <Card key={stat.label} className="gap-1 py-4">
              <CardHeader className="px-4">
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        {reason && (
          <Alert>
            <Info aria-hidden />
            <AlertDescription>{reason}</AlertDescription>
          </Alert>
        )}
        {stats.dueToday > queue.length && (
          <p className="text-xs text-muted-foreground">
            {stats.dueToday - queue.length} more due cards wait beyond your daily cap of{" "}
            {profile.reviewDailyCap}. Change the cap in your profile.
          </p>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <Section title={`Your cards (${cards.length})`}>
            {cards.length === 0 ? (
              <EmptyState
                icon={Brain}
                title="No cards yet"
                description="Add questions from topic pages, get self-check questions wrong, add stories, or write your own cards. Missed debrief questions land here too."
                action={
                  <Button asChild variant="outline">
                    <Link href="/practice/topics">Browse topics</Link>
                  </Button>
                }
              />
            ) : (
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Card</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Box</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="sr-only">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cards.map((card) => {
                      const due = card.dueDate <= today;
                      return (
                        <TableRow key={card.id}>
                          <TableCell
                            className="max-w-xs truncate whitespace-nowrap"
                            title={card.prompt}
                          >
                            {card.prompt.split("\n")[0]}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {CARD_SOURCE_LABELS[card.sourceType]}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {card.box}
                            {card.mastered && (
                              <Badge variant="success" className="ml-1.5">
                                Mastered
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={due ? "font-medium" : "text-muted-foreground"}>
                            {due ? "Today" : format(parseISO(card.dueDate), "d MMM")}
                          </TableCell>
                          <TableCell>
                            <CardActions cardId={card.id} due={due} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Section>
          <Section title="Write a card" description="For anything not in the topic library.">
            <ManualCardForm />
          </Section>
        </div>
      </div>
    </>
  );
}
