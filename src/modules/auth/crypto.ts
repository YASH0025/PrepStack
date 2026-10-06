import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

import { RoleSchema } from "./schemas";

const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHash: Promise<string> | null = null;

/**
 * Burns the same time as a real comparison when the email does not exist,
 * so login timing does not reveal which emails are registered.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= bcrypt.hash(randomBytes(16).toString("hex"), BCRYPT_COST);
  await bcrypt.compare(password, await dummyHash);
  return false;
}

/** Random URL-safe token for password reset links. */
export function createResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/* Session tokens --------------------------------------------------------------- */

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const SessionPayloadSchema = z.object({
  sub: z.uuid(),
  role: RoleSchema,
  sv: z.number().int().nonnegative(),
});
export type SessionPayload = z.infer<typeof SessionPayloadSchema>;

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  payload: SessionPayload,
  secret: string,
  now: Date = new Date(),
): Promise<string> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({ role: payload.role, sv: payload.sv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_TTL_SECONDS)
    .sign(key(secret));
}

/** Returns the payload, or null for any invalid, expired or tampered token. */
export async function verifySessionToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      algorithms: ["HS256"],
      currentDate: now,
    });
    const parsed = SessionPayloadSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
