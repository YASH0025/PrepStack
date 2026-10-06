import { type JsonCollection } from "./json-collection";
import { type BaseRecord, type NewRecord, type RecordPatch } from "./types";

/**
 * Storage-agnostic CRUD contract. Feature code depends on interfaces that
 * extend this; JSON implementations live in each module's `repository.json.ts`.
 * A Postgres implementation can later satisfy the same interfaces.
 */
export interface CrudRepository<T extends BaseRecord> {
  list(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(input: NewRecord<T>): Promise<T>;
  update(id: string, patch: RecordPatch<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

/** Base class for JSON-backed repositories: CRUD is delegated to a JsonCollection. */
export abstract class JsonRepository<T extends BaseRecord> implements CrudRepository<T> {
  protected constructor(protected readonly collection: JsonCollection<T>) {}

  list(): Promise<T[]> {
    return this.collection.list();
  }

  getById(id: string): Promise<T | null> {
    return this.collection.getById(id);
  }

  create(input: NewRecord<T>): Promise<T> {
    return this.collection.create(input);
  }

  update(id: string, patch: RecordPatch<T>): Promise<T | null> {
    return this.collection.update(id, patch);
  }

  delete(id: string): Promise<boolean> {
    return this.collection.delete(id);
  }
}
