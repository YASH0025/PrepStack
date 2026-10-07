import { z } from "zod";

import { getStorageService } from "@/lib/services/file-storage";
import { getUserForApi } from "@/modules/auth/service";
import { trackerFor } from "@/modules/tracker/service";

/**
 * GET /api/attachments/:roundId/:attachmentId
 * Redirects the owner to a short-lived signed download URL. The round is
 * looked up in the signed-in user's own tracker, so other users' files are
 * unreachable even with a guessed id.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/attachments/[roundId]/[attachmentId]">,
) {
  const user = await getUserForApi();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const parsed = z.object({ roundId: z.uuid(), attachmentId: z.uuid() }).safeParse(await params);
  if (!parsed.success) return new Response("Not found", { status: 404 });

  const round = await trackerFor(user.id).getRound(parsed.data.roundId);
  const attachment = round?.attachments.find((item) => item.id === parsed.data.attachmentId);
  if (!attachment) return new Response("Not found", { status: 404 });

  const storage = getStorageService();
  if (!storage.enabled) return new Response("File storage is not configured", { status: 503 });
  const url = await storage.getDownloadUrl(attachment.storageKey, 120);
  return Response.redirect(url, 302);
}
