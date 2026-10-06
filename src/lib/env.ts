import "server-only";
import { z } from "zod";

/** Treats empty strings (common in .env files) as "not set". */
const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const base64Key32 = z.string().refine((value) => {
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}, "must be 32 random bytes encoded as base64 (openssl rand -base64 32)");

/**
 * Server-side environment, validated once at startup (see src/instrumentation.ts).
 * The app refuses to start if any value is missing or malformed.
 */
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    /** Public base URL, used for links in emails. */
    APP_URL: z.url().default("http://localhost:3000"),
    /** Root folder for JSON data files. Must be on a persistent disk. */
    DATA_DIR: z.string().min(1).default("./data"),

    /** Signs session cookies (JWT, HS256). */
    SESSION_SECRET: z.string().min(32, "must be at least 32 characters"),
    /** AES-256-GCM key for sensitive fields (salaries, contacts, notes). */
    ENCRYPTION_KEY: base64Key32,
    /** Shared secret for POST /api/cron/run. */
    CRON_SECRET: z.string().min(16, "must be at least 16 characters"),
    /** Comma-separated emails that become admins when they sign up. */
    ADMIN_EMAILS: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),

    /** Resend API key. When unset, emails are printed to the server console instead. */
    RESEND_API_KEY: optionalString,
    EMAIL_FROM: z.string().min(3).default("PrepStack <onboarding@resend.dev>"),

    /** Cloudinary credentials. When unset, file uploads are disabled. */
    CLOUDINARY_CLOUD_NAME: optionalString,
    CLOUDINARY_API_KEY: optionalString,
    CLOUDINARY_API_SECRET: optionalString,

    /** Minimum number of community reports before aggregates are shown or used. */
    COMMUNITY_MIN_SAMPLE: z.coerce.number().int().min(1).default(5),
  })
  .superRefine((value, ctx) => {
    const cloudinary = [
      value.CLOUDINARY_CLOUD_NAME,
      value.CLOUDINARY_API_KEY,
      value.CLOUDINARY_API_SECRET,
    ];
    const set = cloudinary.filter(Boolean).length;
    if (set !== 0 && set !== 3) {
      ctx.addIssue({
        code: "custom",
        path: ["CLOUDINARY_CLOUD_NAME"],
        message: "set all three CLOUDINARY_* variables, or none of them",
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
