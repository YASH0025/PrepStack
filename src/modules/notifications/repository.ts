import { type CrudRepository } from "@/lib/storage/repository";

import { type NewNotification, type Notification } from "./schemas";

export interface NotificationRepository extends CrudRepository<Notification> {
  /** Creates the notification unless one with the same dedupeKey exists. Returns null if skipped. */
  createIfNew(input: NewNotification): Promise<Notification | null>;
  markRead(id: string, at: Date): Promise<Notification | null>;
  markAllRead(at: Date): Promise<number>;
  /** Keeps the newest `keep` notifications and deletes older read ones. */
  prune(keep: number): Promise<number>;
}
