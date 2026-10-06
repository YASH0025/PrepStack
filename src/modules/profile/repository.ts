import { type NewRecord, type RecordPatch } from "@/lib/storage/types";

import { type Profile } from "./schemas";

/** One profile per user (singleton in the user's private folder). */
export interface ProfileRepository {
  get(): Promise<Profile | null>;
  set(input: NewRecord<Profile>): Promise<Profile>;
  update(patch: RecordPatch<Profile>): Promise<Profile | null>;
}
