import { type CrudRepository } from "@/lib/storage/repository";

import { type Story } from "./schemas";

export type StoryRepository = CrudRepository<Story>;
