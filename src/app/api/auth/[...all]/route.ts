import { env } from "@/lib/env";

/**
 * Better Auth endpoints (OAuth callbacks, session refresh). Postgres mode only;
 * in JSON mode the built-in auth uses server actions and this route is a 404.
 */
async function handle(request: Request): Promise<Response> {
  if (env.STORAGE_DRIVER !== "postgres") return new Response("Not found", { status: 404 });
  const { getBetterAuth } = await import("@/modules/auth/better-auth");
  return getBetterAuth().handler(request);
}

export const GET = handle;
export const POST = handle;
