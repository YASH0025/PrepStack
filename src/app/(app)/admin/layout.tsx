import Link from "next/link";

import { requireAdmin } from "@/modules/auth/service";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/topics", label: "Topics & questions" },
  { href: "/admin/structure", label: "Tracks, roles, competencies" },
  { href: "/admin/behavioral", label: "Behavioral & HR" },
  { href: "/admin/interviewer-questions", label: "Questions to ask" },
  { href: "/admin/moderation", label: "Moderation" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="grid gap-6">
      <nav aria-label="Admin" className="flex flex-wrap gap-1 border-b pb-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-2.5 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
