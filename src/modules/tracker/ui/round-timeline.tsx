import { Ban, Check, Circle, CircleDot, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { type TimelineState, roundTimeline } from "../domain/rounds";
import { type Round } from "../schemas";

const STATE = {
  done: { icon: Check, label: "cleared or done", className: "border-emerald-500 text-emerald-600" },
  current: { icon: CircleDot, label: "next", className: "border-primary text-primary" },
  upcoming: {
    icon: Circle,
    label: "upcoming",
    className: "border-muted-foreground/40 text-muted-foreground",
  },
  failed: { icon: X, label: "not cleared", className: "border-destructive text-destructive" },
  cancelled: {
    icon: Ban,
    label: "cancelled",
    className: "border-muted-foreground/40 text-muted-foreground",
  },
} satisfies Record<TimelineState, unknown>;

/** Round 1 ✓ → Round 2 ● → Round 3 ○, with text labels for screen readers. */
export function RoundTimeline({ rounds, now }: { rounds: Round[]; now: Date }) {
  const timeline = roundTimeline(rounds, now);
  if (timeline.length === 0) return <p className="text-sm text-muted-foreground">No rounds yet.</p>;
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Round timeline">
      {timeline.map((entry, index) => {
        const style = STATE[entry.state];
        const Icon = style.icon;
        return (
          <li key={entry.id} className="flex items-center gap-1.5">
            {index > 0 && <span className="h-px w-4 bg-border" aria-hidden />}
            <span
              className={cn(
                "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                style.className,
              )}
              title={`Round ${entry.roundNumber}: ${style.label}`}
            >
              <Icon className="size-3" aria-hidden />R{entry.roundNumber}
              <span className="sr-only">: {style.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
