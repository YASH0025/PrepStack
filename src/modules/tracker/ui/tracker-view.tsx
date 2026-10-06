"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ClipboardList, Download, KanbanSquare, Plus, Search, Table2 } from "lucide-react";

import { EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type Application,
  CLOSED_STATUSES,
  type CustomField,
  type Round,
} from "../schemas";
import { ApplicationFormDialog } from "./application-form";
import { ApplicationPanel } from "./application-panel";
import { CustomFieldsDialog } from "./custom-fields-dialog";
import { TrackerKanban } from "./tracker-kanban";
import { TrackerTable } from "./tracker-table";

/**
 * The private interview tracker: spreadsheet/kanban toggle, search and status
 * filter, and the application side panel. View, filters and the open panel
 * live in the URL so they survive refreshes and can be bookmarked.
 */
export function TrackerView({
  applications,
  rounds,
  customFields,
  timezone,
  reminderMinutes,
  panelExtras = {},
}: {
  applications: Application[];
  rounds: Round[];
  customFields: CustomField[];
  timezone: string;
  reminderMinutes: number[];
  /** Server-rendered extra panel sections keyed by application id. */
  panelExtras?: Record<string, React.ReactNode>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = params.get("view") === "kanban" ? "kanban" : "table";
  const openId = params.get("app");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "active");
  const [newOpen, setNewOpen] = useState(params.get("new") === "1");

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null) next.delete(key);
      else next.set(key, value);
      next.delete("new");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((application) => {
      if (status === "active" && CLOSED_STATUSES.includes(application.status)) return false;
      if (status !== "active" && status !== "all" && application.status !== status) return false;
      if (!q) return true;
      return `${application.companyName} ${application.jobTitle} ${application.technologies.join(" ")}`
        .toLowerCase()
        .includes(q);
    });
  }, [applications, query, status]);

  const open = useCallback((id: string) => setParam("app", id), [setParam]);
  const openApplication = openId
    ? (applications.find((application) => application.id === openId) ?? null)
    : null;

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={view}
          onValueChange={(value) => setParam("view", value === "kanban" ? "kanban" : null)}
        >
          <TabsList aria-label="View">
            <TabsTrigger value="table">
              <Table2 /> Spreadsheet
            </TabsTrigger>
            <TabsTrigger value="kanban">
              <KanbanSquare /> Kanban
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative min-w-48 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Search applications"
            placeholder="Search company, role, tech"
            className="pl-8"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <NativeSelect
          aria-label="Filter by status"
          className="w-48"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="active">Active (not closed)</option>
          <option value="all">All statuses</option>
          {APPLICATION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {APPLICATION_STATUS_LABELS[value]}
            </option>
          ))}
        </NativeSelect>
        {view === "table" && <CustomFieldsDialog fields={customFields} />}
        <Button asChild variant="outline" size="sm">
          <a href="/api/export/tracker?type=applications" download>
            <Download /> Export CSV
          </a>
        </Button>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus /> New application
        </Button>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Track your first application"
          description="Add every company you are talking to. Interviews you schedule appear on your calendar and your roadmap plans toward them."
          action={
            <Button onClick={() => setNewOpen(true)}>
              <Plus /> New application
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No applications match"
          description="Change the search or status filter."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
            >
              Show all
            </Button>
          }
        />
      ) : view === "kanban" ? (
        <TrackerKanban applications={filtered} rounds={rounds} timezone={timezone} onOpen={open} />
      ) : (
        <TrackerTable
          applications={filtered}
          rounds={rounds}
          customFields={customFields}
          timezone={timezone}
          onOpen={open}
        />
      )}

      <ApplicationFormDialog open={newOpen} onOpenChange={setNewOpen} onSaved={open} />
      <ApplicationPanel
        key={openApplication?.id ?? "none"}
        application={openApplication}
        rounds={rounds}
        applications={applications}
        timezone={timezone}
        reminderMinutes={reminderMinutes}
        onClose={() => setParam("app", null)}
        extra={openApplication ? panelExtras[openApplication.id] : undefined}
      />
    </div>
  );
}
