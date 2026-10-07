"use client";

import { useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import enGbLocale from "@fullcalendar/core/locales/en-gb";
import listPlugin from "@fullcalendar/list";
import timeGridPlugin from "@fullcalendar/timegrid";
import {
  type DatesSetArg,
  type EventClickArg,
  type EventContentArg,
  type EventInput,
} from "@fullcalendar/core";
import { AlertTriangle, BookOpenCheck, Flag, Hourglass, type LucideIcon } from "lucide-react";

import { ROUND_TYPE_LABELS } from "@/lib/domain";

import { type CalendarMarker, type MarkerKind, toWallClock } from "../domain/calendar";
import { ROUND_STATUS_LABELS, type Round } from "../schemas";
import { ROUND_STATUS_STYLE } from "./badges";

export type CalendarViewName = "month" | "week" | "agenda";

const VIEW_IDS: Record<CalendarViewName, string> = {
  month: "dayGridMonth",
  week: "timeGridWeek",
  agenda: "listMonth",
};

export function viewNameFromId(id: string): CalendarViewName {
  return id === "timeGridWeek" ? "week" : id === "listMonth" ? "agenda" : "month";
}

const MARKER_STYLE: Record<MarkerKind, { icon: LucideIcon; className: string; label: string }> = {
  FOLLOW_UP: { icon: Flag, className: "ps-marker-follow-up", label: "Follow-up" },
  REVISION: { icon: BookOpenCheck, className: "ps-marker-revision", label: "Revision" },
  NOTICE: { icon: Hourglass, className: "ps-marker-notice", label: "Notice period" },
};

type EventProps =
  | { kind: "round"; roundId: string; status: Round["status"]; conflict: boolean; srLabel: string }
  | { kind: "marker"; markerKind: MarkerKind; roundId?: string; href?: string };

/**
 * FullCalendar wrapper. Runs in UTC mode and receives wall-clock times in the
 * profile timezone, so displayed times always match the user's profile.
 */
export function InterviewCalendar({
  rounds,
  companyOf,
  conflicts,
  markers,
  timezone,
  initialView,
  initialDate,
  onOpenRound,
  onOpenHref,
  onPickSlot,
  onViewChange,
}: {
  rounds: Round[];
  companyOf: (applicationId: string) => string;
  conflicts: Set<string>;
  markers: CalendarMarker[];
  timezone: string;
  initialView: CalendarViewName;
  initialDate?: string;
  onOpenRound: (roundId: string) => void;
  onOpenHref: (href: string) => void;
  onPickSlot: (date: Date, allDay: boolean) => void;
  onViewChange: (view: CalendarViewName, date: string) => void;
}) {
  const ref = useRef<FullCalendar>(null);
  // Fixed per mount; the now-indicator only needs minute precision.
  const now = useMemo(() => toWallClock(new Date(), timezone), [timezone]);

  const events = useMemo<EventInput[]>(() => {
    const roundEvents: EventInput[] = rounds.map((round) => {
      const style = ROUND_STATUS_STYLE[round.status];
      const company = companyOf(round.applicationId);
      const conflict = conflicts.has(round.id);
      const props: EventProps = {
        kind: "round",
        roundId: round.id,
        status: round.status,
        conflict,
        srLabel: `${company}, ${ROUND_TYPE_LABELS[round.type]}, ${ROUND_STATUS_LABELS[round.status]}${
          conflict ? ", overlaps another round" : ""
        }`,
      };
      return {
        id: round.id,
        title: `${company} · ${round.title ?? ROUND_TYPE_LABELS[round.type]}`,
        start: toWallClock(round.startUtc, timezone),
        end: toWallClock(round.endUtc, timezone),
        backgroundColor: style.color,
        borderColor: conflict ? "#dc2626" : style.color,
        textColor: "#ffffff",
        classNames: [
          "ps-round",
          `ps-round-${round.status.toLowerCase()}`,
          conflict ? "ps-round-conflict" : "",
        ],
        extendedProps: props,
      };
    });
    const markerEvents: EventInput[] = markers.map((marker) => {
      const props: EventProps = {
        kind: "marker",
        markerKind: marker.kind,
        roundId: marker.roundId,
        href: marker.href,
      };
      return {
        id: marker.id,
        title: marker.label,
        start: marker.date,
        allDay: true,
        backgroundColor: "var(--muted)",
        borderColor: "var(--border)",
        textColor: "var(--foreground)",
        classNames: ["ps-marker", MARKER_STYLE[marker.kind].className],
        extendedProps: props,
      };
    });
    return [...markerEvents, ...roundEvents];
  }, [rounds, markers, conflicts, companyOf, timezone]);

  const renderEvent = (arg: EventContentArg) => {
    const props = arg.event.extendedProps as EventProps;
    if (props.kind === "marker") {
      const style = MARKER_STYLE[props.markerKind];
      const Icon = style.icon;
      return (
        <span
          className="flex min-w-0 items-center gap-1 overflow-hidden px-1 text-xs"
          title={arg.event.title}
        >
          <Icon className="size-3 shrink-0" aria-hidden />
          <span className="sr-only">{style.label}: </span>
          <span className="truncate">{arg.event.title}</span>
        </span>
      );
    }
    const Icon = ROUND_STATUS_STYLE[props.status].icon;
    return (
      <span
        className="flex min-w-0 items-center gap-1 overflow-hidden px-1 text-xs"
        title={arg.event.title}
      >
        <Icon className="size-3 shrink-0" aria-hidden />
        {props.conflict && <AlertTriangle className="size-3 shrink-0" aria-hidden />}
        {arg.timeText && <span className="shrink-0 font-medium">{arg.timeText}</span>}
        <span className="truncate">{arg.event.title}</span>
        <span className="sr-only">{props.srLabel}</span>
      </span>
    );
  };

  return (
    <div className="ps-calendar">
      <FullCalendar
        ref={ref}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={VIEW_IDS[initialView]}
        initialDate={initialDate}
        locale={enGbLocale}
        timeZone="UTC"
        now={now}
        nowIndicator
        firstDay={1}
        height="auto"
        expandRows
        dayMaxEvents={4}
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        scrollTime="09:00:00"
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listMonth",
        }}
        buttonText={{ today: "Today", month: "Month", week: "Week", list: "Agenda" }}
        noEventsContent="No interviews or markers in this period."
        events={events}
        eventContent={renderEvent}
        eventClick={(arg: EventClickArg) => {
          arg.jsEvent.preventDefault();
          const props = arg.event.extendedProps as EventProps;
          if (props.kind === "round") onOpenRound(props.roundId);
          else if (props.roundId) onOpenRound(props.roundId);
          else if (props.href) onOpenHref(props.href);
        }}
        dateClick={(arg: DateClickArg) => onPickSlot(arg.date, arg.allDay)}
        datesSet={(arg: DatesSetArg) => {
          // Use the middle of the visible range so month views report their own month.
          const middle = new Date((arg.start.getTime() + arg.end.getTime()) / 2);
          onViewChange(viewNameFromId(arg.view.type), middle.toISOString().slice(0, 10));
        }}
      />
    </div>
  );
}
