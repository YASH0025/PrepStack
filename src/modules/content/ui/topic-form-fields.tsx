import { CheckboxField, Field, InputField, SelectField, TextareaField } from "@/components/fields";
import { NativeSelect } from "@/components/ui/native-select";
import { BAND_LABELS, DEPTHS, DEPTH_LABELS, EXPERIENCE_BANDS } from "@/lib/domain";

import { type Role, type Topic, type Track } from "../schemas";

const DEPTH_OPTIONS = DEPTHS.map((depth) => ({
  value: depth,
  label: `${DEPTH_LABELS[depth].label} · ${DEPTH_LABELS[depth].meaning}`,
}));

/** All fields of the admin topic form. Server-rendered; values post as FormData. */
export function TopicFormFields({
  topic,
  tracks,
  roles,
  allTopics,
  prerequisiteIds,
}: {
  topic?: Topic;
  tracks: Track[];
  roles: Role[];
  allTopics: Topic[];
  prerequisiteIds: string[];
}) {
  const others = allTopics.filter((candidate) => candidate.id !== topic?.id);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Name" name="name" defaultValue={topic?.name} required />
        <InputField
          label="Slug"
          name="slug"
          defaultValue={topic?.slug}
          required
          hint="Used in URLs. lowercase-with-dashes"
        />
        <SelectField
          label="Track"
          name="trackId"
          defaultValue={topic?.trackId ?? tracks[0]?.id}
          options={tracks.map((track) => ({ value: track.id, label: track.name }))}
        />
        <InputField
          label="Category"
          name="category"
          defaultValue={topic?.category}
          required
          hint="e.g. JavaScript, React, Node.js"
        />
        <SelectField
          label="Core importance"
          name="coreImportance"
          defaultValue={String(topic?.coreImportance ?? 3)}
          options={[1, 2, 3, 4, 5].map((value) => ({
            value: String(value),
            label: `${value} / 5`,
          }))}
        />
      </div>
      <TextareaField
        label="Short description"
        name="description"
        defaultValue={topic?.description}
        required
        rows={2}
      />
      <TextareaField
        label="Explanation"
        name="explanation"
        defaultValue={topic?.explanation}
        rows={10}
        hint="Paragraphs, '- ' lists, ``` code blocks, `inline code` and **bold** are supported."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextareaField
          label="Key concepts (one per line)"
          name="keyConcepts"
          defaultValue={topic?.keyConcepts.join("\n")}
          rows={6}
        />
        <TextareaField
          label="Common mistakes (one per line)"
          name="commonMistakes"
          defaultValue={topic?.commonMistakes.join("\n")}
          rows={6}
        />
      </div>

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">
          Required depth and study hours by experience
        </legend>
        {EXPERIENCE_BANDS.map((band) => (
          <div key={band} className="grid items-end gap-3 sm:grid-cols-[8rem_1fr_8rem]">
            <span className="text-sm text-muted-foreground">{BAND_LABELS[band]}</span>
            <Field label="Depth" htmlFor={`f-depth-${band}`}>
              <NativeSelect
                id={`f-depth-${band}`}
                name={`depth_${band}`}
                defaultValue={topic?.depthByBand[band].depth ?? "EXPLAIN"}
              >
                {DEPTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <InputField
              label="Hours"
              name={`hours_${band}`}
              id={`f-hours-${band}`}
              type="number"
              step="0.25"
              min="0.25"
              max="80"
              defaultValue={topic?.depthByBand[band].hours ?? 2}
              required
            />
          </div>
        ))}
      </fieldset>

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Importance per target role</legend>
        <p className="text-xs text-muted-foreground">
          0 means the topic is not part of that role&apos;s roadmap.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {roles.map((role) => {
            const current =
              topic?.roleImportance.find((entry) => entry.roleId === role.id)?.importance ?? 0;
            return (
              <SelectField
                key={role.id}
                label={role.name}
                name={`role_${role.id}`}
                id={`f-role-${role.id}`}
                defaultValue={String(current)}
                options={[0, 1, 2, 3, 4, 5].map((value) => ({
                  value: String(value),
                  label: String(value),
                }))}
              />
            );
          })}
        </div>
      </fieldset>

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Prerequisites</legend>
        <p className="text-xs text-muted-foreground">Topics to learn first. Cycles are rejected.</p>
        <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
          {others.map((candidate) => (
            <CheckboxField
              key={candidate.id}
              name="prerequisiteIds"
              value={candidate.id}
              label={`${candidate.name}`}
              hint={candidate.category}
              defaultChecked={prerequisiteIds.includes(candidate.id)}
            />
          ))}
        </div>
      </fieldset>

      <CheckboxField
        label="Published (visible to users and on public pages)"
        name="published"
        defaultChecked={topic?.published ?? false}
      />
    </>
  );
}
