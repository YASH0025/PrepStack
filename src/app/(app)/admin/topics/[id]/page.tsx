import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Plus } from "lucide-react";

import { ActionForm } from "@/components/action-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { InputField, SelectField } from "@/components/fields";
import { PageHeader, Section } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEPTH_LABELS, QUESTION_TYPE_LABELS } from "@/lib/domain";
import { requireAdmin } from "@/modules/auth/service";
import {
  deleteResourceAction,
  deleteTopicAction,
  saveResourceAction,
  saveTopicAction,
} from "@/modules/content/actions";
import { getContentService } from "@/modules/content/service";
import { TopicFormFields } from "@/modules/content/ui/topic-form-fields";

export const metadata: Metadata = { title: "Edit topic" };

const RESOURCE_KINDS = ["DOCS", "ARTICLE", "VIDEO", "BOOK", "COURSE"].map((kind) => ({
  value: kind,
  label: kind.charAt(0) + kind.slice(1).toLowerCase(),
}));

export default async function EditTopicPage({ params }: PageProps<"/admin/topics/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const content = getContentService();
  const topic = await content.topic(id);
  if (!topic) notFound();

  const [tracks, roles, topics, edges, questions, resources] = await Promise.all([
    content.tracks(),
    content.roles(),
    content.topics(),
    content.prerequisites(),
    content.questions({ topicId: id }),
    content.resources(id),
  ]);
  const prerequisiteIds = edges
    .filter((edge) => edge.topicId === id)
    .map((edge) => edge.prerequisiteId);

  return (
    <>
      <PageHeader
        title={topic.name}
        description={
          topic.published ? `Published at /topics/${topic.slug}` : "Draft: not visible to users"
        }
        actions={
          topic.published && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/topics/${topic.slug}`} target="_blank">
                <ExternalLink /> View public page
              </Link>
            </Button>
          )
        }
      />
      <div className="grid gap-10">
        <ActionForm
          action={saveTopicAction.bind(null, topic.id)}
          submitLabel="Save topic"
          className="max-w-3xl"
        >
          <TopicFormFields
            topic={topic}
            tracks={tracks}
            roles={roles}
            allTopics={topics}
            prerequisiteIds={prerequisiteIds}
          />
        </ActionForm>

        <Section
          title={`Questions (${questions.length})`}
          actions={
            <Button asChild size="sm">
              <Link href={`/admin/topics/${topic.id}/questions/new`}>
                <Plus /> Add question
              </Link>
            </Button>
          }
        >
          <span id="questions" />
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions yet.</p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {questions.map((question) => (
                <li key={question.id} className="flex flex-wrap items-center gap-2 p-3">
                  <Link
                    href={`/admin/questions/${question.id}`}
                    className="min-w-0 flex-1 text-sm hover:underline"
                  >
                    {question.prompt}
                  </Link>
                  <Badge variant="outline">{QUESTION_TYPE_LABELS[question.type]}</Badge>
                  <Badge variant="outline">{DEPTH_LABELS[question.depth].label}</Badge>
                  {question.format === "MCQ" && <Badge variant="info">MCQ</Badge>}
                  {question.diagnostic && <Badge variant="warning">Diagnostic</Badge>}
                  {question.selfCheck && <Badge variant="success">Self-check</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={`Resources (${resources.length})`}>
          <ul className="grid gap-2">
            {resources.map((resource) => (
              <li
                key={resource.id}
                className="flex items-center gap-2 rounded-lg border p-3 text-sm"
              >
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {resource.title}
                </a>
                <Badge variant="muted">{resource.kind}</Badge>
                <form action={deleteResourceAction.bind(null, resource.id)}>
                  <ConfirmSubmit variant="ghost" size="sm" message="Delete this resource?">
                    Delete
                  </ConfirmSubmit>
                </form>
              </li>
            ))}
          </ul>
          <ActionForm
            action={saveResourceAction.bind(null, null)}
            submitLabel="Add resource"
            className="rounded-lg border border-dashed p-4 sm:grid-cols-[1fr_1fr_10rem]"
            resetOnSuccess
          >
            <input type="hidden" name="topicId" value={topic.id} />
            <InputField label="Title" name="title" required />
            <InputField label="URL" name="url" type="url" required placeholder="https://" />
            <SelectField label="Kind" name="kind" options={RESOURCE_KINDS} />
          </ActionForm>
        </Section>

        <Section title="Danger zone">
          <form action={deleteTopicAction.bind(null, topic.id)}>
            <ConfirmSubmit
              variant="destructive"
              message={`Delete "${topic.name}" with its ${questions.length} questions and ${resources.length} resources? This cannot be undone.`}
            >
              Delete topic
            </ConfirmSubmit>
          </form>
        </Section>
      </div>
    </>
  );
}
