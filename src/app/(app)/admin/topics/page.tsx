import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";

export const metadata: Metadata = { title: "Topics" };

export default async function AdminTopicsPage() {
  await requireAdmin();
  const content = getContentService();
  const [topics, questions, tracks] = await Promise.all([
    content.topics(),
    content.questions(),
    content.tracks(),
  ]);
  const counts = new Map<string, number>();
  for (const question of questions)
    counts.set(question.topicId, (counts.get(question.topicId) ?? 0) + 1);

  return (
    <>
      <PageHeader
        title="Topics & questions"
        description={`${topics.length} topics in the skill graph.`}
        actions={
          tracks.length > 0 && (
            <Button asChild>
              <Link href="/admin/topics/new">
                <Plus /> New topic
              </Link>
            </Button>
          )
        }
      />
      {topics.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No topics yet"
          description={
            tracks.length === 0
              ? "Create a track first under Tracks, roles, competencies."
              : "Add the first topic of the skill graph."
          }
          action={
            <Button asChild variant="outline">
              <Link href={tracks.length === 0 ? "/admin/structure" : "/admin/topics/new"}>
                {tracks.length === 0 ? "Create a track" : "New topic"}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Importance</TableHead>
                <TableHead className="text-right">Questions</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => (
                <TableRow key={topic.id}>
                  <TableCell>
                    <Link
                      href={`/admin/topics/${topic.id}`}
                      className="font-medium hover:underline"
                    >
                      {topic.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{topic.category}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {topic.coreImportance}/5
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {counts.get(topic.id) ?? 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant={topic.published ? "success" : "muted"}>
                      {topic.published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
