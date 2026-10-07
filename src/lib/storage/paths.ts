import "server-only";

import path from "node:path";

import { env } from "@/lib/env";

import { getStorageDriver } from "./driver";
import { IdSchema } from "./types";

/**
 * The ONLY place that maps logical storage locations to filesystem paths.
 * Feature code never builds paths; repositories call these helpers.
 */
export function dataRoot(): string {
  return path.resolve(env.DATA_DIR);
}

export type ContentFile =
  | "tracks.json"
  | "roles.json"
  | "competencies.json"
  | "topics.json"
  | "topic-prerequisites.json"
  | "questions.json"
  | "resources.json"
  | "behavioral-questions.json"
  | "interviewer-questions.json";

export type CommunityFile = "reports.json" | "votes.json" | "flags.json";

export type SystemFile = "users.json" | "audit-log.json";

export type PrivateFile =
  | "profile.json"
  | "assessments.json"
  | "roadmap.json"
  | "progress.json"
  | "saved-questions.json"
  | "custom-fields.json"
  | "applications.json"
  | "rounds.json"
  | "debriefs.json"
  | "stories.json"
  | "review-cards.json"
  | "notice-plan.json"
  | "revision-sheet-state.json"
  | "report-bookmarks.json"
  | "notifications.json";

export function contentPath(file: ContentFile): string {
  return path.join(dataRoot(), "content", file);
}

export function communityPath(file: CommunityFile): string {
  return path.join(dataRoot(), "community", file);
}

export function systemPath(file: SystemFile): string {
  return path.join(dataRoot(), "system", file);
}

/**
 * Path to a user's private file. The user id is validated as a UUID so it can
 * never contain path separators or "..". Services pass the AUTHENTICATED
 * user's id here, never a value taken from request input.
 */
export function privatePath(userId: string, file: PrivateFile): string {
  return path.join(privateUserDir(userId), file);
}

export function privateUserDir(userId: string): string {
  const parsed = IdSchema.safeParse(userId);
  if (!parsed.success) {
    throw new Error("Invalid user id for private storage");
  }
  return path.join(dataRoot(), "private", parsed.data);
}

/**
 * SYSTEM-ONLY: lists user ids that have a private folder. Used exclusively by
 * the scheduled-jobs runner, which has no authenticated user. Never call this
 * from a request handler.
 */
export async function listPrivateUserIdsForSystemJobs(): Promise<string[]> {
  const entries = await (await getStorageDriver()).listChildren(path.join(dataRoot(), "private"));
  return entries.filter((name) => IdSchema.safeParse(name).success).sort();
}

/** Deletes a user's entire private folder (account deletion). */
export async function deletePrivateUserDir(userId: string): Promise<void> {
  await (await getStorageDriver()).deleteTree(privateUserDir(userId));
}
