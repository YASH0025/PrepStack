import { format, parseISO } from "date-fns";

import { daysBetween } from "@/lib/local-date";
import { cn } from "@/lib/utils";

import { type Phase, type PhaseKind } from "../domain/planner";

const PHASE_STYLE: Record<PhaseKind, string> = {
  PREP: "bg-primary/80",
  INTERVIEWS: "bg-sky-500/80",
  OFFER: "bg-emerald-500/80",
  BUFFER: "bg-amber-500/80",
};

const pretty = (date: string) => format(parseISO(date), "d MMM");

/**
 * Horizontal phase timeline with a "today" marker. The bar is decorative; the
 * same information is in the list below it, so nothing depends on colour.
 */
export function NoticeTimeline({ phases, today }: { phases: Phase[]; today: string }) {
  const first = phases[0];
  const last = phases.at(-1);
  if (!first || !last) return null;
  const total = daysBetween(first.start, last.end) + 1;
  const todayOffset = daysBetween(first.start, today);
  const todayPercent = (todayOffset / total) * 100;

  return (
    <div className="grid gap-3">
      <div className="relative pt-5" aria-hidden>
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {phases.map((phase) => (
            <div
              key={phase.kind}
              className={cn(
                "h-full border-r border-background last:border-r-0",
                PHASE_STYLE[phase.kind],
              )}
              style={{ width: `${((daysBetween(phase.start, phase.end) + 1) / total) * 100}%` }}
            />
          ))}
        </div>
        {todayOffset >= 0 && todayOffset < total && (
          <div
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${todayPercent}%` }}
          >
            <span className="text-[10px] font-medium text-foreground">Today</span>
            <span className="h-5 w-0.5 bg-foreground" />
          </div>
        )}
      </div>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {phases.map((phase, index) => {
          const current = today >= phase.start && today <= phase.end;
          return (
            <li
              key={phase.kind}
              className={cn(
                "rounded-lg border p-3 text-sm",
                current && "border-primary bg-primary/5",
              )}
              aria-current={current ? "step" : undefined}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn("size-2.5 rounded-full", PHASE_STYLE[phase.kind])}
                  aria-hidden
                />
                <span className="font-medium">
                  {index + 1}. {phase.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {pretty(phase.start)} – {pretty(phase.end)} ·{" "}
                {daysBetween(phase.start, phase.end) + 1} days
                {current && " · you are here"}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
