"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type z } from "zod";

import { type FormState, fieldErrorsFrom, formDataToObject } from "@/lib/forms";
import { requireAdmin } from "@/modules/auth/service";

import {
  BehavioralInputSchema,
  CompetencyInputSchema,
  ContentValidationError,
  InterviewerQuestionInputSchema,
  QuestionInputSchema,
  ResourceInputSchema,
  RoleInputSchema,
  TopicInputSchema,
  TrackInputSchema,
  contentAdminFor,
} from "./admin";

/**
 * Shared flow for admin form actions: require admin, validate with Zod,
 * run the mutation, translate validation errors into form state.
 */
async function adminMutation<S extends z.ZodType>(
  schema: S,
  formData: FormData,
  mutate: (input: z.infer<S>, admin: ReturnType<typeof contentAdminFor>) => Promise<unknown>,
  successMessage: string,
): Promise<FormState> {
  const user = await requireAdmin();
  const parsed = schema.safeParse(formDataToObject(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };
  try {
    await mutate(parsed.data, contentAdminFor(user.id));
  } catch (error) {
    if (error instanceof ContentValidationError) {
      return error.field
        ? { fieldErrors: { [error.field]: [error.message] } }
        : { error: error.message };
    }
    throw error;
  }
  revalidatePath("/", "layout");
  return { ok: true, message: successMessage };
}

async function adminDelete(fn: (admin: ReturnType<typeof contentAdminFor>) => Promise<unknown>) {
  const user = await requireAdmin();
  await fn(contentAdminFor(user.id));
  revalidatePath("/", "layout");
}

/* Tracks, roles, competencies ----------------------------------------------- */

export async function saveTrackAction(id: string | null, _prev: FormState, formData: FormData) {
  return adminMutation(
    TrackInputSchema,
    formData,
    (input, admin) => admin.saveTrack(input, id ?? undefined),
    "Track saved",
  );
}

export async function deleteTrackAction(id: string, _prev: FormState): Promise<FormState> {
  try {
    await adminDelete((admin) => admin.deleteTrack(id));
    return { ok: true, message: "Track deleted" };
  } catch (error) {
    if (error instanceof ContentValidationError) return { error: error.message };
    throw error;
  }
}

export async function saveRoleAction(id: string | null, _prev: FormState, formData: FormData) {
  return adminMutation(
    RoleInputSchema,
    formData,
    (input, admin) => admin.saveRole(input, id ?? undefined),
    "Role saved",
  );
}

export async function deleteRoleAction(id: string): Promise<void> {
  await adminDelete((admin) => admin.deleteRole(id));
}

export async function saveCompetencyAction(
  id: string | null,
  _prev: FormState,
  formData: FormData,
) {
  return adminMutation(
    CompetencyInputSchema,
    formData,
    (input, admin) => admin.saveCompetency(input, id ?? undefined),
    "Competency saved",
  );
}

export async function deleteCompetencyAction(id: string): Promise<void> {
  await adminDelete((admin) => admin.deleteCompetency(id));
}

/* Topics -------------------------------------------------------------------- */

export async function saveTopicAction(id: string | null, _prev: FormState, formData: FormData) {
  let createdId: string | null = null;
  const state = await adminMutation(
    TopicInputSchema,
    formData,
    async (input, admin) => {
      const saved = await admin.saveTopic(input, id ?? undefined);
      createdId = id ? null : saved.id;
    },
    "Topic saved",
  );
  if (createdId) redirect(`/admin/topics/${createdId}`);
  return state;
}

export async function deleteTopicAction(id: string): Promise<void> {
  await adminDelete((admin) => admin.deleteTopic(id));
  redirect("/admin/topics");
}

/* Questions & resources ------------------------------------------------------ */

export async function saveQuestionAction(id: string | null, _prev: FormState, formData: FormData) {
  let topicId: string | null = null;
  const state = await adminMutation(
    QuestionInputSchema,
    formData,
    async (input, admin) => {
      const saved = await admin.saveQuestion(input, id ?? undefined);
      topicId = id ? null : saved.topicId;
    },
    "Question saved",
  );
  if (topicId) redirect(`/admin/topics/${topicId}#questions`);
  return state;
}

export async function deleteQuestionAction(id: string, topicId: string): Promise<void> {
  await adminDelete((admin) => admin.deleteQuestion(id));
  redirect(`/admin/topics/${topicId}#questions`);
}

export async function saveResourceAction(id: string | null, _prev: FormState, formData: FormData) {
  return adminMutation(
    ResourceInputSchema,
    formData,
    (input, admin) => admin.saveResource(input, id ?? undefined),
    "Resource saved",
  );
}

export async function deleteResourceAction(id: string): Promise<void> {
  await adminDelete((admin) => admin.deleteResource(id));
}

/* Behavioral & interviewer questions ---------------------------------------- */

export async function saveBehavioralAction(
  id: string | null,
  _prev: FormState,
  formData: FormData,
) {
  const state = await adminMutation(
    BehavioralInputSchema,
    formData,
    (input, admin) => admin.saveBehavioral(input, id ?? undefined),
    "Question saved",
  );
  if (state.ok && id) redirect("/admin/behavioral");
  return state;
}

export async function deleteBehavioralAction(id: string): Promise<void> {
  await adminDelete((admin) => admin.deleteBehavioral(id));
}

export async function saveInterviewerQuestionAction(
  id: string | null,
  _prev: FormState,
  formData: FormData,
) {
  const state = await adminMutation(
    InterviewerQuestionInputSchema,
    formData,
    (input, admin) => admin.saveInterviewerQuestion(input, id ?? undefined),
    "Question saved",
  );
  if (state.ok && id) redirect("/admin/interviewer-questions");
  return state;
}

export async function deleteInterviewerQuestionAction(id: string): Promise<void> {
  await adminDelete((admin) => admin.deleteInterviewerQuestion(id));
}
