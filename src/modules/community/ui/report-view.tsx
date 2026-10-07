import { Clock, Gauge } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BAND_LABELS, QUESTION_TYPE_LABELS, ROUND_TYPE_LABELS } from "@/lib/domain";
import { formatLocalDate } from "@/lib/format";

import { type Outcome, OUTCOME_LABELS, type ReportDraft } from "../schemas";

const OUTCOME_BADGE: Record<Outcome, "success" | "danger" | "info" | "muted"> = {
  CLEARED: "success",
  REJECTED: "danger",
  PENDING: "info",
  UNDISCLOSED: "muted",
};

export function formatMonthYear(monthYear: string): string {
  return formatLocalDate(`${monthYear}-01`, "MMM yyyy");
}

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  return <Badge variant={OUTCOME_BADGE[outcome]}>{OUTCOME_LABELS[outcome]}</Badge>;
}

export function questionTopic(
  question: ReportDraft["rounds"][number]["questions"][number],
  topicNames: Record<string, string>,
): string | null {
  if (question.topicId) return topicNames[question.topicId] ?? null;
  return question.topicLabel;
}

/**
 * The public face of a report. Used for the share preview AND the real report
 * page, so the preview is exactly what others will see.
 */
export function ReportView({
  report,
  topicNames,
}: {
  report: ReportDraft;
  topicNames: Record<string, string>;
}) {
  return (
    <article className="grid gap-4" aria-label={`${report.companyName} interview report`}>
      <header className="grid gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h2 className="text-lg font-semibold">{report.companyName}</h2>
          <span className="text-muted-foreground">· {report.roleTitle}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <OutcomeBadge outcome={report.outcome} />
          <span>{formatMonthYear(report.monthYear)}</span>
          <span>· {BAND_LABELS[report.experienceBand]}</span>
          <span className="inline-flex items-center gap-1">
            · <Gauge className="size-3.5" aria-hidden /> Difficulty {report.overallDifficulty}/5
          </span>
        </div>
        {report.technologies.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Technologies">
            {report.technologies.map((tech) => (
              <li key={tech}>
                <Badge variant="outline">{tech}</Badge>
              </li>
            ))}
          </ul>
        )}
      </header>
      {report.summary && <p className="text-sm whitespace-pre-line">{report.summary}</p>}
      {report.rounds.map((round, index) => (
        <section key={index} className="grid gap-2 rounded-lg border p-3">
          <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
            {ROUND_TYPE_LABELS[round.type]}
            <span className="text-xs font-normal text-muted-foreground">
              Difficulty {round.difficulty}/5
            </span>
            {round.durationMinutes && (
              <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <Clock className="size-3" aria-hidden /> about {round.durationMinutes} min
              </span>
            )}
          </h3>
          {round.questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions shared for this round.</p>
          ) : (
            <ol className="grid gap-2">
              {round.questions.map((question, questionIndex) => {
                const topic = questionTopic(question, topicNames);
                return (
                  <li key={questionIndex} className="grid gap-1 text-sm">
                    <span className="whitespace-pre-line">{question.text}</span>
                    <span className="flex flex-wrap gap-1.5">
                      <Badge variant="muted">{QUESTION_TYPE_LABELS[question.type]}</Badge>
                      {topic && <Badge variant="secondary">{topic}</Badge>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ))}
    </article>
  );
}
