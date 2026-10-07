import { getStorageDriver } from "@/lib/storage/driver";

export const dynamic = "force-dynamic";

/** Liveness/readiness for Docker and load balancers: storage must be reachable and writable. */
export async function GET() {
  const driver = await getStorageDriver();
  const ok = await driver.health();
  return Response.json(
    ok ? { ok, storage: driver.name } : { ok, storage: driver.name, error: "storage unavailable" },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
