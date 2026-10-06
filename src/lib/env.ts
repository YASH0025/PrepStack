import "server-only";
import { z } from "zod";

/**
 * Server-side environment, validated once at startup (see src/instrumentation.ts).
 * New variables are added here as each build step needs them; the app refuses
 * to start if any value is missing or malformed.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Public base URL, used later for links in emails. */
  APP_URL: z.url().default("http://localhost:3000"),
  /** Root folder for JSON data files. Must be on a persistent disk. */
  DATA_DIR: z.string().min(1).default("./data"),
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
