import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { CheckboxField, TextareaField } from "@/components/fields";
import { PageHeader, Section } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUND_TYPES, ROUND_TYPE_LABELS } from "@/lib/domain";
import { requireAdmin } from "@/modules/auth/service";
import {
  deleteInterviewerQuestionAction,
  saveInterviewerQuestionAction,
} from "@/modules/content/actions";
import { getContentService } from "@/modules/content/service";

export const metadata: Metadata = { title: "Questions to ask the interviewer" };

export default async function AdminInterviewerQuestionsPage({
  searchParams,
}: PageProps<"/admin/interviewer-questions">) {
  await requireAdmin();
  const { edit } = await searchParams;
  const questions = await getContentService().interviewerQuestions();
  const editing =
    typeof edit === "string" ? questions.find((question) => question.id === edit) : undefined;

  return (
    <>
      <PageHeader
        title="Questions to ask the interviewer"
        description="Curated per round type. Shown on revision sheets and in calendar prep."
      />
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <Section title={`Library (${questions.length})`}>
          <ul className="divide-y rounded-xl border">
            {questions.map((question) => (
              <li key={question.id} className="grid gap-2 p-3">
                <p className="text-sm">{question.text}</p>
                <div className="flex flex-wrap items-center gap-1">
                  {question.roundTypes.map((type) => (
                    <Badge key={type} variant="outline">
                      {ROUND_TYPE_LABELS[type]}
                    </Badge>
                  ))}
                  <span className="ml-auto flex gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/interviewer-questions?edit=${question.id}`}>Edit</Link>
                    </Button>
                    <form action={deleteInterviewerQuestionAction.bind(null, question.id)}>
                      <ConfirmSubmit variant="ghost" size="sm" message="Delete this question?">
                        Delete
                      </ConfirmSubmit>
                    </form>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Section>
        <Section title={editing ? "Edit question" : "Add a question"}>
          <ActionForm
            key={editing?.id ?? "new"}
            action={saveInterviewerQuestionAction.bind(null, editing?.id ?? null)}
            resetOnSuccess={!editing}
          >
            <TextareaField
              label="Question"
              name="text"
              defaultValue={editing?.text}
              required
              rows={3}
            />
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">Round types</legend>
              <div className="grid grid-cols-2 gap-2">
                {ROUND_TYPES.map((type) => (
                  <CheckboxField
                    key={type}
                    name="roundTypes"
                    value={type}
                    label={ROUND_TYPE_LABELS[type]}
                    defaultChecked={editing?.roundTypes.includes(type)}
                  />
                ))}
              </div>
            </fieldset>
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
