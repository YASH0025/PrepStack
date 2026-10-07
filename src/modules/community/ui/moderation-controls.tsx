"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Check, EyeOff, Loader2, Pencil, Trash2, X } from "lucide-react";

import { applyServerErrors } from "@/components/rhf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ActionResult } from "@/lib/forms";

import {
  approveReportAction,
  deleteReportAction,
  dismissFlagsAction,
  editReportAction,
  hideReportAction,
} from "../moderation-actions";
import { type ReportDraft, ReportDraftSchema, type ReportStatus } from "../schemas";
import { ReportDraftFields } from "./report-draft-fields";

export function ModerationControls({
  reportId,
  status,
  hasFlags,
  draft,
  topicNames,
}: {
  reportId: string;
  status: ReportStatus;
  hasFlags: boolean;
  draft: ReportDraft;
  topicNames: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) setError(result.error);
      else router.refresh();
    });

  if (editing) {
    return (
      <EditForm
        reportId={reportId}
        draft={draft}
        topicNames={topicNames}
        onDone={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

  const noteId = `moderation-note-${reportId}`;
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={noteId} className="text-xs">
          Note (shown to the author when hiding or editing)
        </Label>
        <Input
          id={noteId}
          value={note}
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {status !== "PUBLISHED" && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => approveReportAction(reportId))}
          >
            <Check /> {status === "HIDDEN" ? "Restore" : "Approve"}
          </Button>
        )}
        {status !== "HIDDEN" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => hideReportAction(reportId, note))}
          >
            <EyeOff /> Hide
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing(true)}>
          <Pencil /> Edit for anonymity
        </Button>
        {hasFlags && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => dismissFlagsAction(reportId))}
          >
            <X /> Dismiss flags
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Permanently delete this report?")) {
              run(() => deleteReportAction(reportId));
            }
          }}
        >
          <Trash2 /> Delete
        </Button>
        {pending && <Loader2 className="size-4 animate-spin self-center" aria-label="Working" />}
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function EditForm({
  reportId,
  draft,
  topicNames,
  onDone,
}: {
  reportId: string;
  draft: ReportDraft;
  topicNames: Record<string, string>;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("Edited to remove identifying details");
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ReportDraft>({
    resolver: zodResolver(ReportDraftSchema),
    defaultValues: draft,
  });
  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await editReportAction(reportId, values, note);
      if (!result.ok) {
        applyServerErrors(result, form.setError);
        setError(result.error);
        return;
      }
      onDone();
    }),
  );
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <ReportDraftFields form={form} topicNames={topicNames} />
      <div className="grid gap-1.5">
        <Label htmlFor={`edit-note-${reportId}`}>Moderation note</Label>
        <Input
          id={`edit-note-${reportId}`}
          value={note}
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Save changes
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
