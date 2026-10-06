import { type CrudRepository } from "@/lib/storage/repository";

import { type User } from "./schemas";

export interface UserRepository extends CrudRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByResetTokenHash(hash: string): Promise<User | null>;
}
