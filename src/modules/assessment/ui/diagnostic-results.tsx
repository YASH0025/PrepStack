import Link from "next/link";
import { CheckCircle2, CircleDashed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEPTHS, DEPTH_LABELS, DEPTH_LEVEL, type ExperienceBand } from "@/lib/domain";
import { type Topic } from "@/modules/content/schemas";

import { type AssessmentAttempt } from "../schemas";

function depthLabel(level: number): string {
  if (level === 0) return "Not yet";
  const depth = DEPTHS[level - 1];
  return depth ? DEPTH_LABELS[depth].label : "–";
}

/** Per-topic table: demonstrated depth vs the depth required at the user's level. */
export function DiagnosticResults({
  attempt,
  topics,
  band,
}: {
  attempt: AssessmentAttempt;
  topics: Topic[];
  band: ExperienceBand;
}) {
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const rows = attempt.results
    .map((result) => {
      const topic = byId.get(result.topicId);
      if (!topic) return null;
      const required = DEPTH_LEVEL[topic.depthByBand[band].depth];
      return {
        topic,
        estimated: result.estimatedDepth,
        required,
        met: result.estimatedDepth >= required,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => Number(a.met) - Number(b.met) || a.topic.name.localeCompare(b.topic.name));
  const correct = attempt.answers.filter((answer) => answer.correct).length;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        {correct} of {attempt.answers.length} answers correct.{" "}
        {rows.filter((row) => row.met).length} of {rows.length} topics already at the depth your
        level needs; those are left out of your roadmap.
      </p>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Topic</TableHead>
              <TableHead>You showed</TableHead>
              <TableHead>Needed</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.topic.id}>
                <TableCell>
                  <Link href={`/practice/topics/${row.topic.slug}`} className="hover:underline">
                    {row.topic.name}
                  </Link>
                </TableCell>
                <TableCell>{depthLabel(row.estimated)}</TableCell>
                <TableCell>{depthLabel(row.required)}</TableCell>
                <TableCell>
                  {row.met ? (
                    <Badge variant="success">
                      <CheckCircle2 aria-hidden /> Met
                    </Badge>
                  ) : (
                    <Badge variant="warning">
                      <CircleDashed aria-hidden /> In roadmap
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
