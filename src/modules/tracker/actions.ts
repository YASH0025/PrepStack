"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type ActionResult, fail, fieldErrorsFrom, ok } from "@/lib/forms";
import { requireUser } from "@/modules/auth/service";

import { type StatusSuggestion, conflictingIds, suggestAfterRound } from "./domain/rounds";
import { afterInterviewScheduleChanged, afterRoundsDeleted } from "./hooks";
import {
  ApplicationInputSchema,
  ApplicationPatchSchema,
  ApplicationStatusSchema,
  CancelRoundInputSchema,
  ChecklistItemSchema,
  CompleteRoundInputSchema,
  CustomFieldInputSchema,
  FollowUpInputSchema,
  RescheduleRoundInputSchema,
  RoundInputSchema,
} from "./schemas";
import { TrackerError, trackerFor } from "./service";

const Id = z.uuid();

function done() {
  revalidatePath("/", "layout");
}

async function guard<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof TrackerError) {
      return fail(error.message, error.field ? { [error.field]: [error.message] } : undefined);
    }
    throw error;
  }
}

/* Applications ------------------------------------------------------------------ */

export async function saveApplicationAction(
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = ApplicationInputSchema.safeParse(input);
  if (!parsed.success)
    return fail("Please fix the highlighted fields", fieldErrorsFrom(parsed.error));
  return guard(async () => {
    const tracker = trackerFor(user.id);
    const application = id
      ? await tracker.updateApplication(Id.parse(id), parsed.data)
      : await tracker.createApplication(parsed.data);
    done();
    return ok({ id: application.id });
  });
}

export async function deleteApplicationAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  return guard(async () => {
    const deleted = await trackerFor(user.id).deleteApplication(Id.parse(id));
    await afterRoundsDeleted(user.id, deleted);
    await afterInterviewScheduleChanged(user.id);
    done();
    return ok();
  });
}

export async function patchApplicationAction(id: string, patch: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = ApplicationPatchSchema.safeParse(patch);
  if (!parsed.success) return fail("Invalid value", fieldErrorsFrom(parsed.error));
  return guard(async () => {
    await trackerFor(user.id).patchApplication(Id.parse(id), parsed.data);
    done();
    return ok();
  });
}

export async function setApplicationStatusAction(
  id: string,
  status: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = ApplicationStatusSchema.safeParse(status);
  if (!parsed.success) return fail("Invalid status");
  return guard(async () => {
    await trackerFor(user.id).setApplicationStatus(Id.parse(id), parsed.data);
    done();
    return ok();
  });
}

export async function moveApplicationAction(
  id: string,
  status: string,
  order: number,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({ id: Id, status: ApplicationStatusSchema, order: z.number().finite() })
    .safeParse({ id, status, order });
  if (!parsed.success) return fail("Invalid move");
  return guard(async () => {
    await trackerFor(user.id).moveApplication(
      parsed.data.id,
      parsed.data.status,
      parsed.data.order,
    );
    done();
    return ok();
  });
}

export async function setCustomValueAction(
  applicationId: string,
  fieldId: string,
  value: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z
    .object({
      applicationId: Id,
      fieldId: Id,
      value: z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()]),
    })
    .safeParse({ applicationId, fieldId, value });
  if (!parsed.success) return fail("Invalid value");
  return guard(async () => {
    await trackerFor(user.id).setCustomValue(
      parsed.data.applicationId,
      parsed.data.fieldId,
      parsed.data.value,
    );
    done();
    return ok();
  });
}

export async function createCustomFieldAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = CustomFieldInputSchema.safeParse(input);
  if (!parsed.success) return fail("Please fix the column details", fieldErrorsFrom(parsed.error));
  return guard(async () => {
    await trackerFor(user.id).createCustomField(parsed.data);
    done();
    return ok();
  });
}

export async function deleteCustomFieldAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  return guard(async () => {
    await trackerFor(user.id).deleteCustomField(Id.parse(id));
    done();
    return ok();
  });
}

/* Rounds ------------------------------------------------------------------------ */

export async function saveRoundAction(
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string; conflict: boolean }>> {
  const user = await requireUser();
  const parsed = RoundInputSchema.safeParse(input);
  if (!parsed.success)
    return fail("Please fix the highlighted fields", fieldErrorsFrom(parsed.error));
  return guard(async () => {
    const tracker = trackerFor(user.id);
    const round = id
      ? await tracker.updateRound(Id.parse(id), parsed.data)
      : (await tracker.createRound(parsed.data)).round;
    const conflict = conflictingIds(await tracker.listRounds()).has(round.id);
    await afterInterviewScheduleChanged(user.id);
    done();
    return ok({ id: round.id, conflict });
  });
}

export async function recordRoundOutcomeAction(
  input: unknown,
): Promise<ActionResult<{ suggestion: StatusSuggestion | null; applicationId: string }>> {
  const user = await requireUser();
  const parsed = CompleteRoundInputSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid outcome");
  return guard(async () => {
    const tracker = trackerFor(user.id);
    const round = await tracker.setRoundOutcome(
      parsed.data.roundId,
      parsed.data.status,
      parsed.data.result,
    );
    const application = await tracker.getApplication(round.applicationId);
    const suggestion = application ? suggestAfterRound(application.status, round) : null;
    await afterInterviewScheduleChanged(user.id);
    done();
    return ok({ suggestion, applicationId: round.applicationId });
  });
}

export async function cancelRoundAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = CancelRoundInputSchema.safeParse(input);
  if (!parsed.success) return fail("Please add a reason", fieldErrorsFrom(parsed.error));
  return guard(async () => {
    await trackerFor(user.id).cancelRound(
      parsed.data.roundId,
      parsed.data.reason,
      parsed.data.cancelledBy,
    );
    await afterInterviewScheduleChanged(user.id);
    done();
    return ok();
  });
}

export async function rescheduleRoundAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = RescheduleRoundInputSchema.safeParse(input);
  if (!parsed.success)
    return fail("Please fix the highlighted fields", fieldErrorsFrom(parsed.error));
  return guard(async () => {
    const { roundId, ...rest } = parsed.data;
    const round = await trackerFor(user.id).rescheduleRound(roundId, rest);
    await afterInterviewScheduleChanged(user.id);
    done();
    return ok({ id: round.id });
  });
}

export async function deleteRoundAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  return guard(async () => {
    const deleted = await trackerFor(user.id).deleteRound(Id.parse(id));
    if (deleted) await afterRoundsDeleted(user.id, [deleted]);
    await afterInterviewScheduleChanged(user.id);
    done();
    return ok();
  });
}

export async function updateChecklistAction(
  roundId: string,
  checklist: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.array(ChecklistItemSchema).max(50).safeParse(checklist);
  if (!parsed.success) return fail("Invalid checklist");
  return guard(async () => {
    await trackerFor(user.id).updateChecklist(Id.parse(roundId), parsed.data);
    done();
    return ok();
  });
}

export async function updateInterviewerQuestionsAction(
  roundId: string,
  questions: unknown,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.array(z.string().trim().min(1).max(300)).max(30).safeParse(questions);
  if (!parsed.success) return fail("Invalid questions");
  return guard(async () => {
    await trackerFor(user.id).updateInterviewerQuestions(Id.parse(roundId), parsed.data);
    done();
    return ok();
  });
}

export async function setRoundNotesAction(roundId: string, notes: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = z.string().max(5000).safeParse(notes);
  if (!parsed.success) return fail("Notes are too long");
  return guard(async () => {
    await trackerFor(user.id).setRoundNotes(Id.parse(roundId), parsed.data.trim() || null);
    done();
    return ok();
  });
}

export async function setRoundFollowUpAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = FollowUpInputSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid follow-up", fieldErrorsFrom(parsed.error));
  return guard(async () => {
    await trackerFor(user.id).setRoundFollowUp(
      parsed.data.roundId,
      parsed.data.followUpDate,
      parsed.data.followUpNote,
    );
    done();
    return ok();
  });
}
