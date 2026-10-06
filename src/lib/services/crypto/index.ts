import "server-only";

import { type z } from "zod";

import { env } from "@/lib/env";

import {
  type EncryptedString,
  type KeyRing,
  decryptWith,
  encryptWith,
  keyRingFromBase64,
} from "./encryption";

export { EncryptedStringSchema, type EncryptedString } from "./encryption";

let ring: KeyRing | null = null;

function keyRing(): KeyRing {
  ring ??= keyRingFromBase64(env.ENCRYPTION_KEY);
  return ring;
}

export function encrypt(plaintext: string): EncryptedString {
  return encryptWith(keyRing(), plaintext);
}

export function decrypt(value: EncryptedString): string {
  return decryptWith(keyRing(), value);
}

/** Encrypts non-empty strings; empty/blank/undefined becomes null. */
export function encryptOptional(value: string | null | undefined): EncryptedString | null {
  if (value === null || value === undefined || value.trim() === "") return null;
  return encrypt(value);
}

export function decryptOptional(value: EncryptedString | null | undefined): string | null {
  return value ? decrypt(value) : null;
}

/** Encrypts a JSON-serialisable value (e.g. a people object). */
export function encryptJson(value: unknown): EncryptedString {
  return encrypt(JSON.stringify(value));
}

/** Decrypts and validates JSON. Throws if the content does not match the schema. */
export function decryptJson<T>(value: EncryptedString, schema: z.ZodType<T>): T {
  return schema.parse(JSON.parse(decrypt(value)));
}
