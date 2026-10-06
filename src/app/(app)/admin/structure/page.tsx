import type { Metadata } from "next";

import { ActionForm } from "@/components/action-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { CheckboxField, InputField, SelectField, TextareaField } from "@/components/fields";
import { PageHeader, Section } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/modules/auth/service";
import {
  deleteCompetencyAction,
  deleteRoleAction,
  deleteTrackAction,
  saveCompetencyAction,
  saveRoleAction,
  saveTrackAction,
} from "@/modules/content/actions";
import { getContentService } from "@/modules/content/service";

export const metadata: Metadata = { title: "Tracks, roles, competencies" };

export default async function StructurePage() {
  await requireAdmin();
  const content = getContentService();
  const [tracks, roles, competencies] = await Promise.all([
    content.tracks(),
    content.roles(),
    content.competencies(),
  ]);
  const trackOptions = tracks.map((track) => ({ value: track.id, label: track.name }));

  return (
    <>
      <PageHeader
        title="Tracks, roles, competencies"
        description="Tracks group topics (e.g. Full-Stack JavaScript). Roles weight topics. Competencies tag behavioral questions and stories."
      />
      <div className="grid gap-10">
        <Section title="Tracks">
          <ul className="grid gap-3">
            {tracks.map((track) => (
              <li key={track.id} className="rounded-lg border p-4">
                <details>
                  <summary className="flex cursor-pointer items-center gap-2 font-medium">
                    {track.name}
                    <Badge variant={track.active ? "success" : "muted"}>
                      {track.active ? "Active" : "Inactive"}
                    </Badge>
                  </summary>
                  <div className="mt-4 grid gap-4">
                    <ActionForm action={saveTrackAction.bind(null, track.id)}>
                      <TrackFields defaults={track} />
                    </ActionForm>
                    <ActionForm
                      action={deleteTrackAction.bind(null, track.id)}
                      submitLabel="Delete track"
                      submitVariant="outline"
                      pendingLabel="Deleting…"
                    >
                      <p className="text-xs text-muted-foreground">
                        A track can only be deleted once it has no roles or topics.
                      </p>
                    </ActionForm>
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <details className="rounded-lg border border-dashed p-4">
            <summary className="cursor-pointer text-sm font-medium">Add a track</summary>
            <ActionForm action={saveTrackAction.bind(null, null)} className="mt-4" resetOnSuccess>
              <TrackFields />
            </ActionForm>
          </details>
        </Section>

        <Section title="Roles">
          <ul className="grid gap-3">
            {roles.map((role) => (
              <li key={role.id} className="rounded-lg border p-4">
                <details>
                  <summary className="cursor-pointer font-medium">
                    {role.name}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      · {tracks.find((track) => track.id === role.trackId)?.name}
                    </span>
                  </summary>
                  <div className="mt-4 grid gap-4">
                    <ActionForm action={saveRoleAction.bind(null, role.id)}>
                      <SelectField
                        label="Track"
                        name="trackId"
                        options={trackOptions}
                        defaultValue={role.trackId}
                      />
                      <InputField label="Name" name="name" defaultValue={role.name} required />
                      <InputField label="Slug" name="slug" defaultValue={role.slug} required />
                      <TextareaField
                        label="Description"
                        name="description"
                        defaultValue={role.description}
                      />
                    </ActionForm>
                    <form action={deleteRoleAction.bind(null, role.id)}>
                      <ConfirmSubmit
                        variant="outline"
                        size="sm"
                        message={`Delete role "${role.name}"? It will be removed from every topic.`}
                      >
                        Delete role
                      </ConfirmSubmit>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
          {tracks.length > 0 && (
            <details className="rounded-lg border border-dashed p-4">
              <summary className="cursor-pointer text-sm font-medium">Add a role</summary>
              <ActionForm action={saveRoleAction.bind(null, null)} className="mt-4" resetOnSuccess>
                <SelectField label="Track" name="trackId" options={trackOptions} />
                <InputField label="Name" name="name" required />
                <InputField label="Slug" name="slug" required hint="lowercase-with-dashes" />
                <TextareaField label="Description" name="description" />
              </ActionForm>
            </details>
          )}
        </Section>

        <Section
          title="Competencies"
          description="Used by the story bank and behavioral question library."
        >
          <ul className="grid gap-2">
            {competencies.map((competency) => (
              <li key={competency.id} className="rounded-lg border p-3">
                <details>
                  <summary className="cursor-pointer text-sm font-medium">
                    {competency.name}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {competency.slug}
                    </span>
                  </summary>
                  <div className="mt-3 grid gap-3">
                    <ActionForm
                      action={saveCompetencyAction.bind(null, competency.id)}
                      className="sm:grid-cols-3"
                    >
                      <InputField
                        label="Name"
                        name="name"
                        defaultValue={competency.name}
                        required
                      />
                      <InputField
                        label="Slug"
                        name="slug"
                        defaultValue={competency.slug}
                        required
                      />
                      <InputField
                        label="Order"
                        name="order"
                        type="number"
                        defaultValue={competency.order}
                        required
                      />
                    </ActionForm>
                    <form action={deleteCompetencyAction.bind(null, competency.id)}>
                      <ConfirmSubmit
                        variant="outline"
                        size="sm"
                        message={`Delete competency "${competency.name}"?`}
                      >
                        Delete
                      </ConfirmSubmit>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <details className="rounded-lg border border-dashed p-4">
            <summary className="cursor-pointer text-sm font-medium">Add a competency</summary>
            <ActionForm
              action={saveCompetencyAction.bind(null, null)}
              className="mt-4 sm:grid-cols-3"
              resetOnSuccess
            >
              <InputField label="Name" name="name" required />
              <InputField label="Slug" name="slug" required />
              <InputField
                label="Order"
                name="order"
                type="number"
                defaultValue={competencies.length}
                required
              />
            </ActionForm>
          </details>
        </Section>
      </div>
    </>
  );
}

function TrackFields({
  defaults,
}: {
  defaults?: { name: string; slug: string; description: string; active: boolean };
}) {
  return (
    <>
      <InputField label="Name" name="name" defaultValue={defaults?.name} required />
      <InputField
        label="Slug"
        name="slug"
        defaultValue={defaults?.slug}
        required
        hint="lowercase-with-dashes"
      />
      <TextareaField label="Description" name="description" defaultValue={defaults?.description} />
      <CheckboxField
        label="Active (visible to users)"
        name="active"
        defaultChecked={defaults?.active ?? true}
      />
    </>
  );
}
