import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { requireUser } from "@/modules/auth/service";
import { getProblem } from "@/modules/coding/catalogue";
import { statusOf } from "@/modules/coding/domain/stats";
import { codingFor } from "@/modules/coding/service";
import { CodingWorkspace } from "@/modules/coding/ui/workspace";

export async function generateMetadata({
  params,
}: PageProps<"/practice/coding/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: getProblem(slug)?.title ?? "Coding problem" };
}

export default async function CodingProblemPage({ params }: PageProps<"/practice/coding/[slug]">) {
  const { slug } = await params;
  const user = await requireUser(`/practice/coding/${slug}`);
  const problem = getProblem(slug);
  if (!problem) notFound();
  const progress = await codingFor(user.id).progressFor(slug);

  return (
    <div className="grid gap-3">
      <Link
        href="/practice/coding"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> All problems
      </Link>
      <CodingWorkspace
        problem={problem}
        initialStatus={statusOf(progress ?? undefined)}
        savedCode={progress?.code ?? {}}
        lastLanguage={progress?.lastLanguage ?? null}
      />
    </div>
  );
}
