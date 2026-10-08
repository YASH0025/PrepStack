"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { HttpUrlSchema } from "@/lib/domain";
import { type ActionResult, fail, fieldErrorsFrom, ok } from "@/lib/forms";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/modules/auth/service";

import {
  BookSlotInputSchema,
  FeedbackInputSchema,
  JoinMockInputSchema,
  MatchRequestInputSchema,
  PostSlotInputSchema,
  ReportInputSchema,
} from "./schemas";
import { MockError, mockFor } from "./service";

const Id = z.uuid();

function refresh(sessionId?: string) {
  revalidatePath("/practice/mock");
  if (sessionId) revalidatePath(`/practice/mock/sessions/${sessionId}`);
  revalidatePath("/today");
}

/** Runs a mock action for the signed-in user, turning MockError into a form error. */
async function run<T>(fn: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  const user = await requireUser();
  try {
    return ok(await fn(user.id));
  } catch (error) {
    if (error instanceof MockError) {
      return fail(error.message, error.field ? { [error.field]: [error.message] } : undefined);
    }
    throw error;
  }
}

function limited(key: string, rule: { limit: number; windowMs: number }): boolean {
  return !rateLimit(key, rule).ok;
}

export async function joinMockAction(input: unknown): Promise<ActionResult<undefined>> {
  const parsed = JoinMockInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the form", fieldErrorsFrom(parsed.error));
  return run(async (userId) => {
    const { agree: _agree, ...profile } = parsed.data;
    await mockFor(userId).join(profile);
    refresh();
    return undefined;
  });
}

export async function postSlotAction(input: unknown): Promise<ActionResult<{ slotId: string }>> {
  const parsed = PostSlotInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the form", fieldErrorsFrom(parsed.error));
  return run(async (userId) => {
    if (limited(`mock-post:${userId}`, RATE_LIMITS.mockPost)) {
      throw new MockError("You have posted a lot today. Try again tomorrow.");
    }
    const slot = await mockFor(userId).postSlot(parsed.data);
    refresh();
    return { slotId: slot.id };
  });
}

export async function cancelSlotAction(slotId: string): Promise<ActionResult<undefined>> {
  if (!Id.safeParse(slotId).success) return fail("Invalid slot");
  return run(async (userId) => {
    await mockFor(userId).cancelSlot(slotId);
    refresh();
    return undefined;
  });
}

export async function bookSlotAction(
  slotId: string,
  input: unknown,
): Promise<ActionResult<{ sessionId: string }>> {
  if (!Id.safeParse(slotId).success) return fail("Invalid slot");
  const parsed = BookSlotInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the form", fieldErrorsFrom(parsed.error));
  return run(async (userId) => {
    if (limited(`mock-book:${userId}`, RATE_LIMITS.mockBook)) {
      throw new MockError("You have booked a lot today. Try again tomorrow.");
    }
    const session = await mockFor(userId).bookSlot(slotId, parsed.data.topics);
    refresh(session.id);
    return { sessionId: session.id };
  });
}

export async function requestMatchAction(
  input: unknown,
): Promise<ActionResult<{ sessionId: string | null }>> {
  const parsed = MatchRequestInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the form", fieldErrorsFrom(parsed.error));
  return run(async (userId) => {
    if (limited(`mock-post:${userId}`, RATE_LIMITS.mockPost)) {
      throw new MockError("You have posted a lot today. Try again tomorrow.");
    }
    const { session } = await mockFor(userId).requestMatch(parsed.data);
    refresh(session?.id);
    return { sessionId: session?.id ?? null };
  });
}

export async function cancelRequestAction(requestId: string): Promise<ActionResult<undefined>> {
  if (!Id.safeParse(requestId).success) return fail("Invalid request");
  return run(async (userId) => {
    await mockFor(userId).cancelRequest(requestId);
    refresh();
    return undefined;
  });
}

export async function setMeetingLinkAction(
  sessionId: string,
  link: string,
): Promise<ActionResult<undefined>> {
  if (!Id.safeParse(sessionId).success) return fail("Invalid session");
  const parsed = HttpUrlSchema.nullable().safeParse(link.trim() === "" ? null : link.trim());
  if (!parsed.success)
    return fail("Paste a full link starting with https://", {
      link: ["Paste a full link starting with https://"],
    });
  return run(async (userId) => {
    if (limited(`mock-change:${userId}`, RATE_LIMITS.mockChange)) {
      throw new MockError("Too many changes. Try again later.");
    }
    await mockFor(userId).setMeetingLink(sessionId, parsed.data);
    refresh(sessionId);
    return undefined;
  });
}

export async function cancelSessionAction(
  sessionId: string,
): Promise<ActionResult<{ late: boolean }>> {
  if (!Id.safeParse(sessionId).success) return fail("Invalid session");
  return run(async (userId) => {
    if (limited(`mock-change:${userId}`, RATE_LIMITS.mockChange)) {
      throw new MockError("Too many changes. Try again later.");
    }
    const result = await mockFor(userId).cancelSession(sessionId);
    refresh(sessionId);
    return result;
  });
}

export async function reportNoShowAction(sessionId: string): Promise<ActionResult<undefined>> {
  if (!Id.safeParse(sessionId).success) return fail("Invalid session");
  return run(async (userId) => {
    await mockFor(userId).reportNoShow(sessionId);
    refresh(sessionId);
    return undefined;
  });
}

export async function swapQuestionAction(
  sessionId: string,
  questionId: string,
): Promise<ActionResult<undefined>> {
  if (!Id.safeParse(sessionId).success || !Id.safeParse(questionId).success) {
    return fail("Invalid question");
  }
  return run(async (userId) => {
    if (limited(`mock-change:${userId}`, RATE_LIMITS.mockChange)) {
      throw new MockError("Too many changes. Try again later.");
    }
    await mockFor(userId).swapPartnerQuestion(sessionId, questionId);
    refresh(sessionId);
    return undefined;
  });
}

export async function replaceQuestionAction(
  sessionId: string,
  oldId: string,
  newId: string,
): Promise<ActionResult<undefined>> {
  if (![sessionId, oldId, newId].every((id) => Id.safeParse(id).success)) {
    return fail("Invalid question");
  }
  return run(async (userId) => {
    if (limited(`mock-change:${userId}`, RATE_LIMITS.mockChange)) {
      throw new MockError("Too many changes. Try again later.");
    }
    await mockFor(userId).replacePartnerQuestion(sessionId, oldId, newId);
    refresh(sessionId);
    return undefined;
  });
}

export async function submitFeedbackAction(
  sessionId: string,
  input: unknown,
): Promise<ActionResult<undefined>> {
  if (!Id.safeParse(sessionId).success) return fail("Invalid session");
  const parsed = FeedbackInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the form", fieldErrorsFrom(parsed.error));
  return run(async (userId) => {
    await mockFor(userId).submitFeedback(sessionId, parsed.data);
    refresh(sessionId);
    return undefined;
  });
}

/** Reports the partner of a session (the partner's id is resolved on the server). */
export async function reportPartnerAction(
  sessionId: string,
  input: unknown,
): Promise<ActionResult<undefined>> {
  if (!Id.safeParse(sessionId).success) return fail("Invalid session");
  const parsed = ReportInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the form", fieldErrorsFrom(parsed.error));
  return run(async (userId) => {
    if (limited(`mock-report:${userId}`, RATE_LIMITS.mockReport)) {
      throw new MockError("You have sent a lot of reports today. Try again tomorrow.");
    }
    const mock = mockFor(userId);
    const view = await mock.session(sessionId);
    if (!view) throw new MockError("Session not found");
    await mock.report(view.partner.userId, parsed.data, sessionId);
    revalidatePath("/admin/moderation");
    return undefined;
  });
}

/** Blocks the partner of a session: you will never be matched or see their slots. */
export async function blockPartnerAction(sessionId: string): Promise<ActionResult<undefined>> {
  if (!Id.safeParse(sessionId).success) return fail("Invalid session");
  return run(async (userId) => {
    const mock = mockFor(userId);
    const view = await mock.session(sessionId);
    if (!view) throw new MockError("Session not found");
    await mock.block(view.partner.userId);
    refresh(sessionId);
    return undefined;
  });
}
