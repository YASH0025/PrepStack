import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page";
import { requireAdmin } from "@/modules/auth/service";
import { saveQuestionAction } from "@/modules/content/actions";
import { getContentService } from "@/modules/content/service";
import { QuestionFormFields } from "@/modules/content/ui/question-form-fields";

export const metadata: Metadata = { title: "New question" };

export default async function NewQuestionPage({
  params,
}: PageProps<"/admin/topics/[id]/questions/new">) {
  await requireAdmin();
  const { id } = await params;
  const topic = await getContentService().topic(id);
  if (!topic) notFound();
  return (
    <>
      <PageHeader
        title="New question"
        description={
          <>
            For{" "}
            <Link href={`/admin/topics/${topic.id}`} className="underline">
              {topic.name}
            </Link>
          </>
        }
      />
      <ActionForm
        action={saveQuestionAction.bind(null, null)}
        submitLabel="Create question"
        className="max-w-3xl"
      >
        <QuestionFormFields topicId={topic.id} />
      </ActionForm>
    </>
  );
}
