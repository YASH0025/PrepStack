import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { runScheduledJobs } from "@/lib/services/scheduler";
import { listPrivateUserIdsForSystemJobs } from "@/lib/storage/paths";
import { interviewJobDeps } from "@/modules/tracker/job-deps";
import { interviewJobs } from "@/modules/tracker/jobs";

/**
 * POST /api/cron/run
 * Processes due reminders (emails + in-app), debrief prompts, follow-ups and
 * conflict warnings for every user. Protected by `Authorization: Bearer
 * <CRON_SECRET>`. Triggered by `npm run cron` or an OS scheduler.
 */
export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const userIds = await listPrivateUserIdsForSystemJobs();
  const summary = await runScheduledJobs(interviewJobs(interviewJobDeps()), userIds, now);
  return Response.json(summary);
}

function authorized(header: string | null): boolean {
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const actual = Buffer.from(header ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
