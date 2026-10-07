import { access, constants, mkdir } from "node:fs/promises";

import { dataRoot } from "@/lib/storage/paths";

export const dynamic = "force-dynamic";

/** Liveness/readiness for Docker and load balancers: the data folder must be writable. */
export async function GET() {
  try {
    await mkdir(dataRoot(), { recursive: true });
    await access(dataRoot(), constants.W_OK);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "data folder not writable" }, { status: 503 });
  }
}
