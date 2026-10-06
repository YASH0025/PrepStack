import { createHash } from "node:crypto";

/**
 * Deterministic UUID (version 5 layout) from a stable name, so regenerating
 * the seed keeps every id identical and references never break.
 */
export function stableId(name) {
  const hash = createHash("sha1").update(`prepstack:${name}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const SEED_TIMESTAMP = "2026-10-01T00:00:00.000Z";

export function base(name) {
  return { id: stableId(name), createdAt: SEED_TIMESTAMP, updatedAt: SEED_TIMESTAMP };
}
