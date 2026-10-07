"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, BookOpenCheck, CalendarDays, Flag, Hourglass, Plus } from "lucide-react";

import { EmptyState } from "@/components/page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { NativeSelect } from "@/components/ui/native-select";
import { ROUND_TYPES, ROUND_TYPE_LABELS, type RoundType } from "@/lib/domain";
import { formatRoundTime, timezoneLabel } from "@/lib/format";

import {
  type CalendarFilters,
  type CalendarMarker,
  filterRounds,
  slotFromCalendarDate,
} from "../domain/calendar";
import { detectConflicts } from "../domain/rounds";
import {
  type Application,
  ROUND_RESULTS,
  ROUND_RESULT_LABELS,
  ROUND_STATUSES,
  ROUND_STATUS_LABELS,
  type Round,
  type RoundResult,
  type RoundStatus,
} from "../schemas";
import { RoundStatusBadge } from "./badges";
import { type CalendarViewName } from "./interview-calendar";
import { RoundDrawer } from "./round-drawer";
import { RoundFormDialog } from "./round-form";

// FullCalendar measures the DOM, so it renders on the client only.
const InterviewCalendar = dynamic(
  () => import("./interview-calendar").then((module) => module.InterviewCalendar),
  { ssr: false, loading: () => <Skeleton className="h-[640px]" /> },
);

const VIEWS: readonly CalendarViewName[] = ["month", "week", "agenda"];

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/**
 * Interview calendar: month/week/agenda views, filters, conflict warnings,
 * follow-up and revision markers, quick-add from an empty slot and the round
 * detail drawer. View, date, filters and the open round live in the URL.
 */
export function CalendarView({
  applications,
  rounds,
  markers,
  timezone,
  reminderMinutes,
  uploadsEnabled,
}: {
  applications: Application[];
  rounds: Round[];
  markers: CalendarMarker[];
  timezone: string;
  reminderMinutes: number[];
  uploadsEnabled: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [slot, setSlot] = useState<{ date: string; time: string } | null>(null);

  const filters: CalendarFilters = {
    company: params.get("company"),
    status: pick<RoundStatus>(params.get("status"), ROUND_STATUSES),
    result: pick<RoundResult>(params.get("result"), ROUND_RESULTS),
    type: pick<RoundType>(params.get("type"), ROUND_TYPES),
  };
  const openRoundId = params.get("round");
  const urlView = pick<CalendarViewName>(params.get("view"), VIEWS);
  // Phones start on the agenda list unless the URL says otherwise.
  const [initialView] = useState<CalendarViewName>(
    () =>
      urlView ??
      (typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches
        ? "agenda"
        : "month"),
  );
  const [initialDate] = useState(() => params.get("date") ?? undefined);

  const setParams = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const appsById = useMemo(() => new Map(applications.map((app) => [app.id, app])), [applications]);
  const companyOf = useCallback(
    (applicationId: string) => appsById.get(applicationId)?.companyName ?? "Interview",
    [appsById],
  );
  const companies = useMemo(
    () =>
      [...new Set(applications.map((app) => app.companyName))].sort((a, b) => a.localeCompare(b)),
    [applications],
  );

  const visible = filterRounds(rounds, companyOf, filters);
  // Conflicts consider every scheduled round, not only the filtered ones.
  const conflictPairs = useMemo(() => detectConflicts(rounds), [rounds]);
  const conflicts = useMemo(
    () => new Set(conflictPairs.flatMap(([a, b]) => [a.id, b.id])),
    [conflictPairs],
  );
  const filtering = Object.values(filters).some(Boolean);
  const openRound = openRoundId ? rounds.find((round) => round.id === openRoundId) : undefined;

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No interviews yet"
        description="Add an application to your tracker, then schedule its rounds here or from the tracker."
        action={
          <Button asChild>
            <Link href="/interviews/tracker?new=1">
              <Plus /> Add an application
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-4 [&>*]:min-w-0">
      <div className="flex flex-wrap items-end gap-2">
        <FilterSelect
          label="Company"
          value={filters.company}
          options={companies.map((name) => ({ value: name, label: name }))}
          onChange={(value) => setParams({ company: value })}
        />
        <FilterSelect
          label="Round status"
          value={filters.status}
          options={ROUND_STATUSES.map((value) => ({ value, label: ROUND_STATUS_LABELS[value] }))}
          onChange={(value) => setParams({ status: value })}
        />
        <FilterSelect
          label="Result"
          value={filters.result}
          options={ROUND_RESULTS.map((value) => ({ value, label: ROUND_RESULT_LABELS[value] }))}
          onChange={(value) => setParams({ result: value })}
        />
        <FilterSelect
          label="Round type"
          value={filters.type}
          options={ROUND_TYPES.map((value) => ({ value, label: ROUND_TYPE_LABELS[value] }))}
          onChange={(value) => setParams({ type: value })}
        />
        {filtering && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setParams({ company: null, status: null, result: null, type: null })}
          >
            Clear filters
          </Button>
        )}
        <Button size="sm" className="ml-auto" onClick={() => setSlot({ date: "", time: "" })}>
          <Plus /> Schedule round
        </Button>
      </div>

      {conflictPairs.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle aria-hidden />
          <AlertTitle>
            {conflictPairs.length === 1
              ? "Two scheduled rounds overlap"
              : `${conflictPairs.length} pairs of scheduled rounds overlap`}
          </AlertTitle>
          <AlertDescription>
            <ul className="grid gap-1">
              {conflictPairs.slice(0, 5).map(([a, b]) => (
                <li key={`${a.id}-${b.id}`} className="flex flex-wrap items-center gap-x-2">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setParams({ round: a.id })}
                  >
                    {companyOf(a.applicationId)}
                  </button>
                  <span>and</span>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setParams({ round: b.id })}
                  >
                    {companyOf(b.applicationId)}
                  </button>
                  <span className="text-xs opacity-80">
                    {formatRoundTime(a.startUtc, a.endUtc, timezone)}
                  </span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground">
        Times in {timezone} ({timezoneLabel(timezone)}).{" "}
        <Link href="/profile" className="underline">
          Change timezone
        </Link>
        . Click an empty day or time slot to schedule a round.
        {filtering && ` Showing ${visible.length} of ${rounds.length} rounds.`}
      </p>

      <InterviewCalendar
        rounds={visible}
        companyOf={companyOf}
        conflicts={conflicts}
        markers={markers}
        timezone={timezone}
        initialView={initialView}
        initialDate={initialDate}
        onOpenRound={(id) => setParams({ round: id })}
        onOpenHref={(href) => router.push(href)}
        onPickSlot={(date, allDay) => setSlot(slotFromCalendarDate(date, allDay))}
        onViewChange={(view, date) => {
          if (view !== params.get("view") || date !== params.get("date")) {
            setParams({ view, date });
          }
        }}
      />

      <Legend />

      {slot && (
        <RoundFormDialog
          open
          onOpenChange={(open) => !open && setSlot(null)}
          applications={applications}
          timezone={timezone}
          reminderMinutes={reminderMinutes}
          slot={slot.date ? slot : undefined}
        />
      )}

      {openRound && (
        <RoundDrawer
          key={openRound.id}
          round={openRound}
          application={appsById.get(openRound.applicationId)}
          allRounds={rounds}
          applications={applications}
          timezone={timezone}
          reminderMinutes={reminderMinutes}
          uploadsEnabled={uploadsEnabled}
          onClose={() => setParams({ round: null })}
          onOpenRound={(id) => setParams({ round: id })}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <NativeSelect
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="h-8 min-w-36"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function Legend() {
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="w-fit cursor-pointer">Legend</summary>
      <ul className="mt-2 flex flex-wrap items-center gap-2">
        {ROUND_STATUSES.map((status) => (
          <li key={status}>
            <RoundStatusBadge status={status} />
          </li>
        ))}
        <li className="flex items-center gap-1">
          <AlertTriangle className="size-3.5" aria-hidden /> Overlaps another round
        </li>
        <li className="flex items-center gap-1">
          <Flag className="size-3.5" aria-hidden /> Follow-up
        </li>
        <li className="flex items-center gap-1">
          <BookOpenCheck className="size-3.5" aria-hidden /> Revision session
        </li>
        <li className="flex items-center gap-1">
          <Hourglass className="size-3.5" aria-hidden /> Notice-period milestone
        </li>
      </ul>
    </details>
  );
}
