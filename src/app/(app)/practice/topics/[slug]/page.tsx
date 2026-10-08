import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader, Section } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEPTH_LABELS, levelForBand } from "@/lib/domain";
import { requireUser } from "@/modules/auth/service";
import { practiceLinkForTopic } from "@/modules/coding/links";
import { getContentService } from "@/modules/content/service";
import { QuestionList } from "@/modules/content/ui/question-list";
import { TopicArticle } from "@/modules/content/ui/topic-article";
import { requireProfile } from "@/modules/profile/service";
import { progressServiceFor } from "@/modules/progress/service";
import { SelfCheck } from "@/modules/progress/ui/self-check";
import { reviewServiceFor } from "@/modules/review/service";
import { TopicStatusControl } from "@/modules/progress/ui/topic-status-control";

export async function generateMetadata({
  params,
}: PageProps<"/practice/topics/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getContentService().topicBySlug(slug);
  return { title: topic?.name ?? "Topic" };
}

export default async function TopicPage({ params }: PageProps<"/practice/topics/[slug]">) {
  const { slug } = await params;
  const user = await requireUser(`/practice/topics/${slug}`);
  const profile = await requireProfile(user.id);
  const content = getContentService();
  const topic = await content.topicBySlug(slug);
  if (!topic || !topic.published) notFound();

  const progress = progressServiceFor(user.id);
  const [questions, resources, edges, allTopics, status, savedIds, reviewIds] = await Promise.all([
    content.questions({ topicId: topic.id }),
    content.resources(topic.id),
    content.prerequisites(),
    content.topics({ trackId: topic.trackId, publishedOnly: true }),
    progress.statusOf(topic.id),
    progress.savedQuestionIds(),
    reviewServiceFor(user.id).sourceIds("SAVED_QUESTION"),
  ]);
  const byId = new Map(allTopics.map((item) => [item.id, item]));
  const prerequisites = edges
    .filter((edge) => edge.topicId === topic.id)
    .map((edge) => byId.get(edge.prerequisiteId))
    .filter((item) => item !== undefined);
  const unlocks = edges
    .filter((edge) => edge.prerequisiteId === topic.id)
    .map((edge) => byId.get(edge.topicId))
    .filter((item) => item !== undefined);

  const required = topic.depthByBand[profile.experienceBand];
  const openQuestions = questions.filter((question) => question.format === "OPEN");
  const selfCheck = questions.filter((question) => question.format === "MCQ" && question.selfCheck);
  const practice = practiceLinkForTopic(topic.slug);

  return (
    <>
      <PageHeader
        title={topic.name}
        description={topic.description}
        actions={<TopicStatusControl topicId={topic.id} status={status} />}
      />
      <div className="mb-8 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline">{topic.category}</Badge>
        <Badge variant="info">
          Your target: {DEPTH_LABELS[required.depth].label} ({DEPTH_LABELS[required.depth].meaning})
        </Badge>
        <Badge variant="muted">~{required.hours}h</Badge>
        {practice && (
          <Button asChild size="sm" className="ml-auto">
            <Link href={practice.href}>{practice.label}</Link>
          </Button>
        )}
      </div>

      {(prerequisites.length > 0 || unlocks.length > 0) && (
        <div className="mb-8 grid gap-2 text-sm">
          {prerequisites.length > 0 && (
            <p>
              <span className="text-muted-foreground">Learn first: </span>
              {prerequisites.map((item, index) => (
                <span key={item.id}>
                  {index > 0 && ", "}
                  <Link href={`/practice/topics/${item.slug}`} className="underline">
                    {item.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
          {unlocks.length > 0 && (
            <p>
              <span className="text-muted-foreground">Leads to: </span>
              {unlocks.map((item, index) => (
                <span key={item.id}>
                  {index > 0 && ", "}
                  <Link href={`/practice/topics/${item.slug}`} className="underline">
                    {item.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-10">
        <TopicArticle topic={topic} resources={resources} />

        {openQuestions.length > 0 && (
          <Section
            title="Interview questions"
            description="Answers are calibrated by level. Save the ones you want to revisit."
          >
            <QuestionList
              questions={openQuestions.map((question) => ({
                id: question.id,
                prompt: question.prompt,
                type: question.type,
                answers: question.answers,
              }))}
              defaultLevel={levelForBand(profile.experienceBand)}
              savedIds={[...savedIds]}
              reviewIds={[...reviewIds]}
              canSave
            />
          </Section>
        )}

        {selfCheck.length > 0 && (
          <Section title="Quick self-check" description="Answers are checked when you pick one.">
            <SelfCheck
              questions={selfCheck.map((question) => ({
                id: question.id,
                prompt: question.prompt,
                options: question.options,
              }))}
            />
          </Section>
        )}
      </div>
    </>
  );
}
