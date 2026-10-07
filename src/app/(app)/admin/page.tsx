import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";

import { PageHeader, Section } from "@/components/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAuditEntries } from "@/modules/admin/audit";
import { requireAdmin } from "@/modules/auth/service";
import { getCommunityService } from "@/modules/community/service";
import { getContentService } from "@/modules/content/service";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminOverviewPage() {
  await requireAdmin();
  const content = getContentService();
  const [tracks, roles, topics, questions, behavioral, interviewer, audit, moderation] =
    await Promise.all([
      content.tracks(),
      content.roles(),
      content.topics(),
      content.questions(),
      content.behavioralQuestions(),
      content.interviewerQuestions(),
      listAuditEntries(25),
      getCommunityService().moderationQueue(),
    ]);

  const stats = [
    { label: "Tracks", value: tracks.length, href: "/admin/structure" },
    { label: "Roles", value: roles.length, href: "/admin/structure" },
    { label: "Topics", value: topics.length, href: "/admin/topics" },
    {
      label: "Unpublished topics",
      value: topics.filter((t) => !t.published).length,
      href: "/admin/topics",
    },
    { label: "Questions", value: questions.length, href: "/admin/topics" },
    {
      label: "Diagnostic questions",
      value: questions.filter((q) => q.diagnostic).length,
      href: "/admin/topics",
    },
    { label: "Behavioral & HR", value: behavioral.length, href: "/admin/behavioral" },
    { label: "Questions to ask", value: interviewer.length, href: "/admin/interviewer-questions" },
    {
      label: "Reports awaiting moderation",
      value: moderation.pending.length,
      href: "/admin/moderation",
    },
    {
      label: "Flagged reports",
      value: moderation.flagged.length,
      href: "/admin/moderation?tab=flagged",
    },
  ];

  return (
    <>
      <PageHeader
        title="Admin"
        description="Author the skill graph and content, and moderate community reports."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="gap-1 py-4 transition-colors hover:bg-accent/50">
              <CardHeader className="px-4">
                <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 text-sm text-muted-foreground">{stat.label}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Section
        title="Recent admin activity"
        description="Every content and moderation change is logged."
      >
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes yet.</p>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(entry.createdAt), "d MMM yyyy, HH:mm")}
                    </TableCell>
                    <TableCell>{entry.action}</TableCell>
                    <TableCell>{entry.entityType}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {entry.details || entry.entityId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </>
  );
}
