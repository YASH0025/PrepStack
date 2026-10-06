import "server-only";

import { type NotificationRepository } from "./repository";
import { JsonNotificationRepository } from "./repository.json";
import { type NewNotification, type Notification } from "./schemas";

const MAX_STORED = 200;

/**
 * In-app notifications for one user. Scheduled jobs (reminders, debrief prompts,
 * follow-ups) create notifications through this service; the UI lists them.
 */
export class NotificationService {
  constructor(private readonly repo: NotificationRepository) {}

  async list(): Promise<Notification[]> {
    const all = await this.repo.list();
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async unreadCount(): Promise<number> {
    const all = await this.repo.list();
    return all.filter((notification) => !notification.readAt).length;
  }

  /** Idempotent: a second call with the same dedupeKey does nothing. */
  async notify(input: NewNotification): Promise<Notification | null> {
    const created = await this.repo.createIfNew(input);
    if (created) await this.repo.prune(MAX_STORED);
    return created;
  }

  markRead(id: string, now = new Date()): Promise<Notification | null> {
    return this.repo.markRead(id, now);
  }

  markAllRead(now = new Date()): Promise<number> {
    return this.repo.markAllRead(now);
  }
}

/** Always scoped to one user's private folder. Pass the authenticated user's id. */
export function notificationsFor(userId: string): NotificationService {
  return new NotificationService(new JsonNotificationRepository(userId));
}
