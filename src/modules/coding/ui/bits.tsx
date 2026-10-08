import { CircleCheckBig, CircleDashed, CircleDot } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { type ProblemStatus } from "../domain/stats";
import { DIFFICULTY_LABELS, type Difficulty } from "../schemas";

const DIFFICULTY_VARIANT = {
  EASY: "success",
  MEDIUM: "warning",
  HARD: "danger",
} as const;

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <Badge variant={DIFFICULTY_VARIANT[difficulty]}>{DIFFICULTY_LABELS[difficulty]}</Badge>;
}

const STATUS = {
  SOLVED: {
    icon: CircleCheckBig,
    label: "Solved",
    className: "text-emerald-600 dark:text-emerald-400",
  },
  ATTEMPTED: {
    icon: CircleDot,
    label: "Attempted",
    className: "text-amber-600 dark:text-amber-400",
  },
  TODO: { icon: CircleDashed, label: "Not started", className: "text-muted-foreground" },
} as const;

export const STATUS_LABELS: Record<ProblemStatus, string> = {
  SOLVED: STATUS.SOLVED.label,
  ATTEMPTED: STATUS.ATTEMPTED.label,
  TODO: STATUS.TODO.label,
};

export function StatusIcon({ status, className }: { status: ProblemStatus; className?: string }) {
  const { icon: Icon, label, className: tone } = STATUS[status];
  return (
    <span className={cn("inline-flex", tone, className)} title={label}>
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
