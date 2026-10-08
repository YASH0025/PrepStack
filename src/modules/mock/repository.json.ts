import "server-only";

import { type z } from "zod";

import { fieldCipher } from "@/lib/storage/field-cipher";
import { JsonCollection } from "@/lib/storage/json-collection";
import { type MockFile, mockPath } from "@/lib/storage/paths";
import { type BaseRecord } from "@/lib/storage/types";

import {
  type MatchRequest,
  MatchRequestSchema,
  type MockBlock,
  MockBlockSchema,
  type MockFeedback,
  MockFeedbackSchema,
  type MockProfile,
  MockProfileSchema,
  type MockReport,
  MockReportSchema,
  type MockSession,
  MockSessionSchema,
  type MockSlot,
  MockSlotSchema,
} from "./schemas";

/**
 * Shared mock interview store (data/mock/*.json or the same keys in Postgres).
 * Holds only what participants chose to share; feedback text is encrypted.
 */
export interface MockStore {
  profiles: JsonCollection<MockProfile>;
  slots: JsonCollection<MockSlot>;
  requests: JsonCollection<MatchRequest>;
  sessions: JsonCollection<MockSession>;
  feedback: JsonCollection<MockFeedback>;
  reports: JsonCollection<MockReport>;
  blocks: JsonCollection<MockBlock>;
}

function collection<T extends BaseRecord>(file: MockFile, schema: z.ZodType<T>, cipher?: string[]) {
  return new JsonCollection<T>({
    filePath: mockPath(file),
    recordSchema: schema,
    schemaVersion: 1,
    ...(cipher ? { cipher: fieldCipher(cipher) } : {}),
  });
}

let store: MockStore | null = null;

export function getMockStore(): MockStore {
  store ??= {
    profiles: collection("profiles.json", MockProfileSchema),
    slots: collection("slots.json", MockSlotSchema),
    requests: collection("requests.json", MatchRequestSchema),
    sessions: collection("sessions.json", MockSessionSchema),
    feedback: collection("feedback.json", MockFeedbackSchema, ["strengths", "improvements"]),
    reports: collection("reports.json", MockReportSchema, ["note"]),
    blocks: collection("blocks.json", MockBlockSchema),
  };
  return store;
}
