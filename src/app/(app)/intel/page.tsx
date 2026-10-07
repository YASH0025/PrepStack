import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Share2 } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { todayIn } from "@/lib/local-date";
import { cn } from "@/lib/utils";
import { requireUser } from "@/modules/auth/service";
import { reportBookmarksFor } from "@/modules/bookmarks/service";
import { ReportFiltersSchema, matchesFilters } from "@/modules/community/domain/search";
import { getCommunityService } from "@/modules/community/service";
import { IntelFilters } from "@/modules/community/ui/intel-filters";
import { CommunityDisclaimer, ReportCard } from "@/modules/community/ui/report-card";
import { firstValues, intelHref } from "@/modules/community/ui/search-params";
import { getContentService } from "@/modules/content/service";
import { getProfile } from "@/modules/profile/service";

export const metadata: Metadata = { title: "Interview Intel" };

export default async function IntelPage({ searchParams }: PageProps<"/intel">) {
  const user = await requireUser("/intel");
  const params = firstValues(await searchParams);
  const filters = ReportFiltersSchema.parse(params);
  const saved = params.saved === "1";
  const community = getCommunityService();
  const bookmarks = reportBookmarksFor(user.id);
  const [profile, topics, companies, bookmarkIds, published] = await Promise.all([
    getProfile(user.id),
    getContentService().topics({ publishedOnly: true }),
    community.companies(),
    bookmarks.list(),
    community.listPublished(),
  ]);
  const today = todayIn(profile?.timezone ?? "Asia/Kolkata");
  const topicNames = Object.fromEntries(topics.map((topic) => [topic.id, topic.name]));
  const bookmarkSet = new Set(bookmarkIds);

  let items;
  let total;
  let pages = 1;
  if (saved) {
    const byId = new Map(published.map((report) => [report.id, report]));
    const stale = bookmarkIds.filter((id) => !byId.has(id));
    if (stale.length) await bookmarks.prune(stale);
    items = bookmarkIds
      .map((id) => byId.get(id))
      .filter((report) => report !== undefined)
      .filter((report) => matchesFilters(report, filters, today));
    total = items.length;
  } else {
    ({ items, total, pages } = await community.search(filters, today));
  }
  const page = Math.min(filters.page, pages);
  const baseParams = { ...params, page: undefined };

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Interview Intel"
        description="Real, anonymized interview experiences from other candidates."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/interviews/tracker">
              <Share2 /> Share your experience
            </Link>
          </Button>
        }
      />
      <nav aria-label="Report lists" className="flex gap-1 border-b">
        {[
          { href: "/intel", label: "All reports", active: !saved },
          { href: "/intel?saved=1", label: `Saved (${bookmarkIds.length})`, active: saved },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              tab.active
                ? "border-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <IntelFilters
        filters={filters}
        companies={companies}
        topics={[...topics]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((topic) => ({ id: topic.id, name: topic.name }))}
        autoFocus={params.focus === "1"}
        saved={saved}
      />
      <CommunityDisclaimer />

      {published.length === 0 && !saved ? (
        <EmptyState
          icon={Compass}
          title="No reports yet"
          description="Be the first: after your next interview, write a debrief and choose “Share anonymized version”. Your private notes, people and salary are never shared."
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Compass}
          title={saved && bookmarkIds.length === 0 ? "Nothing saved yet" : "No matching reports"}
          description={
            saved && bookmarkIds.length === 0
              ? "Save reports you want to come back to. Only you can see your saved list."
              : "Try fewer filters or a broader time range."
          }
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={saved ? "/intel?saved=1" : "/intel"}>Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {total} report{total === 1 ? "" : "s"}
          </p>
          <ul className="grid gap-3">
            {items.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                topicNames={topicNames}
                bookmarked={bookmarkSet.has(report.id)}
              />
            ))}
          </ul>
          {pages > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-center gap-3 text-sm">
              {page > 1 ? (
                <Link
                  href={intelHref({ ...baseParams, page: page - 1 })}
                  className="hover:underline"
                >
                  ← Newer
                </Link>
              ) : (
                <span className="text-muted-foreground">← Newer</span>
              )}
              <span>
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Link
                  href={intelHref({ ...baseParams, page: page + 1 })}
                  className="hover:underline"
                >
                  Older →
                </Link>
              ) : (
                <span className="text-muted-foreground">Older →</span>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
