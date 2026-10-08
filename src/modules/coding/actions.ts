"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { type ActionResult, fail, ok } from "@/lib/forms";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/modules/auth/service";

import { SubmissionInputSchema } from "./schemas";
import { CodingError, codingFor } from "./service";

export async function recordSubmissionAction(
  input: unknown,
): Promise<ActionResult<{ solved: boolean; firstSolve: boolean }>> {
  const user = await requireUser();
  const parsed = SubmissionInputSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid submission");
  if (!(await rateLimit(`coding:${user.id}`, RATE_LIMITS.codingSubmit)).ok) {
    return fail("Too many submissions. Try again later.");
  }
  try {
    const service = codingFor(user.id);
    const before = await service.progressFor(parsed.data.slug);
    const record = await service.recordSubmission(parsed.data);
    revalidatePath("/practice/coding");
    return ok({
      solved: record.status === "SOLVED",
      firstSolve: record.status === "SOLVED" && before?.status !== "SOLVED",
    });
  } catch (error) {
    if (error instanceof CodingError) return fail(error.message);
    throw error;
  }
}

export async function setDesignDoneAction(
  problemId: unknown,
  done: unknown,
): Promise<ActionResult<{ done: boolean }>> {
  const user = await requireUser();
  const parsed = z.object({ problemId: z.string().min(1).max(80), done: z.boolean() }).safeParse({
    problemId,
    done,
  });
  if (!parsed.success) return fail("Invalid request");
  if (!(await rateLimit(`coding:${user.id}`, RATE_LIMITS.codingSubmit)).ok) {
    return fail("Too many changes. Try again later.");
  }
  try {
    const result = await codingFor(user.id).setDesignDone(parsed.data.problemId, parsed.data.done);
    revalidatePath("/practice/system-design");
    return ok({ done: result });
  } catch (error) {
    if (error instanceof CodingError) return fail(error.message);
    throw error;
  }
}
