import { randomUUID } from "node:crypto";

import { z } from "zod";

import { getStorageService, validateUpload } from "@/lib/services/file-storage";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { getUserForApi } from "@/modules/auth/service";
import { TrackerError, trackerFor } from "@/modules/tracker/service";

const FieldsSchema = z.object({ roundId: z.uuid() });

/**
 * POST /api/uploads (multipart: file, roundId)
 * Uploads a private attachment (JD PDF, assignment) for one of the user's rounds.
 */
export async function POST(request: Request) {
  const user = await getUserForApi();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limit = rateLimit(`upload:${user.id}`, RATE_LIMITS.upload);
  if (!limit.ok)
    return Response.json({ error: "Too many uploads. Try again later." }, { status: 429 });

  const storage = getStorageService();
  if (!storage.enabled) {
    return Response.json(
      { error: "File uploads are not configured on this server." },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const fields = FieldsSchema.safeParse({ roundId: form.get("roundId") });
  const file = form.get("file");
  if (!fields.success || !(file instanceof File)) {
    return Response.json({ error: "Choose a file to upload." }, { status: 400 });
  }

  const tracker = trackerFor(user.id);
  const round = await tracker.getRound(fields.data.roundId);
  if (!round) return Response.json({ error: "Round not found" }, { status: 404 });

  const data = Buffer.from(await file.arrayBuffer());
  const problem = validateUpload({ data, mimeType: file.type, kind: "attachment" });
  if (problem) return Response.json({ error: problem }, { status: 400 });

  let storageKey: string | null = null;
  try {
    const stored = await storage.upload({
      data,
      fileName: file.name,
      mimeType: file.type,
      kind: "attachment",
      ownerId: user.id,
    });
    storageKey = stored.storageKey;
    await tracker.addAttachment(round.id, {
      id: randomUUID(),
      storageKey: stored.storageKey,
      fileName: file.name.slice(0, 200),
      mimeType: stored.mimeType,
      bytes: stored.bytes,
      uploadedAt: new Date().toISOString(),
    });
    return Response.json({ ok: true });
  } catch (error) {
    // Never leave an uploaded file behind that no round points at.
    if (storageKey) await storage.delete(storageKey).catch(() => undefined);
    if (error instanceof TrackerError)
      return Response.json({ error: error.message }, { status: 400 });
    console.error("[uploads] upload failed", error);
    return Response.json({ error: "Upload failed. Try again." }, { status: 502 });
  }
}
