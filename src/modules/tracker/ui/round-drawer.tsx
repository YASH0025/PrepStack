"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  CalendarClock,
  CheckSquare,
  ExternalLink,
  MapPin,
  Pencil,
  Repeat,
  Video,
  XCircle,
} from "lucide-react";

import { SecretValue } from "@/components/secret-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ROUND_TYPE_LABELS } from "@/lib/domain";
import { formatLocalDate, formatRoundTime, timezoneLabel } from "@/lib/format";

import { loadRoundPrepAction } from "../actions";
import { durationMinutes } from "../domain/rounds";
import { type RoundPrep } from "../prep";
import { type Application, MODE_LABELS, type Round, SOURCE_LABELS } from "../schemas";
import { ApplicationStatusBadge, RoundResultBadge, RoundStatusBadge } from "./badges";
import { ChecklistEditor } from "./checklist-editor";
import { CancelRoundDialog, OutcomeDialog, RescheduleRoundDialog } from "./round-dialogs";
import {
  Attachments,
  DrawerSection,
  FollowUpForm,
  InterviewerQuestions,
  RescheduleHistory,
  RoundNotes,
  SuggestedStories,
  TopicsToRevise,
} from "./round-drawer-sections";
import { RoundFormDialog } from "./round-form";
import { REMINDER_OPTIONS } from "./round-form";
import { RoundTimeline } from "./round-timeline";

type Dialog = "edit" | "outcome" | "cancel" | "reschedule" | "next" | null;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

function reminderLabel(minutes: number) {
  return (
    REMINDER_OPTIONS.find((option) => option.minutes === minutes)?.label ??
    (minutes >= 60 ? `${Math.round(minutes / 60)} hours before` : `${minutes} minutes before`)
  );
}

/**
 * Detail drawer for one interview round. Sections adapt to the round's status:
 * prep for scheduled rounds, debrief for completed ones, history for
 * cancelled/rescheduled ones.
 */
export function RoundDrawer({
  round,
  application,
  allRounds,
  applications,
  timezone,
  reminderMinutes,
  uploadsEnabled,
  onClose,
  onOpenRound,
}: {
  round: Round;
  application: Application | undefined;
  allRounds: Round[];
  applications: Application[];
  timezone: string;
  reminderMinutes: number[];
  uploadsEnabled: boolean;
  onClose: () => void;
  onOpenRound: (id: string) => void;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [prep, setPrep] = useState<RoundPrep | null>(null);
  const [loading, startLoading] = useTransition();
  const [now] = useState(() => new Date());
  const scheduled = round.status === "SCHEDULED";
  const title = `Round ${round.roundNumber} – ${round.title ?? ROUND_TYPE_LABELS[round.type]}`;
  const siblings = allRounds.filter((entry) => entry.applicationId === round.applicationId);

  useEffect(() => {
    startLoading(async () => {
      const result = await loadRoundPrepAction(round.id);
      if (result.ok) setPrep(result.data);
    });
  }, [round.id, round.updatedAt]);

  const mapUrl = round.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(round.location)}`
    : null;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        {/* 1. Header */}
        <SheetHeader>
          <SheetTitle>{application?.companyName ?? "Interview"}</SheetTitle>
          <SheetDescription>
            {application?.jobTitle} · {title}
          </SheetDescription>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <RoundStatusBadge status={round.status} />
            <RoundResultBadge result={round.result} />
          </div>
        </SheetHeader>
        <SheetBody className="grid content-start gap-4 pt-4">
          <dl className="grid grid-cols-2 gap-3">
            <Field label="When">
              {formatRoundTime(round.startUtc, round.endUtc, timezone)}
              <span className="block text-xs text-muted-foreground">
                {timezoneLabel(timezone, new Date(round.startUtc))}
                {round.timezone !== timezone &&
                  ` · ${formatRoundTime(round.startUtc, round.endUtc, round.timezone)} ${round.timezone}`}
              </span>
            </Field>
            <Field label="Duration">{durationMinutes(round.startUtc, round.endUtc)} min</Field>
            <Field label="Mode">{MODE_LABELS[round.mode]}</Field>
            <Field label="Where">
              {round.mode === "ONSITE" ? (
                mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 underline"
                  >
                    <MapPin className="size-3.5" /> {round.location}
                  </a>
                ) : (
                  "–"
                )
              ) : round.meetingLink ? (
                <Button asChild size="sm">
                  <a href={round.meetingLink} target="_blank" rel="noreferrer noopener">
                    <Video /> Join meeting
                  </a>
                </Button>
              ) : (
                "No link yet"
              )}
            </Field>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setDialog("edit")}>
              <Pencil /> Edit
            </Button>
            {scheduled && (
              <>
                <Button size="sm" variant="outline" onClick={() => setDialog("reschedule")}>
                  <Repeat /> Reschedule
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDialog("cancel")}>
                  <XCircle /> Cancel
                </Button>
              </>
            )}
            <Button size="sm" onClick={() => setDialog("outcome")}>
              <CheckSquare /> {scheduled ? "Mark completed" : "Update outcome"}
            </Button>
          </div>

          {/* 2. People */}
          <DrawerSection title="People">
            <dl className="grid grid-cols-2 gap-3">
              <Field label="HR / recruiter">
                {round.people.hr.name ?? "–"}
                {round.people.hr.email && (
                  <a href={`mailto:${round.people.hr.email}`} className="block text-xs underline">
                    {round.people.hr.email}
                  </a>
                )}
                {round.people.hr.phone && (
                  <a href={`tel:${round.people.hr.phone}`} className="block text-xs underline">
                    {round.people.hr.phone}
                  </a>
                )}
                {round.people.hr.linkedin && (
                  <span className="block text-xs">{round.people.hr.linkedin}</span>
                )}
              </Field>
              <Field label="Interviewers">
                {round.people.interviewers.length === 0
                  ? "–"
                  : round.people.interviewers.map((person) => (
                      <span key={person.name} className="block">
                        {person.name}
                        {person.designation && (
                          <span className="text-xs text-muted-foreground">
                            {" "}
                            · {person.designation}
                          </span>
                        )}
                      </span>
                    ))}
              </Field>
              <Field label="Referrer">{application?.referrerName ?? "–"}</Field>
              <Field label="Agency / consultant">{application?.agency ?? "–"}</Field>
            </dl>
            <p className="text-xs text-muted-foreground">
              Third-party details are encrypted, visible only to you, and never exported or
              published.
            </p>
          </DrawerSection>

          {/* 3. Application context */}
          {application && (
            <DrawerSection title="Application">
              <div className="flex flex-wrap items-center gap-2">
                <ApplicationStatusBadge status={application.status} />
                <span className="text-xs text-muted-foreground">
                  via {SOURCE_LABELS[application.source]}
                </span>
                {application.jobLink && (
                  <a
                    href={application.jobLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-xs underline"
                  >
                    Job description <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <RoundTimeline rounds={siblings} now={now} />
              <dl className="grid grid-cols-2 gap-3">
                <Field label="Expected salary">
                  <SecretValue value={application.expectedSalary} label="expected salary" />
                </Field>
                <Field label="Offered salary">
                  <SecretValue value={application.offeredSalary} label="offered salary" />
                </Field>
              </dl>
              <Link
                href={`/interviews/tracker?app=${application.id}`}
                className="w-fit text-xs underline"
              >
                Open in tracker
              </Link>
            </DrawerSection>
          )}

          {/* 4. Prep (scheduled rounds) */}
          {scheduled && (
            <DrawerSection title="Prep">
              <ChecklistEditor key={round.id} roundId={round.id} items={round.prepChecklist} />
              <div className="grid gap-2">
                <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Topics to revise
                </h4>
                {loading && !prep ? (
                  <Skeleton className="h-12" />
                ) : (
                  <TopicsToRevise topics={prep?.topicsToRevise ?? []} />
                )}
              </div>
              {prep?.stories && (
                <div className="grid gap-2">
                  <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Stories to rehearse
                  </h4>
                  <SuggestedStories stories={prep.stories} />
                </div>
              )}
              <div className="grid gap-2">
                <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Questions to ask the interviewer
                </h4>
                <InterviewerQuestions round={round} curated={prep?.interviewerQuestions ?? []} />
              </div>
            </DrawerSection>
          )}

          {/* 6. Cancelled / rescheduled */}
          {(round.status === "CANCELLED" ||
            round.status === "RESCHEDULED" ||
            round.rescheduledFromId) && (
            <DrawerSection
              title={round.status === "CANCELLED" ? "Cancelled" : "Reschedule history"}
            >
              {round.cancelReason && (
                <p className="text-sm">
                  {round.cancelReason}
                  {round.cancelledBy && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {round.cancelledBy === "ME" ? "by you" : "by the company"}
                    </span>
                  )}
                </p>
              )}
              {round.rescheduledToId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit"
                  onClick={() => onOpenRound(round.rescheduledToId as string)}
                >
                  <CalendarClock /> Open the new round
                </Button>
              )}
              <RescheduleHistory
                round={round}
                all={allRounds}
                onOpenRound={onOpenRound}
                timezone={timezone}
              />
            </DrawerSection>
          )}

          {/* 7. Follow-up and reminders */}
          <DrawerSection title="Follow-up and reminders">
            <FollowUpForm round={round} />
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">Reminders:</span>
              {round.reminderMinutes.length === 0 ? (
                <span>none</span>
              ) : (
                round.reminderMinutes.map((minutes) => (
                  <Badge key={minutes} variant="outline">
                    {reminderLabel(minutes)}
                  </Badge>
                ))
              )}
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => setDialog("edit")}
              >
                Change
              </Button>
            </div>
            {application?.followUpDate && (
              <p className="text-xs text-muted-foreground">
                Application follow-up: {formatLocalDate(application.followUpDate)}
              </p>
            )}
          </DrawerSection>

          {/* 8. Notes and attachments */}
          <DrawerSection title="Notes and attachments">
            <RoundNotes key={`${round.id}-${round.updatedAt}`} round={round} />
            <Attachments round={round} uploadsEnabled={uploadsEnabled} />
          </DrawerSection>
        </SheetBody>
      </SheetContent>

      {dialog === "edit" && (
        <RoundFormDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          applications={applications}
          round={round}
          timezone={timezone}
          reminderMinutes={reminderMinutes}
        />
      )}
      {dialog === "next" && (
        <RoundFormDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          applications={applications}
          applicationId={round.applicationId}
          timezone={timezone}
          reminderMinutes={reminderMinutes}
        />
      )}
      {dialog === "outcome" && (
        <OutcomeDialog
          open
          round={round}
          onOpenChange={(open) =>
            !open && setDialog((current) => (current === "outcome" ? null : current))
          }
          onScheduleNext={() => setDialog("next")}
        />
      )}
      {dialog === "cancel" && (
        <CancelRoundDialog open round={round} onOpenChange={(open) => !open && setDialog(null)} />
      )}
      {dialog === "reschedule" && (
        <RescheduleRoundDialog
          open
          round={round}
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}
    </Sheet>
  );
}
