"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Download, Loader2, Paperclip, Plus, Trash2, X } from "lucide-react";

import { FormField } from "@/components/rhf";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatLocalDate } from "@/lib/format";

import {
  removeAttachmentAction,
  setRoundFollowUpAction,
  setRoundNotesAction,
  updateInterviewerQuestionsAction,
} from "../actions";
import { type Round } from "../schemas";

/** Section wrapper used inside the drawer. */
export function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t pt-4" aria-label={title}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/* Questions to ask the interviewer ---------------------------------------------- */

export function InterviewerQuestions({ round, curated }: { round: Round; curated: string[] }) {
  const router = useRouter();
  const [own, setOwn] = useState(round.interviewerQuestions);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();
  const save = (next: string[]) => {
    setOwn(next);
    startTransition(async () => {
      await updateInterviewerQuestionsAction(round.id, next);
      router.refresh();
    });
  };
  return (
    <div className="grid gap-2">
      <ul className="grid list-disc gap-1 pl-5 text-sm">
        {curated.map((question) => (
          <li key={question}>{question}</li>
        ))}
        {own.map((question) => (
          <li key={question} className="group">
            <span className="inline-flex items-start gap-1">
              {question}
              <button
                type="button"
                className="rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={`Remove "${question}"`}
                onClick={() => save(own.filter((entry) => entry !== question))}
              >
                <X className="size-3" />
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim().slice(0, 300);
          if (!text || own.includes(text)) return;
          save([...own, text]);
          setDraft("");
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add your own question"
          aria-label="Add a question to ask"
          className="h-8"
        />
        <Button type="submit" size="sm" variant="outline" disabled={!draft.trim()}>
          <Plus /> Add
        </Button>
      </form>
    </div>
  );
}

/* Follow-up --------------------------------------------------------------------- */

const FollowUpFormSchema = z.object({
  followUpDate: z.string(),
  followUpNote: z.string().max(300, "Keep it under 300 characters"),
});

export function FollowUpForm({ round }: { round: Round }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof FollowUpFormSchema>>({
    resolver: zodResolver(FollowUpFormSchema),
    defaultValues: {
      followUpDate: round.followUpDate ?? "",
      followUpNote: round.followUpNote ?? "",
    },
  });
  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await setRoundFollowUpAction({ roundId: round.id, ...values });
      setSaved(result.ok);
      if (result.ok) {
        form.reset(values);
        router.refresh();
      }
    }),
  );
  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <FormField id={`fu-date-${round.id}`} label="Follow up on">
          {(c) => <Input {...c} type="date" {...form.register("followUpDate")} />}
        </FormField>
        <FormField
          id={`fu-note-${round.id}`}
          label="Note"
          error={form.formState.errors.followUpNote}
        >
          {(c) => (
            <Input
              {...c}
              placeholder="e.g. No reply from HR in 5 days"
              {...form.register("followUpNote")}
            />
          )}
        </FormField>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={pending || !form.formState.isDirty}
        >
          {pending && <Loader2 className="animate-spin" />}
          Save follow-up
        </Button>
        {saved && !form.formState.isDirty && (
          <span className="text-xs text-muted-foreground">Saved</span>
        )}
      </div>
    </form>
  );
}

/* Notes ------------------------------------------------------------------------- */

export function RoundNotes({ round }: { round: Round }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<{ notes: string }>({
    resolver: zodResolver(z.object({ notes: z.string().max(5000, "Notes are too long") })),
    defaultValues: { notes: round.notes ?? "" },
  });
  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await setRoundNotesAction(round.id, values.notes);
      if (result.ok) {
        form.reset(values);
        router.refresh();
      }
    }),
  );
  return (
    <form onSubmit={submit} className="grid gap-2">
      <label htmlFor={`notes-${round.id}`} className="sr-only">
        Private notes
      </label>
      <Textarea
        id={`notes-${round.id}`}
        rows={4}
        placeholder="Private notes (encrypted)"
        {...form.register("notes")}
      />
      {form.formState.errors.notes && (
        <p className="text-xs text-destructive">{form.formState.errors.notes.message}</p>
      )}
      <Button
        type="submit"
        size="sm"
        variant="outline"
        className="w-fit"
        disabled={pending || !form.formState.isDirty}
      >
        {pending && <Loader2 className="animate-spin" />}
        Save notes
      </Button>
    </form>
  );
}

/* Attachments ------------------------------------------------------------------- */

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.docx";

export function Attachments({ round, uploadsEnabled }: { round: Round; uploadsEnabled: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const upload = (file: File) =>
    startTransition(async () => {
      setError(null);
      const body = new FormData();
      body.set("roundId", round.id);
      body.set("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Upload failed");
      }
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });

  return (
    <div className="grid gap-2">
      {round.attachments.length > 0 && (
        <ul className="grid gap-1.5">
          {round.attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-2 text-sm">
              <Paperclip className="size-3.5 text-muted-foreground" aria-hidden />
              <a
                href={`/api/attachments/${round.id}/${attachment.id}`}
                className="min-w-0 flex-1 truncate hover:underline"
              >
                {attachment.fileName}
              </a>
              <span className="text-xs text-muted-foreground">
                {Math.ceil(attachment.bytes / 1024)} KB
              </span>
              <Button
                asChild
                variant="ghost"
                size="icon-sm"
                aria-label={`Download ${attachment.fileName}`}
              >
                <a href={`/api/attachments/${round.id}/${attachment.id}`}>
                  <Download />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${attachment.fileName}`}
                onClick={() => {
                  if (!window.confirm(`Delete ${attachment.fileName}?`)) return;
                  startTransition(async () => {
                    await removeAttachmentAction(round.id, attachment.id);
                    router.refresh();
                  });
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {uploadsEnabled ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            id={`upload-${round.id}`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload(file);
            }}
          />
          <Button asChild size="sm" variant="outline" disabled={pending}>
            <label htmlFor={`upload-${round.id}`} className="cursor-pointer">
              {pending ? <Loader2 className="animate-spin" /> : <Paperclip />}
              Attach a file
            </label>
          </Button>
          <span className="text-xs text-muted-foreground">
            PDF, image, text or Word, up to 10 MB
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Attachments need file storage (Cloudinary) to be configured by the site owner.
        </p>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/* Cancel / reschedule history ----------------------------------------------------- */

export function RescheduleHistory({
  round,
  all,
  onOpenRound,
  timezone,
}: {
  round: Round;
  all: Round[];
  onOpenRound: (id: string) => void;
  timezone: string;
}) {
  // Walk back and forward through the reschedule chain.
  const byId = new Map(all.map((entry) => [entry.id, entry]));
  const chain: Round[] = [];
  let cursor: Round | undefined = round;
  while (cursor?.rescheduledFromId && byId.get(cursor.rescheduledFromId) && chain.length < 20) {
    cursor = byId.get(cursor.rescheduledFromId);
  }
  while (cursor && chain.length < 20) {
    chain.push(cursor);
    cursor = cursor.rescheduledToId ? byId.get(cursor.rescheduledToId) : undefined;
  }
  if (chain.length <= 1) return null;
  return (
    <ol className="grid gap-1 text-sm">
      {chain.map((entry) => (
        <li key={entry.id} className="flex items-center gap-2">
          <button
            type="button"
            className={entry.id === round.id ? "font-medium" : "underline"}
            onClick={() => onOpenRound(entry.id)}
            disabled={entry.id === round.id}
          >
            {formatLocalDate(entry.startUtc.slice(0, 10), "d MMM")}
          </button>
          <span className="text-xs text-muted-foreground">
            {entry.status === "RESCHEDULED"
              ? `moved${entry.cancelReason ? `: ${entry.cancelReason}` : ""}`
              : entry.status.toLowerCase()}
          </span>
          {timezone !== entry.timezone && (
            <span className="text-xs text-muted-foreground">({entry.timezone})</span>
          )}
        </li>
      ))}
    </ol>
  );
}

export function TopicsToRevise({
  topics,
}: {
  topics: { slug: string; name: string; reason: string }[];
}) {
  if (topics.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing outstanding on your roadmap before this round.
      </p>
    );
  }
  return (
    <ul className="grid gap-1.5">
      {topics.map((topic) => (
        <li key={topic.slug} className="text-sm">
          <Link href={`/practice/topics/${topic.slug}`} className="font-medium hover:underline">
            {topic.name}
          </Link>
          <span className="text-xs text-muted-foreground"> · {topic.reason}</span>
        </li>
      ))}
    </ul>
  );
}
