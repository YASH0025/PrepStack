import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader, Section } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BAND_LABELS, DEPTH_LABELS, EXPERIENCE_BANDS } from "@/lib/domain";
import { getCurrentUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { QuestionList } from "@/modules/content/ui/question-list";
import { TopicArticle } from "@/modules/content/ui/topic-article";

async function publishedTopic(slug: string) {
  const topic = await getContentService().topicBySlug(slug);
  return topic?.published ? topic : null;
}

export async function generateMetadata({ params }: PageProps<"/topics/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const topic = await publishedTopic(slug);
  if (!topic) return { title: "Topic not found" };
  return {
    title: `${topic.name}: interview guide and questions`,
    description: topic.description,
    alternates: { canonical: `/topics/${topic.slug}` },
    openGraph: { title: topic.name, description: topic.description, type: "article" },
  };
}

/** Public, server-rendered topic guide. No personal data. */
export default async function PublicTopicPage({ params }: PageProps<"/topics/[slug]">) {
  const { slug } = await params;
  const topic = await publishedTopic(slug);
  if (!topic) notFound();
  const content = getContentService();
  const [questions, resources, user] = await Promise.all([
    content.questions({ topicId: topic.id }),
    content.resources(topic.id),
    getCurrentUser(),
  ]);
  const openQuestions = questions.filter((question) => question.format === "OPEN");

  return (
    <article className="grid max-w-3xl gap-8">
      <PageHeader
        title={topic.name}
        description={topic.description}
        actions={
          <Button asChild size="sm" variant={user ? "default" : "outline"}>
            <Link href={user ? `/practice/topics/${topic.slug}` : "/signup"}>
              {user ? "Open in my prep" : "Track your progress"}
            </Link>
          </Button>
        }
        className="pb-0"
      />
      <section aria-labelledby="depth-title" className="grid gap-2">
        <h2 id="depth-title" className="text-sm font-semibold">
          How deep to go
        </h2>
        <ul className="flex flex-wrap gap-2 text-xs">
          {EXPERIENCE_BANDS.map((band) => {
            const depth = topic.depthByBand[band];
            return (
              <li key={band}>
                <Badge variant="outline">
                  {BAND_LABELS[band]}: {DEPTH_LABELS[depth.depth].label} · ~{depth.hours}h
                </Badge>
              </li>
            );
          })}
        </ul>
      </section>
      <TopicArticle topic={topic} resources={resources} />
      {openQuestions.length > 0 && (
        <Section
          title="Interview questions"
          description="Answers are calibrated for junior, mid and senior levels."
        >
          <QuestionList
            questions={openQuestions.map((question) => ({
              id: question.id,
              prompt: question.prompt,
              type: question.type,
              answers: question.answers,
            }))}
            defaultLevel="MID"
          />
        </Section>
      )}
    </article>
  );
}
