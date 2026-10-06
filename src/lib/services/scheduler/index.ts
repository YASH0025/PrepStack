/**
 * Scheduled work. In the JSON phase a secured route (POST /api/cron/run),
 * triggered by `npm run cron` or an OS scheduler, calls `runScheduledJobs`.
 * Later this can move to a managed scheduler (e.g. EventBridge) without
 * changing the jobs themselves.
 */
export interface JobContext {
  now: Date;
  userId: string;
}

export interface ScheduledJob {
  name: string;
  /** Processes one user. Returns how many items were handled. Must be idempotent. */
  run(context: JobContext): Promise<number>;
}

export interface JobRunSummary {
  startedAt: string;
  users: number;
  results: Record<string, { handled: number; failures: number }>;
}

export interface JobScheduler {
  runDue(now: Date): Promise<JobRunSummary>;
}

/**
 * Runs every job for every user. A failure for one user/job is counted and
 * logged but never stops the rest of the run.
 */
export async function runScheduledJobs(
  jobs: ScheduledJob[],
  userIds: string[],
  now: Date,
  log: (message: string) => void = console.error,
): Promise<JobRunSummary> {
  const summary: JobRunSummary = {
    startedAt: now.toISOString(),
    users: userIds.length,
    results: {},
  };
  for (const job of jobs) summary.results[job.name] = { handled: 0, failures: 0 };

  for (const userId of userIds) {
    for (const job of jobs) {
      const result = summary.results[job.name] as { handled: number; failures: number };
      try {
        result.handled += await job.run({ now, userId });
      } catch (error) {
        result.failures += 1;
        log(`[cron] job=${job.name} user=${userId} failed: ${(error as Error).message}`);
      }
    }
  }
  return summary;
}
