import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Next scheduled mock interview, or nothing when there is none. */
export function NextMockCard({
  next,
  timezone,
}: {
  next: { sessionId: string; startUtc: string; partnerName: string; hasLink: boolean } | null;
  timezone: string;
}) {
  if (!next) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mock interview</CardTitle>
        <CardDescription>
          With {next.partnerName} ·{" "}
          {formatInTimeZone(new Date(next.startUtc), timezone, "EEE d MMM, HH:mm")}
        </CardDescription>
        <CardAction>
          <Users className="size-5 text-primary" aria-hidden />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link href={`/practice/mock/sessions/${next.sessionId}`}>Open session</Link>
        </Button>
        {!next.hasLink && (
          <span className="text-xs text-muted-foreground">No meeting link yet</span>
        )}
      </CardContent>
    </Card>
  );
}
