import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { CheckboxField, SelectField, TextareaField } from "@/components/fields";
import { PageHeader, Section } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/modules/auth/service";
import { deleteBehavioralAction, saveBehavioralAction } from "@/modules/content/actions";
import { type BehavioralQuestion, type Competency } from "@/modules/content/schemas";
import { getContentService } from "@/modules/content/service";

export const metadata: Metadata = { title: "Behavioral & HR questions" };

const KIND_OPTIONS = [
  { value: "BEHAVIORAL", label: "Behavioral" },
  { value: "HR_INDIA", label: "HR (India-specific)" },
];

export default async function AdminBehavioralPage({
  searchParams,
}: PageProps<"/admin/behavioral">) {
  await requireAdmin();
  const { edit } = await searchParams;
  const content = getContentService();
  const [questions, competencies] = await Promise.all([
    content.behavioralQuestions(),
    content.competencies(),
  ]);
  const editing =
    typeof edit === "string" ? questions.find((question) => question.id === edit) : undefined;
  const names = new Map(competencies.map((competency) => [competency.slug, competency.name]));

  return (
    <>
      <PageHeader
        title="Behavioral & HR questions"
        description="Curated library used by the story bank, revision sheets and calendar prep."
      />
      <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
        <Section title={`Library (${questions.length})`}>
          <ul className="divide-y rounded-xl border">
            {questions.map((question) => (
              <li key={question.id} className="grid gap-2 p-3">
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-sm">{question.text}</p>
                  <Badge variant={question.kind === "HR_INDIA" ? "warning" : "info"}>
                    {question.kind === "HR_INDIA" ? "HR" : "Behavioral"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {question.competencies.map((slug) => (
                    <Badge key={slug} variant="outline">
                      {names.get(slug) ?? slug}
                    </Badge>
                  ))}
                  <span className="ml-auto flex gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/behavioral?edit=${question.id}`}>Edit</Link>
                    </Button>
                    <form action={deleteBehavioralAction.bind(null, question.id)}>
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
            action={saveBehavioralAction.bind(null, editing?.id ?? null)}
            resetOnSuccess={!editing}
            footer={
              editing && (
                <Button asChild variant="ghost">
                  <Link href="/admin/behavioral">Cancel</Link>
                </Button>
              )
            }
          >
            <BehavioralFields question={editing} competencies={competencies} />
          </ActionForm>
        </Section>
      </div>
    </>
  );
}

function BehavioralFields({
  question,
  competencies,
}: {
  question?: BehavioralQuestion;
  competencies: Competency[];
}) {
  return (
    <>
      <TextareaField label="Question" name="text" defaultValue={question?.text} required rows={3} />
      <SelectField
        label="Kind"
        name="kind"
        defaultValue={question?.kind ?? "BEHAVIORAL"}
        options={KIND_OPTIONS}
      />
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Competencies</legend>
        <div className="grid grid-cols-2 gap-2">
          {competencies.map((competency) => (
            <CheckboxField
              key={competency.id}
              name="competencies"
              value={competency.slug}
              label={competency.name}
              defaultChecked={question?.competencies.includes(competency.slug)}
            />
          ))}
        </div>
      </fieldset>
      <TextareaField
        label="How to approach it"
        name="guidance"
        defaultValue={question?.guidance}
        rows={6}
        hint="Practical guidance. For HR questions, keep it informational, not legal advice."
      />
    </>
  );
}
