import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page";
import { RichText } from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { levelForBand } from "@/lib/domain";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { requireProfile } from "@/modules/profile/service";
import { progressServiceFor } from "@/modules/progress/service";
import { SavedNote } from "@/modules/progress/ui/saved-note";

export const metadata: Metadata = { title: "Saved questions" };

export default async function SavedQuestionsPage() {
  const user = await requireUser("/practice/saved");
  const profile = await requireProfile(user.id);
  const content = getContentService();
  const [saved, questions, topics] = await Promise.all([
    progressServiceFor(user.id).savedQuestions(),
    content.questions(),
    content.topics(),
  ]);
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const level = levelForBand(profile.experienceBand);

  return (
    <>
      <PageHeader
        title="Saved questions"
        description="Your personal question library, with notes."
      />
      {saved.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Use the bookmark icon on any interview question to keep it here."
          action={
            <Button asChild variant="outline">
              <Link href="/practice/topics">Browse topics</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4">
          {saved.map((entry) => {
            const question = questionById.get(entry.questionId);
            if (!question) return null;
            const topic = topicById.get(question.topicId);
            const answer =
              question.answers.find((item) => item.level === level) ?? question.answers[0];
            return (
              <li key={entry.id} className="grid gap-3 rounded-xl border p-4">
                {topic && (
                  <Link
                    href={`/practice/topics/${topic.slug}`}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    {topic.name}
                  </Link>
                )}
                <RichText source={question.prompt} className="font-medium" />
                {answer && (
                  <details className="rounded-lg bg-muted/40 p-3">
                    <summary className="cursor-pointer text-sm">Answer</summary>
                    <RichText source={answer.answer} className="mt-2" />
                  </details>
                )}
                <SavedNote questionId={question.id} note={entry.note} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
