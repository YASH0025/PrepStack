import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { z } from "zod";

/**
 * Application-level field encryption (AES-256-GCM).
 *
 * Format: `enc:v1:<keyId>:<iv>:<ciphertext+authTag>` with base64url parts.
 * The key id lets us rotate keys later: decrypt picks the key by id.
 * Used for salaries, HR/recruiter/interviewer details, referrers and private notes.
 */
const PREFIX = "enc";
const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export const EncryptedStringSchema = z
  .string()
  .regex(/^enc:v1:[a-z0-9]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/, "must be an encrypted value");
export type EncryptedString = z.infer<typeof EncryptedStringSchema>;

export interface KeyRing {
  /** Key used for new encryptions. */
  currentKeyId: string;
  keys: Record<string, Buffer>;
}

export function keyRingFromBase64(base64Key: string, keyId = "k1"): KeyRing {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) throw new Error("Encryption key must be 32 bytes");
  return { currentKeyId: keyId, keys: { [keyId]: key } };
}

export function encryptWith(ring: KeyRing, plaintext: string): EncryptedString {
  const key = ring.keys[ring.currentKeyId];
  if (!key) throw new Error(`Unknown encryption key id ${ring.currentKeyId}`);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const payload = Buffer.concat([ciphertext, cipher.getAuthTag()]);
  return [
    PREFIX,
    VERSION,
    ring.currentKeyId,
    iv.toString("base64url"),
    payload.toString("base64url"),
  ].join(":");
}

/** Throws if the value was tampered with or was encrypted with an unknown key. */
export function decryptWith(ring: KeyRing, value: string): string {
  const parts = value.split(":");
  if (parts.length !== 5 || parts[0] !== PREFIX || parts[1] !== VERSION) {
    throw new Error("Not an encrypted value");
  }
  const [, , keyId, ivPart, payloadPart] = parts as [string, string, string, string, string];
  const key = ring.keys[keyId];
  if (!key) throw new Error(`Unknown encryption key id ${keyId}`);
  const iv = Buffer.from(ivPart, "base64url");
  const payload = Buffer.from(payloadPart, "base64url");
  if (iv.length !== IV_BYTES || payload.length < TAG_BYTES)
    throw new Error("Corrupt encrypted value");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(payload.subarray(payload.length - TAG_BYTES));
  const plaintext = Buffer.concat([
    decipher.update(payload.subarray(0, payload.length - TAG_BYTES)),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
