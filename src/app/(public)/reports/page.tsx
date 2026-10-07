import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page";
import { ReportFiltersSchema } from "@/modules/community/domain/search";
import { getCommunityService } from "@/modules/community/service";
import { CommunityDisclaimer, ReportCard } from "@/modules/community/ui/report-card";
import { firstValues } from "@/modules/community/ui/search-params";
import { getContentService } from "@/modules/content/service";

export async function generateMetadata({ searchParams }: PageProps<"/reports">): Promise<Metadata> {
  const { company } = firstValues(await searchParams);
  return {
    title: company ? `${company} interview experiences` : "Developer interview experiences",
    description:
      "Anonymized interview experiences shared by developers: rounds, questions, topics and difficulty.",
    alternates: {
      canonical: company ? `/reports?company=${encodeURIComponent(company)}` : "/reports",
    },
  };
}

/** Public list of published reports (company filter and paging only). */
export default async function PublicReportsPage({ searchParams }: PageProps<"/reports">) {
  const params = firstValues(await searchParams);
  const filters = ReportFiltersSchema.parse({ company: params.company, page: params.page });
  const community = getCommunityService();
  const [result, topics, companies] = await Promise.all([
    community.search(filters, new Date().toISOString().slice(0, 10)),
    getContentService().topics({ publishedOnly: true }),
    community.companies(),
  ]);
  const topicNames = Object.fromEntries(topics.map((topic) => [topic.id, topic.name]));
  const page = Math.min(filters.page, result.pages);
  const href = (nextPage: number) => {
    const search = new URLSearchParams();
    if (filters.company) search.set("company", filters.company);
    if (nextPage > 1) search.set("page", String(nextPage));
    const query = search.toString();
    return query ? `/reports?${query}` : "/reports";
  };

  return (
    <div className="grid gap-4">
      <PageHeader
        title={
          filters.company ? `${filters.company} interview experiences` : "Interview experiences"
        }
        description="Shared by developers after their interviews, with personal details removed."
      />
      {companies.length > 0 && (
        <nav aria-label="Companies" className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <Link
            href="/reports"
            className={filters.company ? "text-muted-foreground hover:underline" : "font-medium"}
          >
            All
          </Link>
          {companies.map((company) => (
            <Link
              key={company}
              href={`/reports?company=${encodeURIComponent(company)}`}
              className={
                filters.company === company
                  ? "font-medium"
                  : "text-muted-foreground hover:underline"
              }
            >
              {company}
            </Link>
          ))}
        </nav>
      )}
      <CommunityDisclaimer />
      {result.items.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No reports yet"
          description="Reports appear here after candidates share them and a moderator approves them."
        />
      ) : (
        <>
          <ul className="grid gap-3">
            {result.items.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                topicNames={topicNames}
                hrefBase="/reports"
              />
            ))}
          </ul>
          {result.pages > 1 && (
            <nav aria-label="Pages" className="flex justify-center gap-4 text-sm">
              {page > 1 && <Link href={href(page - 1)}>← Newer</Link>}
              <span>
                Page {page} of {result.pages}
              </span>
              {page < result.pages && <Link href={href(page + 1)}>Older →</Link>}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
