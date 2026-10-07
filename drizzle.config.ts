import { defineConfig } from "drizzle-kit";

/** `npx drizzle-kit generate` writes SQL migrations to ./drizzle (committed). */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://localhost/prepstack" },
});
