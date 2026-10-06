import { type NewRecord } from "@/lib/storage/types";

import { type Roadmap } from "./schemas";

export interface RoadmapRepository {
  get(): Promise<Roadmap | null>;
  set(input: NewRecord<Roadmap>): Promise<Roadmap>;
  /** Read-modify-write under the file lock. */
  mutate(fn: (current: Roadmap | null) => Roadmap | null): Promise<Roadmap | null>;
}
