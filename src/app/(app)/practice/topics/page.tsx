import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, ClipboardCheck, Search } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { DEPTH_LABELS } from "@/lib/domain";
import { requireUser } from "@/modules/auth/service";
import { getContentService } from "@/modules/content/service";
import { requireProfile } from "@/modules/profile/service";
import { TOPIC_STATUS_LABELS, type TopicStatus } from "@/modules/progress/schemas";
import { progressServiceFor } from "@/modules/progress/service";

export const metadata: Metadata = { title: "Topics" };

const STATUS_VARIANT: Record<TopicStatus, "muted" | "info" | "success" | "warning" | "danger"> = {
  NOT_STARTED: "muted",
  LEARNING: "info",
  COMPLETED: "success",
  NEEDS_REVISION: "warning",
  DIFFICULT: "danger",
};

export default async function TopicsPage({ searchParams }: PageProps<"/practice/topics">) {
  const user = await requireUser("/practice/topics");
  const profile = await requireProfile(user.id);
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const category = typeof params.category === "string" ? params.category : "";
  const status = typeof params.status === "string" ? params.status : "";
  const scope = params.scope === "all" ? "all" : "role";

  const [topics, statusMap] = await Promise.all([
    getContentService().topics({ trackId: profile.trackId, publishedOnly: true }),
    progressServiceFor(user.id).statusMap(),
  ]);
  const roleImportance = (topicRoles: { roleId: string; importance: number }[]) =>
    topicRoles.find((entry) => entry.roleId === profile.targetRoleId)?.importance ?? 0;
  const categories = [...new Set(topics.map((topic) => topic.category))].sort();

  const visible = topics.filter((topic) => {
    const topicStatus = statusMap.get(topic.id) ?? "NOT_STARTED";
    if (scope === "role" && roleImportance(topic.roleImportance) === 0) return false;
    if (category && topic.category !== category) return false;
    if (status && topicStatus !== status) return false;
    if (q && !`${topic.name} ${topic.description}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const completed = topics.filter((topic) => statusMap.get(topic.id) === "COMPLETED").length;

  return (
    <>
      <PageHeader
        title="Topics"
        description={`${completed} of ${topics.length} topics completed. Answers are shown at your level by default.`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/practice/saved">
                <Bookmark /> Saved questions
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/practice/diagnostic">
                <ClipboardCheck /> Diagnostic
              </Link>
            </Button>
          </>
        }
      />

      <form className="mb-6 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]" role="search">
        <label htmlFor="topic-search" className="sr-only">
          Search topics
        </label>
        <Input id="topic-search" name="q" defaultValue={q} placeholder="Search topics" />
        <NativeSelect name="category" defaultValue={category} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="status" defaultValue={status} aria-label="Status">
          <option value="">Any status</option>
          {Object.entries(TOPIC_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="scope" defaultValue={scope} aria-label="Scope">
          <option value="role">My target role</option>
          <option value="all">All topics</option>
        </NativeSelect>
        <Button type="submit" variant="secondary">
          <Search /> Filter
        </Button>
      </form>

      {visible.length === 0 ? (
        <EmptyState
          title="No topics match"
          description="Try clearing the filters."
          action={
            <Button asChild variant="outline">
              <Link href="/practice/topics">Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((topic) => {
            const topicStatus = statusMap.get(topic.id) ?? "NOT_STARTED";
            const depth = topic.depthByBand[profile.experienceBand].depth;
            return (
              <li key={topic.id}>
                <Link
                  href={`/practice/topics/${topic.slug}`}
                  className="flex h-full flex-col gap-2 rounded-xl border p-4 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{topic.name}</span>
                    <Badge variant={STATUS_VARIANT[topicStatus]}>
                      {TOPIC_STATUS_LABELS[topicStatus]}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{topic.description}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-1 text-xs text-muted-foreground">
                    <span>{topic.category}</span>
                    <span aria-hidden>·</span>
                    <span>Target: {DEPTH_LABELS[depth].label}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
