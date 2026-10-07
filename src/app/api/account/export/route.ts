import { NextResponse } from "next/server";

import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { buildAccountExport } from "@/modules/account/service";
import { getUserForApi } from "@/modules/auth/service";

export const dynamic = "force-dynamic";

/** Downloads everything stored about the signed-in user as JSON. */
export async function GET() {
  const user = await getUserForApi();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (!rateLimit(`export:${user.id}`, RATE_LIMITS.export).ok) {
    return NextResponse.json({ error: "Too many exports. Try again later." }, { status: 429 });
  }
  const data = await buildAccountExport(user.id);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="prepstack-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
