/**
 * Per-file async mutex. All read-modify-write cycles on a file run through
 * `withFileLock(path, fn)`, so two concurrent requests can never interleave
 * and lose each other's writes.
 *
 * This lock is in-process only: the app must run as a single Node process
 * while data lives in JSON files (see README).
 */
const tails = new Map<string, Promise<unknown>>();

export async function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const previous = tails.get(filePath) ?? Promise.resolve();

  // Chain after the previous holder, whether it succeeded or failed.
  const run = previous.then(fn, fn);

  // The next waiter must wait for us, but must not inherit our rejection.
  const tail = run.catch(() => undefined);
  tails.set(filePath, tail);

  try {
    return await run;
  } finally {
    // Drop the entry once nobody is queued behind us, so the map does not grow forever.
    if (tails.get(filePath) === tail) {
      tails.delete(filePath);
    }
  }
}

/** Number of files with an active or queued lock. For tests and diagnostics. */
export function activeLockCount(): number {
  return tails.size;
}
