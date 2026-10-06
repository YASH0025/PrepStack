"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { ADMIN_NAV, NAV_GROUPS, type NavItem, isActive } from "./nav-config";

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

export function SidebarNav({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-4">
      {NAV_GROUPS.map((group, index) => (
        <div key={group.label || index} className="flex flex-col gap-0.5">
          {group.label && (
            <p className="px-2.5 pb-1 text-xs font-medium tracking-wide text-muted-foreground/80 uppercase">
              {group.label}
            </p>
          )}
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
      {isAdmin && (
        <div className="flex flex-col gap-0.5 border-t pt-3">
          <NavLink item={ADMIN_NAV} onNavigate={onNavigate} />
        </div>
      )}
    </nav>
  );
}
