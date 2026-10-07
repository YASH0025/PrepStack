import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Info,
  MessageSquareText,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { EmptyState, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireUser } from "@/modules/auth/service";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/modules/notifications/actions";
import { type NotificationType } from "@/modules/notifications/schemas";
import { notificationsFor } from "@/modules/notifications/service";

export const metadata: Metadata = { title: "Notifications" };

const ICONS: Record<NotificationType, typeof Bell> = {
  INTERVIEW_REMINDER: CalendarClock,
  REVISION_SHEET_READY: FileText,
  DEBRIEF_PROMPT: MessageSquareText,
  FOLLOW_UP_DUE: ClipboardCheck,
  REPORT_MODERATED: Info,
  MOCK_INTERVIEW: Users,
  SYSTEM: Bell,
};

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const notifications = await notificationsFor(user.id).list();
  const unread = notifications.filter((notification) => !notification.readAt).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Reminders, debrief prompts and follow-ups. Only reminders and password resets are ever emailed."
        actions={
          unread > 0 && (
            <form action={markAllNotificationsReadAction}>
              <Button variant="outline" size="sm" type="submit">
                Mark all as read
              </Button>
            </form>
          )
        }
      />
      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Add an interview to your tracker and you will get reminders before it and a debrief prompt after it."
          action={
            <Button asChild>
              <Link href="/interviews/tracker?new=1">Add an interview</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y rounded-xl border">
          {notifications.map((notification) => {
            const Icon = ICONS[notification.type];
            const markRead = markNotificationReadAction.bind(null, notification.id);
            return (
              <li
                key={notification.id}
                className={cn("flex items-start gap-3 p-4", !notification.readAt && "bg-primary/5")}
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <Link href={notification.href} className="font-medium hover:underline">
                    {notification.title}
                  </Link>
                  {notification.body && (
                    <p className="text-sm text-muted-foreground">{notification.body}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    {!notification.readAt && <span className="sr-only">, unread</span>}
                  </p>
                </div>
                {!notification.readAt && (
                  <form action={markRead}>
                    <Button type="submit" variant="ghost" size="sm">
                      Mark read
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
