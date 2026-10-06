import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page";
import { requireAdmin } from "@/modules/auth/service";
import { saveTopicAction } from "@/modules/content/actions";
import { getContentService } from "@/modules/content/service";
import { TopicFormFields } from "@/modules/content/ui/topic-form-fields";

export const metadata: Metadata = { title: "New topic" };

export default async function NewTopicPage() {
  await requireAdmin();
  const content = getContentService();
  const [tracks, roles, topics] = await Promise.all([
    content.tracks(),
    content.roles(),
    content.topics(),
  ]);
  if (tracks.length === 0) redirect("/admin/structure");

  return (
    <>
      <PageHeader title="New topic" />
      <ActionForm
        action={saveTopicAction.bind(null, null)}
        submitLabel="Create topic"
        className="max-w-3xl"
      >
        <TopicFormFields tracks={tracks} roles={roles} allTopics={topics} prerequisiteIds={[]} />
      </ActionForm>
    </>
  );
}
