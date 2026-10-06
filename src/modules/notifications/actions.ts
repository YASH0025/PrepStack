"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/modules/auth/service";

import { notificationsFor } from "./service";

export async function markNotificationReadAction(id: string): Promise<void> {
  const user = await requireUser();
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return;
  await notificationsFor(user.id).markRead(parsed.data);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  await notificationsFor(user.id).markAllRead();
  revalidatePath("/", "layout");
}
