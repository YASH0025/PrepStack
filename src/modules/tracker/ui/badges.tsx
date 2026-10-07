import {
  Ban,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Clock,
  type LucideIcon,
  PauseCircle,
  Repeat,
  UserX,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  ROUND_RESULT_LABELS,
  ROUND_STATUS_LABELS,
  type RoundResult,
  type RoundStatus,
} from "../schemas";

type Variant = "info" | "success" | "warning" | "danger" | "muted" | "outline";

/* Every status has an icon AND a colour, so it is never conveyed by colour alone. */

export const ROUND_STATUS_STYLE: Record<
  RoundStatus,
  { icon: LucideIcon; variant: Variant; color: string }
> = {
  SCHEDULED: { icon: CalendarClock, variant: "info", color: "#0284c7" },
  COMPLETED: { icon: CheckCircle2, variant: "success", color: "#059669" },
  CANCELLED: { icon: Ban, variant: "muted", color: "#737373" },
  RESCHEDULED: { icon: Repeat, variant: "warning", color: "#d97706" },
  NO_SHOW_ME: { icon: UserX, variant: "danger", color: "#dc2626" },
  NO_SHOW_THEM: { icon: CircleSlash, variant: "danger", color: "#b91c1c" },
};

export const ROUND_RESULT_STYLE: Record<RoundResult, { icon: LucideIcon; variant: Variant }> = {
  AWAITING: { icon: Clock, variant: "outline" },
  CLEARED: { icon: CheckCircle2, variant: "success" },
  REJECTED: { icon: XCircle, variant: "danger" },
  ON_HOLD: { icon: PauseCircle, variant: "warning" },
  NOT_APPLICABLE: { icon: CircleDashed, variant: "muted" },
};

const APPLICATION_VARIANT: Record<ApplicationStatus, Variant> = {
  INTERESTED: "muted",
  APPLIED: "outline",
  RECRUITER_SCREENING: "info",
  TECHNICAL_INTERVIEW: "info",
  MANAGERIAL_INTERVIEW: "info",
  HR_ROUND: "info",
  OFFER_RECEIVED: "success",
  OFFER_ACCEPTED: "success",
  REJECTED: "danger",
  WITHDRAWN: "muted",
  ON_HOLD: "warning",
};

export function RoundStatusBadge({ status }: { status: RoundStatus }) {
  const { icon: Icon, variant } = ROUND_STATUS_STYLE[status];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden /> {ROUND_STATUS_LABELS[status]}
    </Badge>
  );
}

export function RoundResultBadge({ result }: { result: RoundResult }) {
  const { icon: Icon, variant } = ROUND_RESULT_STYLE[result];
  return (
    <Badge variant={variant}>
      <Icon aria-hidden /> {ROUND_RESULT_LABELS[result]}
    </Badge>
  );
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={APPLICATION_VARIANT[status]}>{APPLICATION_STATUS_LABELS[status]}</Badge>;
}
