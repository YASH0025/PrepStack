import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { notificationsFor } from "@/modules/notifications/service";

export async function NotificationBell({ userId }: { userId: string }) {
  const unread = await notificationsFor(userId).unreadCount();
  const label = unread ? `Notifications, ${unread} unread` : "Notifications";
  return (
    <Button asChild variant="ghost" size="icon-sm" className="relative">
      <Link href="/notifications" aria-label={label}>
        <Bell />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
