import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { decryptOptional, encryptOptional } from "@/lib/services/crypto";
import { assessmentServiceFor } from "@/modules/assessment/service";
import { getContentService } from "@/modules/content/service";
import { publicScore } from "@/modules/mock/domain/score";
import { mockFor } from "@/modules/mock/service";
import { getProfile } from "@/modules/profile/service";
import { progressServiceFor } from "@/modules/progress/service";
import { reviewServiceFor } from "@/modules/review/service";
import { roadmapServiceFor } from "@/modules/roadmap/service";

import { buildPassport } from "./domain/build";
import { passportLinks, passportSettings, passportSnapshots } from "./repository.json";
import { type PassportData, type PassportSnapshot } from "./schemas";

/** Snapshots older than this are refreshed by the scheduler. */
export const PASSPORT_MAX_AGE_HOURS = 20;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * The owner's readiness passport. Reads only the owner's OWN data (resolved
 * from their authenticated id, or by the per-user scheduler), and publishes
 * a sanitized snapshot. The public page never reads private files.
 */
export class PassportService {
  constructor(private readonly userId: string) {}

  /** Fresh passport data from the owner's own records (not stored). */
  async compute(): Promise<PassportData | null> {
    const profile = await getProfile(this.userId);
    if (!profile) return null;
    const content = getContentService();
    const assessment = assessmentServiceFor(this.userId);
    const mock = mockFor(this.userId);
    const [
      settings,
      tracks,
      roles,
      topics,
      depths,
      history,
      completed,
      roadmap,
      review,
      mockProfile,
      score,
    ] = await Promise.all([
      passportSettings(this.userId).get(),
      content.tracks(),
      content.roles(profile.trackId),
      content.topics({ trackId: profile.trackId, publishedOnly: true }),
      assessment.latestDepths(profile.trackId),
      assessment.history(),
      progressServiceFor(this.userId).completedTopicIds(),
      roadmapServiceFor(this.userId).get(),
      reviewServiceFor(this.userId).stats(),
      mock.profile(),
      mock.score(),
    ]);
    const items = roadmap?.items ?? [];
    const visibleScore = mockProfile ? publicScore(score, mockProfile.showScore) : null;
    return buildPassport({
      displayName: settings?.displayName || profile.displayName || "PrepStack user",
      roleName: roles.find((role) => role.id === profile.targetRoleId)?.name ?? "Developer",
      trackName: tracks.find((track) => track.id === profile.trackId)?.name ?? "",
      band: profile.experienceBand,
      topics: topics.map((topic) => ({
        id: topic.id,
        category: topic.category,
        requiredDepth: topic.depthByBand[profile.experienceBand].depth,
        relevant: topic.roleImportance.some((entry) => entry.roleId === profile.targetRoleId),
      })),
      assessedDepth: depths,
      completedTopicIds: completed,
      plan: roadmap
        ? { done: items.filter((item) => item.status === "DONE").length, total: items.length }
        : null,
      review: {
        streakDays: review.streakDays,
        mastered: review.mastered,
        reviewedThisWeek: review.reviewedThisWeek,
      },
      lastDiagnostic: history[0] ? { completedAt: history[0].completedAt } : null,
      mock: visibleScore
        ? {
            sessions: visibleScore.sessions,
            overall: visibleScore.overall ?? 0,
            byArea: visibleScore.byArea,
          }
        : null,
    });
  }

  /** Link state for the owner, including the raw token so they can copy the URL. */
  async status(): Promise<{
    displayName: string;
    token: string | null;
    enabled: boolean;
    snapshot: PassportSnapshot | null;
  }> {
    const settings = await passportSettings(this.userId).get();
    const link = settings?.linkId ? await passportLinks().getById(settings.linkId) : null;
    const snapshot = link
      ? await passportSnapshots().findOne((item) => item.linkId === link.id)
      : null;
    return {
      displayName: settings?.displayName ?? "",
      token: link?.enabled ? decryptOptional(settings?.token) : null,
      enabled: Boolean(link?.enabled),
      snapshot,
    };
  }

  async setDisplayName(displayName: string): Promise<void> {
    const settings = passportSettings(this.userId);
    const current = await settings.get();
    await settings.set({
      displayName,
      linkId: current?.linkId ?? null,
      token: current?.token ?? null,
    });
    if (current?.linkId) await this.refresh();
  }

  /** Creates a new share link (revoking any previous one) and publishes a snapshot. */
  async createLink(): Promise<string> {
    await this.disable();
    const token = randomBytes(24).toString("base64url");
    const link = await passportLinks().create({
      userId: this.userId,
      tokenHash: hashToken(token),
      enabled: true,
    });
    const settings = passportSettings(this.userId);
    const current = await settings.get();
    await settings.set({
      displayName: current?.displayName ?? "",
      linkId: link.id,
      token: encryptOptional(token),
    });
    await this.refresh();
    return token;
  }

  /** Re-publishes the snapshot from current data. */
  async refresh(now: Date = new Date()): Promise<PassportSnapshot | null> {
    const settings = await passportSettings(this.userId).get();
    if (!settings?.linkId) return null;
    const link = await passportLinks().getById(settings.linkId);
    if (!link?.enabled || link.userId !== this.userId) return null;
    const data = await this.compute();
    if (!data) return null;
    const linkId = link.id;
    return passportSnapshots().transaction((records) => {
      const existing = records.find((item) => item.linkId === linkId);
      const snapshot: PassportSnapshot = {
        id: existing?.id ?? crypto.randomUUID(),
        createdAt: existing?.createdAt ?? now.toISOString(),
        updatedAt: now.toISOString(),
        linkId,
        data,
        generatedAt: now.toISOString(),
      };
      return {
        records: existing
          ? records.map((item) => (item.id === existing.id ? snapshot : item))
          : [...records, snapshot],
        result: snapshot,
      };
    });
  }

  /** Turns the link off and removes its public snapshot. */
  async disable(): Promise<void> {
    const settings = passportSettings(this.userId);
    const current = await settings.get();
    if (current?.linkId) {
      const linkId = current.linkId;
      await passportLinks().update(linkId, { enabled: false });
      await passportSnapshots().deleteWhere((item) => item.linkId === linkId);
      await settings.set({ displayName: current.displayName, linkId: null, token: null });
    }
  }

  /** Account deletion: remove every link and snapshot of this user. */
  async removeAll(): Promise<void> {
    const mine = await passportLinks().find((link) => link.userId === this.userId);
    const ids = new Set(mine.map((link) => link.id));
    await passportSnapshots().deleteWhere((item) => ids.has(item.linkId));
    await passportLinks().deleteWhere((link) => link.userId === this.userId);
  }

  /** Scheduler: refresh an enabled snapshot that is getting old. */
  async refreshIfStale(now: Date): Promise<boolean> {
    const status = await this.status();
    if (!status.enabled) return false;
    const age = status.snapshot
      ? now.getTime() - Date.parse(status.snapshot.generatedAt)
      : Infinity;
    if (age < PASSPORT_MAX_AGE_HOURS * 3_600_000) return false;
    await this.refresh(now);
    return true;
  }
}

export function passportFor(userId: string): PassportService {
  return new PassportService(userId);
}

/**
 * Public lookup by share token: returns ONLY the stored snapshot, never
 * anything from private storage.
 */
export async function publicPassport(token: string): Promise<PassportSnapshot | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const hash = hashToken(token);
  const link = await passportLinks().findOne((item) => item.tokenHash === hash && item.enabled);
  if (!link) return null;
  return passportSnapshots().findOne((item) => item.linkId === link.id);
}
