import { BookOpenCheck, Brain, ClipboardCheck, Route, Users } from "lucide-react";

import { BAND_LABELS } from "@/lib/domain";
import { formatLocalDate } from "@/lib/format";
import { FEEDBACK_AREAS, FEEDBACK_AREA_LABELS } from "@/modules/mock/schemas";

import { type PassportData } from "../schemas";

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="h-2 rounded-full bg-muted"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label}
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}

function Stat({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Route;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid content-start gap-2 rounded-lg border p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" aria-hidden /> {title}
      </h2>
      {children}
    </section>
  );
}

/** Shared by the owner's preview and the public share page. */
export function PassportView({
  data,
  generatedAt,
}: {
  data: PassportData;
  generatedAt: string | null;
}) {
  const topicsPct = data.topics.total
    ? Math.round((data.topics.atTarget / data.topics.total) * 100)
    : 0;
  return (
    <article className="grid gap-4" aria-label={`Readiness passport of ${data.displayName}`}>
      <header className="grid gap-1">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Readiness passport</p>
        <h1 className="text-2xl font-semibold tracking-tight">{data.displayName}</h1>
        <p className="text-sm text-muted-foreground">
          Preparing for {data.roleName} · {BAND_LABELS[data.band]}
          {data.trackName && ` · ${data.trackName}`}
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat icon={BookOpenCheck} title="Topics at target depth">
          <p className="text-2xl font-semibold">
            {data.topics.atTarget}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              / {data.topics.total}
            </span>
          </p>
          <Meter value={topicsPct} label="Topics at target depth" />
          <ul className="grid gap-1 text-xs text-muted-foreground">
            {data.topics.byCategory.slice(0, 8).map((category) => (
              <li key={category.category} className="flex justify-between gap-2">
                <span>{category.category}</span>
                <span>
                  {category.atTarget}/{category.total}
                </span>
              </li>
            ))}
          </ul>
        </Stat>
        <Stat icon={Route} title="Study plan">
          {data.plan ? (
            <>
              <p className="text-2xl font-semibold">{data.plan.progressPct}%</p>
              <Meter value={data.plan.progressPct} label="Study plan progress" />
              <p className="text-xs text-muted-foreground">
                {data.plan.done} of {data.plan.total} planned tasks done
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active plan.</p>
          )}
        </Stat>
        <Stat icon={Brain} title="Spaced repetition">
          <p className="text-sm">
            <span className="text-2xl font-semibold">{data.review.streakDays}</span>-day streak
          </p>
          <p className="text-xs text-muted-foreground">
            {data.review.mastered} cards mastered · {data.review.reviewedThisWeek} reviews this week
          </p>
        </Stat>
        <Stat icon={ClipboardCheck} title="Diagnostic">
          {data.diagnostic ? (
            <>
              <p className="text-2xl font-semibold">{data.diagnostic.atTargetPct}%</p>
              <p className="text-xs text-muted-foreground">
                of assessed topics at target depth ·{" "}
                {formatLocalDate(`${data.diagnostic.month}-01`, "MMM yyyy")}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Not taken yet.</p>
          )}
        </Stat>
        {data.mock && (
          <Stat icon={Users} title="Peer mock interviews">
            <p className="text-sm">
              <span className="text-2xl font-semibold">{data.mock.overall}</span>/5 from{" "}
              {data.mock.sessions} sessions
            </p>
            <ul className="grid gap-1 text-xs text-muted-foreground">
              {FEEDBACK_AREAS.map((area) => (
                <li key={area} className="flex justify-between gap-2">
                  <span>{FEEDBACK_AREA_LABELS[area]}</span>
                  <span>{data.mock?.byArea[area] ?? "–"}</span>
                </li>
              ))}
            </ul>
          </Stat>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Self-reported preparation data from PrepStack
        {generatedAt && `, updated ${formatLocalDate(generatedAt.slice(0, 10), "d MMM yyyy")}`}.
        Peer scores are averages of ratings from mock interview partners.
      </p>
    </article>
  );
}
