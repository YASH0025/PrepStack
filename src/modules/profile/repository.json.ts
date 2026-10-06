import "server-only";

import { JsonSingleton } from "@/lib/storage/json-singleton";
import { privatePath } from "@/lib/storage/paths";
import { type NewRecord, type RecordPatch } from "@/lib/storage/types";

import { type ProfileRepository } from "./repository";
import { type Profile, ProfileSchema } from "./schemas";

export class JsonProfileRepository implements ProfileRepository {
  private readonly file: JsonSingleton<Profile>;

  constructor(userId: string) {
    this.file = new JsonSingleton<Profile>({
      filePath: privatePath(userId, "profile.json"),
      recordSchema: ProfileSchema,
      schemaVersion: 1,
    });
  }

  get(): Promise<Profile | null> {
    return this.file.get();
  }

  set(input: NewRecord<Profile>): Promise<Profile> {
    return this.file.set(input);
  }

  update(patch: RecordPatch<Profile>): Promise<Profile | null> {
    return this.file.update(patch);
  }
}
