import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { StoryForm } from "@/modules/story-bank/ui/story-form";

export const metadata: Metadata = { title: "New story" };

export default async function NewStoryPage({ searchParams }: PageProps<"/practice/stories/new">) {
  await requireUser("/practice/stories/new");
  const { competency } = await searchParams;
  const competencies = await getContentService().competencies();
  const preset =
    typeof competency === "string" && competencies.some((item) => item.slug === competency)
      ? [competency]
      : [];

  return (
    <>
      <PageHeader
        title="New story"
        description={
          <>
            Write it in STAR form. You can save a draft and finish it later.{" "}
            <Link href="/practice/stories?tab=questions" className="underline">
              Browse questions
            </Link>
          </>
        }
      />
      <div className="max-w-3xl">
        <StoryForm
          storyId={null}
          competencies={competencies}
          defaults={{
            title: "",
            situation: "",
            task: "",
            action: "",
            result: "",
            impact: "",
            competencies: preset,
            projectRef: "",
            status: "DRAFT",
          }}
        />
      </div>
    </>
  );
}
