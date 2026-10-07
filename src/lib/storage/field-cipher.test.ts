import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { privatePath } from "./paths";
import { fieldCipher } from "./field-cipher";
import { JsonCollection } from "./json-collection";
import { recordSchema } from "./types";

const Schema = recordSchema({
  title: z.string(),
  empty: z.string(),
  questions: z.array(z.object({ text: z.string(), notes: z.string().nullable() })),
  plain: z.number(),
});
type Rec = z.infer<typeof Schema>;

describe("fieldCipher", () => {
  it("encrypts named fields (including inside arrays) and leaves the rest", () => {
    const cipher = fieldCipher(["title", "empty", "questions[].notes"]);
    const [encoded] = cipher.encodeRecords([
      {
        title: "Asha",
        empty: "",
        questions: [
          { text: "q", notes: "secret" },
          { text: "r", notes: null },
        ],
        plain: 1,
      },
    ]) as Rec[];
    expect(encoded?.title).toMatch(/^enc:v1:/);
    expect(encoded?.empty).toBe("");
    expect(encoded?.questions[0]?.notes).toMatch(/^enc:v1:/);
    expect(encoded?.questions[0]?.text).toBe("q");
    expect(encoded?.questions[1]?.notes).toBeNull();
    const [decoded] = cipher.decodeRecords([encoded]) as Rec[];
    expect(decoded?.title).toBe("Asha");
    expect(decoded?.questions[0]?.notes).toBe("secret");
    // Encoding twice never double-encrypts; legacy plain text decodes as itself.
    expect(cipher.encodeRecords([encoded])[0]).toEqual(encoded);
    expect((cipher.decodeRecords([{ title: "plain" }])[0] as Rec).title).toBe("plain");
  });

  it("stores ciphertext on disk and upgrades legacy plain-text files", async () => {
    const filePath = privatePath("11111111-2222-4333-8444-555555555555", "stories.json");
    await mkdir(path.dirname(filePath), { recursive: true });
    const now = new Date().toISOString();
    await writeFile(
      filePath,
      JSON.stringify({
        schemaVersion: 1,
        records: [
          {
            id: "a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1",
            createdAt: now,
            updatedAt: now,
            title: "Fight with Ravi",
            empty: "",
            questions: [],
            plain: 2,
          },
        ],
      }),
    );
    const collection = new JsonCollection<Rec>({
      filePath,
      recordSchema: Schema,
      schemaVersion: 2,
      migrations: { 1: (envelope) => envelope },
      cipher: fieldCipher(["title"]),
    });
    expect((await collection.list())[0]?.title).toBe("Fight with Ravi");
    expect(await readFile(filePath, "utf8")).not.toContain("Ravi");
    await collection.create({ title: "New secret", empty: "", questions: [], plain: 3 });
    const disk = await readFile(filePath, "utf8");
    expect(disk).not.toContain("New secret");
    expect((await collection.list()).map((record) => record.title)).toEqual([
      "Fight with Ravi",
      "New secret",
    ]);
  });
});
