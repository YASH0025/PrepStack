import "server-only";

import { access, constants, mkdir, readdir, rm } from "node:fs/promises";

import { type StorageDriver } from "../driver";
import { withFileLock } from "../file-lock";
import { readJsonRaw, writeJsonAtomic } from "../json-file";
import { dataRoot } from "../paths";

/** JSON files on disk with atomic writes and an in-process lock (single Node process). */
export class JsonFileDriver implements StorageDriver {
  readonly name = "json" as const;

  read(location: string): Promise<unknown> {
    return readJsonRaw(location);
  }

  write(location: string, data: unknown): Promise<void> {
    return writeJsonAtomic(location, data);
  }

  async exists(location: string): Promise<boolean> {
    try {
      await access(location);
      return true;
    } catch {
      return false;
    }
  }

  withLock<T>(location: string, fn: () => Promise<T>): Promise<T> {
    return withFileLock(location, fn);
  }

  async deleteTree(folder: string): Promise<void> {
    await rm(folder, { recursive: true, force: true });
  }

  async listChildren(folder: string): Promise<string[]> {
    try {
      return await readdir(folder);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async health(): Promise<boolean> {
    try {
      await mkdir(dataRoot(), { recursive: true });
      await access(dataRoot(), constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }
}
