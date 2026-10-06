import "server-only";

import { JsonCollection } from "@/lib/storage/json-collection";
import { systemPath } from "@/lib/storage/paths";
import { JsonRepository } from "@/lib/storage/repository";
import { type NewRecord } from "@/lib/storage/types";

import { type UserRepository } from "./repository";
import { type User, UserSchema } from "./schemas";

export class JsonUserRepository extends JsonRepository<User> implements UserRepository {
  constructor() {
    super(
      new JsonCollection<User>({
        filePath: systemPath("users.json"),
        recordSchema: UserSchema,
        schemaVersion: 1,
      }),
    );
  }

  findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    return this.collection.findOne((user) => user.email === normalized);
  }

  findByResetTokenHash(hash: string): Promise<User | null> {
    return this.collection.findOne((user) => user.resetTokenHash === hash);
  }

  /** Enforces unique email inside the file lock, so concurrent signups cannot both succeed. */
  override create(input: NewRecord<User>): Promise<User> {
    return this.collection.transaction(async (users) => {
      if (users.some((user) => user.email === input.email)) {
        throw new EmailTakenError();
      }
      const now = new Date().toISOString();
      const user = UserSchema.parse({
        ...input,
        id: input.id ?? crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      });
      return { records: [...users, user], result: user };
    });
  }
}

export class EmailTakenError extends Error {
  constructor() {
    super("Email already registered");
    this.name = "EmailTakenError";
  }
}
