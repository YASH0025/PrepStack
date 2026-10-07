"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, PanelRightOpen } from "lucide-react";

import { SecretValue } from "@/components/secret-value";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUND_TYPE_LABELS } from "@/lib/domain";
import { formatRoundTime } from "@/lib/format";

import { patchApplicationAction, setCustomValueAction } from "../actions";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type Application,
  type ApplicationPatch,
  type CustomField,
  type Round,
  SOURCES,
  SOURCE_LABELS,
} from "../schemas";

/** Saves an inline edit and refreshes. Keeps the cell responsive while saving. */
function useSave() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });
}

function TextCell({
  value,
  label,
  onCommit,
  type = "text",
}: {
  value: string;
  label: string;
  type?: "text" | "date" | "number";
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <Input
      aria-label={label}
      type={type}
      value={draft}
      className="h-8 min-w-28 border-transparent bg-transparent shadow-none hover:border-input focus-visible:border-ring"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") (event.target as HTMLInputElement).blur();
        if (event.key === "Escape") setDraft(value);
      }}
    />
  );
}

function CustomCell({ application, field }: { application: Application; field: CustomField }) {
  const save = useSave();
  const value = application.customValues[field.id];
  const label = `${field.name} for ${application.companyName}`;
  const commit = (next: string | number | boolean | null) =>
    save(() => setCustomValueAction(application.id, field.id, next));

  if (field.type === "CHECKBOX") {
    return (
      <input
        type="checkbox"
        aria-label={label}
        className="size-4 accent-primary"
        checked={value === true}
        onChange={(event) => commit(event.target.checked)}
      />
    );
  }
  if (field.type === "SELECT") {
    return (
      <NativeSelect
        aria-label={label}
        className="h-8 min-w-28"
        value={typeof value === "string" ? value : ""}
        onChange={(event) => commit(event.target.value || null)}
      >
        <option value="">–</option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </NativeSelect>
    );
  }
  return (
    <TextCell
      label={label}
      type={field.type === "NUMBER" ? "number" : field.type === "DATE" ? "date" : "text"}
      value={value === null || value === undefined ? "" : String(value)}
      onCommit={(next) => {
        if (next === "") return commit(null);
        if (field.type === "NUMBER") {
          const number = Number(next);
          return Number.isFinite(number) ? commit(number) : undefined;
        }
        return commit(next.slice(0, 500));
      }}
    />
  );
}

/** Spreadsheet view: sortable columns, inline editing, custom columns. */
export function TrackerTable({
  applications,
  rounds,
  customFields,
  timezone,
  onOpen,
}: {
  applications: Application[];
  rounds: Round[];
  customFields: CustomField[];
  timezone: string;
  onOpen: (id: string) => void;
}) {
  const save = useSave();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [now] = useState(() => new Date().toISOString());

  const nextRoundByApp = useMemo(() => {
    const map = new Map<string, Round>();
    for (const round of rounds) {
      if (round.status !== "SCHEDULED" || round.endUtc < now) continue;
      const current = map.get(round.applicationId);
      if (!current || round.startUtc < current.startUtc) map.set(round.applicationId, round);
    }
    return map;
  }, [rounds, now]);

  const patch = (id: string, value: ApplicationPatch) =>
    save(() => patchApplicationAction(id, value));

  const columns = useMemo<ColumnDef<Application>[]>(
    () => [
      {
        accessorKey: "companyName",
        header: "Company",
        cell: ({ row }) => (
          <button
            type="button"
            className="text-left font-medium hover:underline"
            onClick={() => onOpen(row.original.id)}
          >
            {row.original.companyName}
          </button>
        ),
      },
      {
        accessorKey: "jobTitle",
        header: "Job title",
        cell: ({ row }) => (
          <TextCell
            key={row.original.jobTitle}
            label={`Job title for ${row.original.companyName}`}
            value={row.original.jobTitle}
            onCommit={(value) => value.trim() && patch(row.original.id, { jobTitle: value })}
          />
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        sortingFn: (a, b) =>
          APPLICATION_STATUSES.indexOf(a.original.status) -
          APPLICATION_STATUSES.indexOf(b.original.status),
        cell: ({ row }) => (
          <NativeSelect
            aria-label={`Status for ${row.original.companyName}`}
            className="h-8 min-w-40"
            value={row.original.status}
            onChange={(event) =>
              patch(row.original.id, { status: event.target.value as Application["status"] })
            }
          >
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {APPLICATION_STATUS_LABELS[status]}
              </option>
            ))}
          </NativeSelect>
        ),
      },
      {
        id: "nextRound",
        header: "Next round",
        accessorFn: (application) => nextRoundByApp.get(application.id)?.startUtc ?? "9999",
        cell: ({ row }) => {
          const round = nextRoundByApp.get(row.original.id);
          return round ? (
            <span className="text-sm">
              {ROUND_TYPE_LABELS[round.type]}
              <span className="block text-xs text-muted-foreground">
                {formatRoundTime(round.startUtc, round.endUtc, timezone)}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">–</span>
          );
        },
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => (
          <NativeSelect
            aria-label={`Source for ${row.original.companyName}`}
            className="h-8 min-w-32"
            value={row.original.source}
            onChange={(event) =>
              patch(row.original.id, { source: event.target.value as Application["source"] })
            }
          >
            {SOURCES.map((source) => (
              <option key={source} value={source}>
                {SOURCE_LABELS[source]}
              </option>
            ))}
          </NativeSelect>
        ),
      },
      {
        accessorKey: "appliedOn",
        header: "Applied",
        cell: ({ row }) => (
          <TextCell
            key={row.original.appliedOn ?? ""}
            type="date"
            label={`Applied on for ${row.original.companyName}`}
            value={row.original.appliedOn ?? ""}
            onCommit={(value) => patch(row.original.id, { appliedOn: value })}
          />
        ),
      },
      {
        accessorKey: "followUpDate",
        header: "Follow up",
        cell: ({ row }) => (
          <TextCell
            key={row.original.followUpDate ?? ""}
            type="date"
            label={`Follow-up date for ${row.original.companyName}`}
            value={row.original.followUpDate ?? ""}
            onCommit={(value) => patch(row.original.id, { followUpDate: value })}
          />
        ),
      },
      {
        id: "expectedSalary",
        header: "Expected",
        enableSorting: false,
        cell: ({ row }) => (
          <SecretValue value={row.original.expectedSalary} label="expected salary" />
        ),
      },
      ...customFields.map<ColumnDef<Application>>((field) => ({
        id: `custom-${field.id}`,
        header: field.name,
        accessorFn: (application) => {
          const value = application.customValues[field.id];
          return value === null || value === undefined ? "" : String(value);
        },
        cell: ({ row }) => <CustomCell application={row.original} field={field} />,
      })),
      {
        id: "open",
        header: () => <span className="sr-only">Open</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Open ${row.original.companyName}`}
            onClick={() => onOpen(row.original.id)}
          >
            <PanelRightOpen />
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customFields, nextRoundByApp, timezone, onOpen],
  );

  const table = useReactTable({
    data: applications,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    aria-sort={
                      sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                    }
                  >
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : sorted === "desc" ? (
                          <ArrowDown className="size-3" />
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
