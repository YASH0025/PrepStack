"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, GripVertical } from "lucide-react";

import { formatRoundTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import { moveApplicationAction } from "../actions";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type Application,
  type ApplicationStatus,
  type Round,
} from "../schemas";

type Columns = Record<ApplicationStatus, Application[]>;

function group(applications: Application[]): Columns {
  const columns = Object.fromEntries(
    APPLICATION_STATUSES.map((status) => [status, [] as Application[]]),
  ) as Columns;
  for (const application of applications) columns[application.status].push(application);
  for (const status of APPLICATION_STATUSES) {
    columns[status].sort((a, b) => a.kanbanOrder - b.kanbanOrder);
  }
  return columns;
}

/** Order value between two neighbours so only the moved card is written. */
function orderBetween(before?: Application, after?: Application): number {
  if (before && after) return (before.kanbanOrder + after.kanbanOrder) / 2;
  if (before) return before.kanbanOrder + 1;
  if (after) return after.kanbanOrder - 1;
  return 0;
}

function Card({
  application,
  nextRound,
  timezone,
  onOpen,
  dragging,
}: {
  application: Application;
  nextRound?: Round;
  timezone: string;
  onOpen?: () => void;
  dragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-1 rounded-lg border bg-card p-3 text-sm shadow-xs",
        dragging && "shadow-lg ring-2 ring-primary/30",
      )}
    >
      <button type="button" className="text-left font-medium hover:underline" onClick={onOpen}>
        {application.companyName}
      </button>
      <span className="text-xs text-muted-foreground">{application.jobTitle}</span>
      {nextRound && (
        <span className="mt-1 flex items-center gap-1 text-xs text-primary">
          <CalendarClock className="size-3" aria-hidden />
          {formatRoundTime(nextRound.startUtc, nextRound.endUtc, timezone)}
        </span>
      )}
    </div>
  );
}

function SortableCard(props: {
  application: Application;
  nextRound?: Round;
  timezone: string;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.application.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-start gap-1", isDragging && "opacity-40")}
    >
      <button
        type="button"
        className="mt-3 cursor-grab rounded p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Move ${props.application.companyName}. Use space and arrow keys.`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <Card {...props} />
      </div>
    </li>
  );
}

function Column({
  status,
  items,
  children,
}: {
  status: ApplicationStatus;
  items: Application[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });
  return (
    <section
      ref={setNodeRef}
      aria-label={APPLICATION_STATUS_LABELS[status]}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-2 rounded-xl border bg-muted/30 p-2",
        isOver && "ring-2 ring-primary/40",
      )}
    >
      <h3 className="flex items-center justify-between px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {APPLICATION_STATUS_LABELS[status]}
        <span className="tabular-nums">{items.length}</span>
      </h3>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul className="grid min-h-16 content-start gap-2">{children}</ul>
      </SortableContext>
    </section>
  );
}

/** Kanban: drag applications between statuses (mouse, touch or keyboard). */
export function TrackerKanban({
  applications,
  rounds,
  timezone,
  onOpen,
}: {
  applications: Application[];
  rounds: Round[];
  timezone: string;
  onOpen: (id: string) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [columns, setColumns] = useState<Columns>(() => group(applications));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [now] = useState(() => new Date().toISOString());

  // Server data is the source of truth after every refresh: reset the local
  // (optimistic) columns whenever new applications arrive.
  const [synced, setSynced] = useState(applications);
  if (synced !== applications) {
    setSynced(applications);
    setColumns(group(applications));
  }

  const nextRound = useMemo(() => {
    const map = new Map<string, Round>();
    for (const round of rounds) {
      if (round.status !== "SCHEDULED" || round.endUtc < now) continue;
      const current = map.get(round.applicationId);
      if (!current || round.startUtc < current.startUtc) map.set(round.applicationId, round);
    }
    return map;
  }, [rounds, now]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findStatus = (id: string): ApplicationStatus | null => {
    if (id.startsWith("column:")) return id.slice(7) as ApplicationStatus;
    return (
      APPLICATION_STATUSES.find((status) => columns[status].some((item) => item.id === id)) ?? null
    );
  };

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const fromStatus = findStatus(String(active.id));
    const toStatus = findStatus(String(over.id));
    if (!fromStatus || !toStatus) return;
    const moving = columns[fromStatus].find((item) => item.id === active.id);
    if (!moving) return;

    const target = columns[toStatus].filter((item) => item.id !== moving.id);
    const overIndex = target.findIndex((item) => item.id === over.id);
    const insertAt = overIndex === -1 ? target.length : overIndex;
    const order = orderBetween(target[insertAt - 1], target[insertAt]);
    if (fromStatus === toStatus && columns[toStatus].indexOf(moving) === insertAt) return;

    const updated = { ...moving, status: toStatus, kanbanOrder: order };
    target.splice(insertAt, 0, updated);
    setColumns({
      ...columns,
      [fromStatus]: columns[fromStatus].filter((item) => item.id !== moving.id),
      [toStatus]: target,
    });
    startTransition(async () => {
      const result = await moveApplicationAction(moving.id, toStatus, order);
      if (!result.ok) setColumns(group(applications));
      router.refresh();
    });
  };

  const active = activeId ? applications.find((item) => item.id === activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {APPLICATION_STATUSES.map((status) => (
          <Column key={status} status={status} items={columns[status]}>
            {columns[status].map((application) => (
              <SortableCard
                key={application.id}
                application={application}
                nextRound={nextRound.get(application.id)}
                timezone={timezone}
                onOpen={() => onOpen(application.id)}
              />
            ))}
          </Column>
        ))}
      </div>
      <DragOverlay>
        {active && (
          <Card
            application={active}
            nextRound={nextRound.get(active.id)}
            timezone={timezone}
            dragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
