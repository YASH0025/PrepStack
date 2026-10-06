import { describe, expect, it } from "vitest";

import { EncryptedStringSchema, decryptWith, encryptWith, keyRingFromBase64 } from "./encryption";
import { decryptJson, decryptOptional, encryptJson, encryptOptional } from "./index";
import { z } from "zod";

const ring = keyRingFromBase64(Buffer.alloc(32, 7).toString("base64"));

describe("field encryption", () => {
  it("round-trips text including unicode", () => {
    const value = encryptWith(ring, "₹24 LPA · Priyá");
    expect(EncryptedStringSchema.safeParse(value).success).toBe(true);
    expect(value).not.toContain("24");
    expect(decryptWith(ring, value)).toBe("₹24 LPA · Priyá");
  });

  it("uses a fresh IV every time", () => {
    expect(encryptWith(ring, "same")).not.toBe(encryptWith(ring, "same"));
  });

  it("detects tampering", () => {
    const value = encryptWith(ring, "secret");
    const parts = value.split(":");
    const payload = Buffer.from(parts[4] as string, "base64url");
    payload[0] = (payload[0] ?? 0) ^ 1;
    parts[4] = payload.toString("base64url");
    expect(() => decryptWith(ring, parts.join(":"))).toThrow();
  });

  it("rejects unknown keys and wrong keys", () => {
    const value = encryptWith(ring, "secret");
    expect(() => decryptWith({ currentKeyId: "k2", keys: {} }, value)).toThrow(/Unknown/);
    const other = keyRingFromBase64(Buffer.alloc(32, 9).toString("base64"));
    expect(() => decryptWith(other, value)).toThrow();
  });

  it("rejects keys that are not 32 bytes", () => {
    expect(() => keyRingFromBase64(Buffer.alloc(16).toString("base64"))).toThrow();
  });

  it("env-backed helpers handle optional values and JSON", () => {
    expect(encryptOptional("  ")).toBeNull();
    expect(decryptOptional(null)).toBeNull();
    const encrypted = encryptOptional("note");
    expect(decryptOptional(encrypted)).toBe("note");
    const people = encryptJson({ hr: { name: "Asha" } });
    expect(decryptJson(people, z.object({ hr: z.object({ name: z.string() }) })).hr.name).toBe(
      "Asha",
    );
  });
});
