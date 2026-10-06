import Link from "next/link";

import { KeyboardShortcuts } from "@/components/app-shell/keyboard-shortcuts";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { NotificationBell } from "@/components/app-shell/notification-bell";
import { SidebarNav } from "@/components/app-shell/sidebar-nav";
import { UserMenu } from "@/components/app-shell/user-menu";
import { ThemeToggle } from "@/components/theme";
import { requireUser } from "@/modules/auth/service";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r bg-sidebar px-3 py-4 md:flex print:hidden">
        <Link href="/today" className="px-2.5 text-base font-semibold tracking-tight">
          PrepStack
        </Link>
        <SidebarNav isAdmin={isAdmin} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur print:hidden">
          <MobileNav isAdmin={isAdmin} />
          <Link href="/today" className="font-semibold tracking-tight md:hidden">
            PrepStack
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell userId={user.id} />
            <ThemeToggle />
            <UserMenu email={user.email} />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
      <KeyboardShortcuts />
    </div>
  );
}
