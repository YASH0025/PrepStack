import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

import { readStored, usingPostgres, writeStored } from "@/test/stored";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { activeLockCount, withFileLock } from "./file-lock";
import { JsonCollection } from "./json-collection";
import { JsonSingleton } from "./json-singleton";
import { contentPath, listPrivateUserIdsForSystemJobs, privatePath, privateUserDir } from "./paths";
import { ensureSeeded } from "./seed";
import { StorageValidationError, recordSchema } from "./types";

const root = process.env.DATA_DIR as string;
let counter = 0;
const tempFile = (name = "items") => path.join(root, "tests", `${name}-${++counter}.json`);

const ItemSchema = recordSchema({ name: z.string().min(1), count: z.number().int() });
type Item = z.infer<typeof ItemSchema>;

function makeCollection(filePath = tempFile()) {
  return new JsonCollection<Item>({ filePath, recordSchema: ItemSchema, schemaVersion: 1 });
}

describe("JsonCollection", () => {
  it("returns an empty list when the file does not exist", async () => {
    expect(await makeCollection().list()).toEqual([]);
  });

  it("creates records with id and timestamps, and persists them", async () => {
    const filePath = tempFile();
    const items = makeCollection(filePath);
    const created = await items.create({ name: "a", count: 1 });

    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.createdAt).toBe(created.updatedAt);

    const onDisk = JSON.parse(await readStored(filePath));
    expect(onDisk).toEqual({ schemaVersion: 1, records: [created] });
    expect(await makeCollection(filePath).getById(created.id)).toEqual(created);
  });

  it("updates only patch fields and keeps id/createdAt", async () => {
    const items = makeCollection();
    const created = await items.create({ name: "a", count: 1 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = await items.update(created.id, {
      count: 2,
      // Attempts to change base fields are ignored.
      ...({ id: "00000000-0000-4000-8000-000000000000" } as object),
    });

    expect(updated).toMatchObject({ id: created.id, name: "a", count: 2 });
    expect(updated?.createdAt).toBe(created.createdAt);
    expect(updated?.updatedAt).not.toBe(created.updatedAt);
  });

  it("returns null / false for unknown ids", async () => {
    const items = makeCollection();
    const unknown = "11111111-1111-4111-8111-111111111111";
    expect(await items.update(unknown, { count: 3 })).toBeNull();
    expect(await items.delete(unknown)).toBe(false);
  });

  it("deletes records", async () => {
    const items = makeCollection();
    const a = await items.create({ name: "a", count: 1 });
    await items.create({ name: "b", count: 2 });
    expect(await items.delete(a.id)).toBe(true);
    expect((await items.list()).map((item) => item.name)).toEqual(["b"]);
    expect(await items.deleteWhere((item) => item.count > 0)).toBe(1);
  });

  it("rejects invalid records and leaves the file untouched", async () => {
    const filePath = tempFile();
    const items = makeCollection(filePath);
    await items.create({ name: "ok", count: 1 });
    const before = await readStored(filePath);

    await expect(items.create({ name: "", count: 1 })).rejects.toBeInstanceOf(
      StorageValidationError,
    );
    await expect(items.create({ name: "x", count: 1.5 } as unknown as Item)).rejects.toBeInstanceOf(
      StorageValidationError,
    );

    expect(await readStored(filePath)).toBe(before);
  });

  it("rejects invalid data found on disk", async () => {
    const filePath = tempFile();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeStored(filePath, JSON.stringify({ schemaVersion: 1, records: [{ name: 1 }] }));
    await expect(makeCollection(filePath).list()).rejects.toBeInstanceOf(StorageValidationError);
  });

  // Raw text can only be corrupt in a file; Postgres stores JSONB.
  it.skipIf(usingPostgres)("rejects files that are not JSON", async () => {
    const filePath = tempFile();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeStored(filePath, "{not json");
    await expect(makeCollection(filePath).list()).rejects.toBeInstanceOf(StorageValidationError);
  });

  it("serializes concurrent writes without losing any", async () => {
    const items = makeCollection();
    await Promise.all(
      Array.from({ length: 50 }, (_, index) => items.create({ name: `n${index}`, count: index })),
    );
    expect(await items.list()).toHaveLength(50);
  });

  it("serializes concurrent read-modify-write updates", async () => {
    const items = makeCollection();
    const counterRecord = await items.create({ name: "counter", count: 0 });
    await Promise.all(
      Array.from({ length: 25 }, () =>
        items.transaction((records) => ({
          records: records.map((record) =>
            record.id === counterRecord.id ? { ...record, count: record.count + 1 } : record,
          ),
          result: null,
        })),
      ),
    );
    expect((await items.getById(counterRecord.id))?.count).toBe(25);
  });

  it.skipIf(usingPostgres)("leaves no temp files behind after writes", async () => {
    const filePath = tempFile("clean");
    const items = makeCollection(filePath);
    await items.create({ name: "a", count: 1 });
    const files = await readdir(path.dirname(filePath));
    expect(files.filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("rejects duplicate ids", async () => {
    const items = makeCollection();
    const id = "22222222-2222-4222-8222-222222222222";
    await items.create({ id, name: "a", count: 1 });
    await expect(items.create({ id, name: "b", count: 1 })).rejects.toBeInstanceOf(
      StorageValidationError,
    );
  });
});

describe("migrations", () => {
  const V2Schema = recordSchema({ name: z.string(), count: z.number(), tags: z.array(z.string()) });
  type V2 = z.infer<typeof V2Schema>;

  it("upgrades old files step by step and writes the upgrade back", async () => {
    const filePath = tempFile("migrate");
    const v1 = makeCollection(filePath);
    await v1.create({ name: "a", count: 1 });

    const v2 = new JsonCollection<V2>({
      filePath,
      recordSchema: V2Schema,
      schemaVersion: 2,
      migrations: {
        1: (envelope) => ({
          ...envelope,
          records: (envelope.records as object[]).map((record) => ({ ...record, tags: [] })),
        }),
      },
    });

    const [record] = await v2.list();
    expect(record?.tags).toEqual([]);
    const onDisk = JSON.parse(await readStored(filePath));
    expect(onDisk.schemaVersion).toBe(2);
  });

  it("refuses files from a newer schema version", async () => {
    const filePath = tempFile("future");
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeStored(filePath, JSON.stringify({ schemaVersion: 9, records: [] }));
    await expect(makeCollection(filePath).list()).rejects.toThrow(/version 9/);
  });

  it("fails clearly when a migration is missing", async () => {
    const filePath = tempFile("gap");
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeStored(filePath, JSON.stringify({ schemaVersion: 1, records: [] }));
    const v3 = new JsonCollection<Item>({ filePath, recordSchema: ItemSchema, schemaVersion: 3 });
    await expect(v3.list()).rejects.toThrow(/no migration from version 1/);
  });
});

describe("JsonSingleton", () => {
  const ProfileSchema = recordSchema({ name: z.string(), hours: z.number().positive() });
  type Profile = z.infer<typeof ProfileSchema>;
  const make = (filePath = tempFile("single")) =>
    new JsonSingleton<Profile>({ filePath, recordSchema: ProfileSchema, schemaVersion: 1 });

  it("returns null until set, then keeps id across sets", async () => {
    const single = make();
    expect(await single.get()).toBeNull();
    const first = await single.set({ name: "a", hours: 2 });
    const second = await single.set({ name: "b", hours: 3 });
    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
    expect(await single.get()).toMatchObject({ name: "b", hours: 3 });
  });

  it("updates, validates and clears", async () => {
    const single = make();
    expect(await single.update({ hours: 4 })).toBeNull();
    await single.set({ name: "a", hours: 2 });
    expect(await single.update({ hours: 4 })).toMatchObject({ name: "a", hours: 4 });
    await expect(single.update({ hours: -1 })).rejects.toBeInstanceOf(StorageValidationError);
    await single.clear();
    expect(await single.get()).toBeNull();
  });
});

describe("file lock", () => {
  it("runs holders one at a time and releases after errors", async () => {
    const order: string[] = [];
    const key = tempFile("lock");
    const slow = withFileLock(key, async () => {
      order.push("slow:start");
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push("slow:end");
      throw new Error("boom");
    });
    const fast = withFileLock(key, async () => {
      order.push("fast");
      return "ok";
    });
    await expect(slow).rejects.toThrow("boom");
    await expect(fast).resolves.toBe("ok");
    expect(order).toEqual(["slow:start", "slow:end", "fast"]);
    expect(activeLockCount()).toBe(0);
  });
});

describe("paths", () => {
  it("rejects user ids that are not UUIDs", () => {
    expect(() => privatePath("../etc", "profile.json")).toThrow(/Invalid user id/);
    expect(() => privateUserDir("abc")).toThrow(/Invalid user id/);
  });

  it("keeps private files inside the user's folder", () => {
    const id = "33333333-3333-4333-8333-333333333333";
    expect(privatePath(id, "rounds.json")).toBe(path.join(root, "private", id, "rounds.json"));
  });

  it("lists only UUID folders for system jobs", async () => {
    const id = "44444444-4444-4444-8444-444444444444";
    await writeStored(path.join(privateUserDir(id), "profile.json"), "{}");
    await writeStored(path.join(root, "private", "not-a-user", "x.json"), "{}");
    expect(await listPrivateUserIdsForSystemJobs()).toEqual([id]);
  });
});

describe("ensureSeeded", () => {
  it("writes missing files and never overwrites existing ones", async () => {
    const target = contentPath("tracks.json");
    const first = await ensureSeeded([{ target, envelope: { schemaVersion: 1, records: [] } }]);
    expect(first).toEqual([target]);

    await writeStored(target, JSON.stringify({ schemaVersion: 1, records: ["edited"] }));
    const second = await ensureSeeded([{ target, envelope: { schemaVersion: 1, records: [] } }]);
    expect(second).toEqual([]);
    expect(JSON.parse(await readStored(target)).records).toEqual(["edited"]);
  });
});
