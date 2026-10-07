"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CalendarPlus,
  CheckSquare,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Repeat,
  Trash2,
  XCircle,
} from "lucide-react";

import { SecretValue } from "@/components/secret-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatLocalDate, formatRoundTime } from "@/lib/format";
import { ROUND_TYPE_LABELS } from "@/lib/domain";

import { deleteApplicationAction, deleteRoundAction, setApplicationStatusAction } from "../actions";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type Application,
  type ApplicationStatus,
  type Round,
  SOURCE_LABELS,
} from "../schemas";
import { ApplicationFormDialog } from "./application-form";
import { RoundResultBadge, RoundStatusBadge } from "./badges";
import { ChecklistEditor } from "./checklist-editor";
import { CancelRoundDialog, OutcomeDialog, RescheduleRoundDialog } from "./round-dialogs";
import { RoundFormDialog } from "./round-form";
import { RoundTimeline } from "./round-timeline";

type RoundDialog = { kind: "edit" | "outcome" | "cancel" | "reschedule"; round: Round } | null;

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/**
 * Side panel for one application: details, round timeline and rounds, the
 * prep checklist of the next round, private notes, and actions.
 */
export function ApplicationPanel({
  application,
  rounds,
  applications,
  timezone,
  reminderMinutes,
  onClose,
  extra,
}: {
  application: Application | null;
  rounds: Round[];
  applications: Application[];
  timezone: string;
  reminderMinutes: number[];
  onClose: () => void;
  /** Extra sections (e.g. community reports for this company). */
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [newRoundOpen, setNewRoundOpen] = useState(false);
  const [dialog, setDialog] = useState<RoundDialog>(null);
  const [pending, startTransition] = useTransition();
  const [now] = useState(() => new Date());

  if (!application) return null;
  const appRounds = rounds
    .filter((round) => round.applicationId === application.id)
    .sort((a, b) => a.roundNumber - b.roundNumber || a.startUtc.localeCompare(b.startUtc));
  const nextRound = appRounds.find(
    (round) => round.status === "SCHEDULED" && new Date(round.endUtc) >= now,
  );

  const changeStatus = (status: ApplicationStatus) =>
    startTransition(async () => {
      await setApplicationStatusAction(application.id, status);
      router.refresh();
    });

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{application.companyName}</SheetTitle>
          <SheetDescription>{application.jobTitle}</SheetDescription>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label htmlFor="panel-status" className="sr-only">
              Application status
            </label>
            <NativeSelect
              id="panel-status"
              className="h-8 w-52"
              value={application.status}
              disabled={pending}
              onChange={(event) => changeStatus(event.target.value as ApplicationStatus)}
            >
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {APPLICATION_STATUS_LABELS[status]}
                </option>
              ))}
            </NativeSelect>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
            <Button size="sm" onClick={() => setNewRoundOpen(true)}>
              <CalendarPlus /> Add round
            </Button>
          </div>
        </SheetHeader>
        <SheetBody className="grid content-start gap-6 pt-4">
          <section className="grid gap-2" aria-label="Round timeline">
            <RoundTimeline rounds={appRounds} now={now} />
          </section>

          <dl className="grid grid-cols-2 gap-3">
            <Detail label="Source">{SOURCE_LABELS[application.source]}</Detail>
            <Detail label="Applied on">
              {application.appliedOn ? formatLocalDate(application.appliedOn) : "–"}
            </Detail>
            <Detail label="Referrer">{application.referrerName ?? "–"}</Detail>
            <Detail label="Agency">{application.agency ?? "–"}</Detail>
            <Detail label="Expected salary">
              <SecretValue value={application.expectedSalary} label="expected salary" />
            </Detail>
            <Detail label="Offered salary">
              <SecretValue value={application.offeredSalary} label="offered salary" />
            </Detail>
            <Detail label="Follow up">
              {application.followUpDate ? formatLocalDate(application.followUpDate) : "–"}
            </Detail>
            <Detail label="Technologies">{application.technologies.join(", ") || "–"}</Detail>
            {application.jobLink && (
              <Detail label="Job link">
                <a
                  href={application.jobLink}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 underline"
                >
                  Open <ExternalLink className="size-3" />
                </a>
              </Detail>
            )}
          </dl>

          <Separator />

          <section className="grid gap-3">
            <h3 className="text-sm font-semibold">Rounds</h3>
            {appRounds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rounds yet. Add one to get reminders, a prep plan toward the date and a revision
                sheet.
              </p>
            ) : (
              <ul className="grid gap-2">
                {appRounds.map((round) => (
                  <li key={round.id} className="grid gap-2 rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid gap-0.5">
                        <Link
                          href={`/interviews/calendar?round=${round.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          Round {round.roundNumber} – {round.title ?? ROUND_TYPE_LABELS[round.type]}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {formatRoundTime(round.startUtc, round.endUtc, timezone)}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for round ${round.roundNumber}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setDialog({ kind: "edit", round })}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setDialog({ kind: "outcome", round })}>
                            <CheckSquare /> Record outcome
                          </DropdownMenuItem>
                          {round.status === "SCHEDULED" && (
                            <>
                              <DropdownMenuItem
                                onSelect={() => setDialog({ kind: "reschedule", round })}
                              >
                                <Repeat /> Reschedule
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => setDialog({ kind: "cancel", round })}
                              >
                                <XCircle /> Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => {
                              if (
                                !window.confirm(
                                  `Delete round ${round.roundNumber}? This cannot be undone.`,
                                )
                              )
                                return;
                              startTransition(async () => {
                                await deleteRoundAction(round.id);
                                router.refresh();
                              });
                            }}
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <RoundStatusBadge status={round.status} />
                      <RoundResultBadge result={round.result} />
                      {round.cancelReason && <Badge variant="muted">{round.cancelReason}</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {nextRound && (
            <section className="grid gap-3">
              <h3 className="text-sm font-semibold">
                Prep checklist · Round {nextRound.roundNumber}
              </h3>
              <ChecklistEditor
                key={nextRound.id}
                roundId={nextRound.id}
                items={nextRound.prepChecklist}
              />
            </section>
          )}

          {extra}

          <section className="grid gap-2">
            <h3 className="text-sm font-semibold">Private notes</h3>
            {application.notes ? (
              <p className="text-sm whitespace-pre-wrap">{application.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes. Add them with Edit.</p>
            )}
          </section>

          <Separator />
          <Button
            variant="outline"
            className="w-fit text-destructive"
            disabled={pending}
            onClick={() => {
              if (
                !window.confirm(
                  `Delete ${application.companyName} with all its rounds? This cannot be undone.`,
                )
              )
                return;
              startTransition(async () => {
                await deleteApplicationAction(application.id);
                onClose();
                router.refresh();
              });
            }}
          >
            <Trash2 /> Delete application
          </Button>
        </SheetBody>
      </SheetContent>

      <ApplicationFormDialog open={editOpen} onOpenChange={setEditOpen} application={application} />
      <RoundFormDialog
        open={newRoundOpen}
        onOpenChange={setNewRoundOpen}
        applications={applications}
        applicationId={application.id}
        timezone={timezone}
        reminderMinutes={reminderMinutes}
      />
      {dialog?.kind === "edit" && (
        <RoundFormDialog
          open
          onOpenChange={(open) => !open && setDialog(null)}
          applications={applications}
          round={dialog.round}
          timezone={timezone}
          reminderMinutes={reminderMinutes}
        />
      )}
      {dialog?.kind === "outcome" && (
        <OutcomeDialog
          open
          round={dialog.round}
          onOpenChange={(open) => !open && setDialog(null)}
          onScheduleNext={() => setNewRoundOpen(true)}
        />
      )}
      {dialog?.kind === "cancel" && (
        <CancelRoundDialog
          open
          round={dialog.round}
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}
      {dialog?.kind === "reschedule" && (
        <RescheduleRoundDialog
          open
          round={dialog.round}
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}
    </Sheet>
  );
}
