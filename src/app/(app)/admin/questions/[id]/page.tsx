import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { PageHeader } from "@/components/page";
import { requireAdmin } from "@/modules/auth/service";
import { deleteQuestionAction, saveQuestionAction } from "@/modules/content/actions";
import { getContentService } from "@/modules/content/service";
import { QuestionFormFields } from "@/modules/content/ui/question-form-fields";

export const metadata: Metadata = { title: "Edit question" };

export default async function EditQuestionPage({ params }: PageProps<"/admin/questions/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const content = getContentService();
  const question = await content.question(id);
  if (!question) notFound();
  const topic = await content.topic(question.topicId);

  return (
    <>
      <PageHeader
        title="Edit question"
        description={
          topic && (
            <>
              For{" "}
              <Link href={`/admin/topics/${topic.id}#questions`} className="underline">
                {topic.name}
              </Link>
            </>
          )
        }
      />
      <div className="grid max-w-3xl gap-8">
        <ActionForm action={saveQuestionAction.bind(null, question.id)} submitLabel="Save question">
          <QuestionFormFields topicId={question.topicId} question={question} />
        </ActionForm>
        <form action={deleteQuestionAction.bind(null, question.id, question.topicId)}>
          <ConfirmSubmit variant="destructive" message="Delete this question?">
            Delete question
          </ConfirmSubmit>
        </form>
      </div>
    </>
  );
}
