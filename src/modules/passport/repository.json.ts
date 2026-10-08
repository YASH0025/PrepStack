import "server-only";

import { JsonCollection } from "@/lib/storage/json-collection";
import { JsonSingleton } from "@/lib/storage/json-singleton";
import { passportPath, privatePath } from "@/lib/storage/paths";

import {
  type PassportLink,
  PassportLinkSchema,
  type PassportSettings,
  PassportSettingsSchema,
  type PassportSnapshot,
  PassportSnapshotSchema,
} from "./schemas";

let links: JsonCollection<PassportLink> | null = null;
let snapshots: JsonCollection<PassportSnapshot> | null = null;

/** Public index of share-link hashes (passport/links.json). */
export function passportLinks(): JsonCollection<PassportLink> {
  links ??= new JsonCollection<PassportLink>({
    filePath: passportPath("links.json"),
    recordSchema: PassportLinkSchema,
    schemaVersion: 1,
  });
  return links;
}

/** Public snapshots, one per link (passport/snapshots.json). */
export function passportSnapshots(): JsonCollection<PassportSnapshot> {
  snapshots ??= new JsonCollection<PassportSnapshot>({
    filePath: passportPath("snapshots.json"),
    recordSchema: PassportSnapshotSchema,
    schemaVersion: 1,
  });
  return snapshots;
}

/** The owner's private passport settings. */
export function passportSettings(userId: string): JsonSingleton<PassportSettings> {
  return new JsonSingleton<PassportSettings>({
    filePath: privatePath(userId, "passport.json"),
    recordSchema: PassportSettingsSchema,
    schemaVersion: 1,
  });
}
