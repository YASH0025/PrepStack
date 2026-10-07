import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { BAND_LABELS, EXPERIENCE_BANDS, ROUND_TYPES, ROUND_TYPE_LABELS } from "@/lib/domain";

import { type ReportFilters } from "../domain/search";

const RECENCY_LABELS = {
  "3": "Last 3 months",
  "6": "Last 6 months",
  "12": "Last year",
  all: "Any time",
};

/** Plain GET form: filters live in the URL and work without JavaScript. */
export function IntelFilters({
  filters,
  companies,
  topics,
  autoFocus,
  saved,
}: {
  filters: ReportFilters;
  companies: string[];
  topics: { id: string; name: string }[];
  autoFocus?: boolean;
  saved?: boolean;
}) {
  return (
    <form method="get" action="/intel" className="grid gap-3 rounded-lg border p-4" role="search">
      {saved && <input type="hidden" name="saved" value="1" />}
      <div className="flex gap-2">
        <Label htmlFor="intel-q" className="sr-only">
          Search reports
        </Label>
        <Input
          id="intel-q"
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder="Search questions, companies, topics…"
          autoFocus={autoFocus}
        />
        <Button type="submit">
          <Search /> Search
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1.5">
          <Label htmlFor="intel-company">Company</Label>
          <Input
            id="intel-company"
            name="company"
            list="intel-companies"
            defaultValue={filters.company ?? ""}
          />
          <datalist id="intel-companies">
            {companies.map((company) => (
              <option key={company} value={company} />
            ))}
          </datalist>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="intel-role">Role</Label>
          <Input id="intel-role" name="role" defaultValue={filters.role ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="intel-tech">Technology</Label>
          <Input id="intel-tech" name="tech" defaultValue={filters.tech ?? ""} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="intel-band">Experience</Label>
          <NativeSelect id="intel-band" name="band" defaultValue={filters.band ?? ""}>
            <option value="">Any</option>
            {EXPERIENCE_BANDS.map((band) => (
              <option key={band} value={band}>
                {BAND_LABELS[band]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="intel-round">Round type</Label>
          <NativeSelect id="intel-round" name="round" defaultValue={filters.round ?? ""}>
            <option value="">Any</option>
            {ROUND_TYPES.map((type) => (
              <option key={type} value={type}>
                {ROUND_TYPE_LABELS[type]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="intel-topic">Topic</Label>
          <NativeSelect id="intel-topic" name="topic" defaultValue={filters.topic ?? ""}>
            <option value="">Any</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="intel-difficulty">Difficulty</Label>
          <NativeSelect
            id="intel-difficulty"
            name="difficulty"
            defaultValue={filters.difficulty ? String(filters.difficulty) : ""}
          >
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}/5
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="intel-recency">When</Label>
          <NativeSelect id="intel-recency" name="recency" defaultValue={filters.recency}>
            {Object.entries(RECENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="intel-sort" className="text-sm font-normal text-muted-foreground">
            Sort by
          </Label>
          <NativeSelect id="intel-sort" name="sort" defaultValue={filters.sort} className="w-40">
            <option value="recent">Most recent</option>
            <option value="useful">Most useful</option>
          </NativeSelect>
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Apply filters
        </Button>
        <Link
          href={saved ? "/intel?saved=1" : "/intel"}
          className="text-sm text-muted-foreground hover:underline"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}
