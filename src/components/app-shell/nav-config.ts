import {
  BookOpen,
  Brain,
  CalendarDays,
  ClipboardList,
  Code2,
  Compass,
  Hourglass,
  LayoutDashboard,
  type LucideIcon,
  MessagesSquare,
  Network,
  Route,
  Shield,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Main navigation, in the order defined by the product brief. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    items: [
      { href: "/today", label: "Today", icon: LayoutDashboard },
      { href: "/roadmap", label: "My Roadmap", icon: Route },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/practice/topics", label: "Topics", icon: BookOpen },
      { href: "/practice/coding", label: "Coding", icon: Code2 },
      { href: "/practice/system-design", label: "System design", icon: Network },
      { href: "/practice/review", label: "Review", icon: Brain },
      { href: "/practice/stories", label: "Story bank", icon: Sparkles },
      { href: "/practice/mock", label: "Mock interviews", icon: Users },
    ],
  },
  {
    label: "Interviews",
    items: [
      { href: "/interviews/tracker", label: "Tracker", icon: ClipboardList },
      { href: "/interviews/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/interviews/notice-planner", label: "Notice planner", icon: Hourglass },
    ],
  },
  {
    label: "Community",
    items: [{ href: "/intel", label: "Interview Intel", icon: Compass }],
  },
  {
    label: "",
    items: [{ href: "/profile", label: "Profile", icon: UserRound }],
  },
];

export const ADMIN_NAV: NavItem = { href: "/admin", label: "Admin", icon: Shield };

export const NOTIFICATIONS_NAV: NavItem = {
  href: "/notifications",
  label: "Notifications",
  icon: MessagesSquare,
};

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
