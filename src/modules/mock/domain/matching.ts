/**
 * Automatic partner matching (PURE). Pairs open "find me a partner" requests
 * for the same role, within one experience band, at a start time both
 * proposed, when neither has blocked the other or is busy then.
 */
import { type ExperienceBand } from "@/lib/domain";

import { bandsCompatible, startsSoonEnough } from "./rules";

export interface MatchCandidate {
  id: string;
  userId: string;
  roleId: string;
  band: ExperienceBand;
  startTimes: string[];
  createdAt: string;
}

export interface MatchContext {
  now: Date;
  isBlocked: (a: string, b: string) => boolean;
  isBusy: (userId: string, startUtc: string) => boolean;
}

export interface Match {
  a: MatchCandidate;
  b: MatchCandidate;
  startUtc: string;
}

/** Oldest requests are served first; each request is used at most once. */
export function findMatches(requests: MatchCandidate[], context: MatchContext): Match[] {
  const queue = [...requests].sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  const used = new Set<string>();
  const booked: { userId: string; startUtc: string }[] = [];
  const busy = (userId: string, startUtc: string) =>
    context.isBusy(userId, startUtc) ||
    booked.some((entry) => entry.userId === userId && entry.startUtc === startUtc);

  const matches: Match[] = [];
  for (const a of queue) {
    if (used.has(a.id)) continue;
    let best: Match | null = null;
    for (const b of queue) {
      if (b.id === a.id || used.has(b.id) || b.userId === a.userId) continue;
      if (b.roleId !== a.roleId || !bandsCompatible(a.band, b.band)) continue;
      if (context.isBlocked(a.userId, b.userId) || context.isBlocked(b.userId, a.userId)) continue;
      const common = a.startTimes
        .filter((time) => b.startTimes.includes(time))
        .filter((time) => startsSoonEnough(time, context.now))
        .filter((time) => !busy(a.userId, time) && !busy(b.userId, time))
        .sort();
      const startUtc = common[0];
      if (!startUtc) continue;
      if (!best || startUtc < best.startUtc) best = { a, b, startUtc };
    }
    if (best) {
      used.add(best.a.id);
      used.add(best.b.id);
      booked.push({ userId: best.a.userId, startUtc: best.startUtc });
      booked.push({ userId: best.b.userId, startUtc: best.startUtc });
      matches.push(best);
    }
  }
  return matches;
}
