import type { Metadata } from "next";
import Link from "next/link";
import { PartyPopper } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/modules/auth/service";
import { requireProfile } from "@/modules/profile/service";
import { reviewServiceFor } from "@/modules/review/service";
import { ReviewSession } from "@/modules/review/ui/review-session";

export const metadata: Metadata = { title: "Review session" };

export default async function ReviewSessionPage() {
  const user = await requireUser("/practice/review/session");
  await requireProfile(user.id);
  const { cards, reason } = await reviewServiceFor(user.id).queue();

  return (
    <>
      <PageHeader
        title="Review session"
        description={reason ?? "Recall first, then reveal and rate honestly."}
      />
      {cards.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title="Nothing due right now"
          description="All caught up. Cards come back on their next due date."
          action={
            <Button asChild variant="outline">
              <Link href="/practice/review">Review overview</Link>
            </Button>
          }
        />
      ) : (
        <ReviewSession
          cards={cards.map((card) => ({
            id: card.id,
            prompt: card.prompt,
            answer: card.answer,
            sourceType: card.sourceType,
            box: card.box,
          }))}
        />
      )}
    </>
  );
}
