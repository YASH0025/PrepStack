"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, Loader2, Send, ShieldCheck } from "lucide-react";

import { applyServerErrors } from "@/components/rhf";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { type ReportDraft, ReportDraftSchema } from "@/modules/community/schemas";
import { ReportDraftFields } from "@/modules/community/ui/report-draft-fields";
import { ReportView } from "@/modules/community/ui/report-view";

import { type ShareFindingSummary, previewShareAction, publishShareAction } from "../share-actions";

const FINDING_LABELS: Record<ShareFindingSummary["kind"], [string, string]> = {
  NAME: ["name", "names"],
  EMAIL: ["email address", "email addresses"],
  PHONE: ["phone number", "phone numbers"],
  LINK: ["link", "links"],
  AMOUNT: ["money amount", "money amounts"],
  DATE: ["exact date", "exact dates"],
};

function describeRemoved(removed: ShareFindingSummary[]): string {
  return removed
    .map(({ kind, count }) => `${count} ${FINDING_LABELS[kind][count === 1 ? 0 : 1]}`)
    .join(", ");
}

/**
 * Edit → preview (server scrub, exact public version) → confirm → publish.
 * Any edit after previewing hides the publish button until previewed again.
 */
export function ShareForm({
  roundId,
  initial,
  initiallyRemoved,
  topicNames,
}: {
  roundId: string;
  initial: ReportDraft;
  initiallyRemoved: ShareFindingSummary[];
  topicNames: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<{
    draft: ReportDraft;
    removed: ShareFindingSummary[];
  } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const form = useForm<ReportDraft>({
    resolver: zodResolver(ReportDraftSchema),
    defaultValues: initial,
  });
  const { handleSubmit, reset, setError } = form;

  // Any edit invalidates the preview, so what is confirmed is always what is published.
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ type }) => {
          if (type !== "change") return;
          setPreview(null);
          setConfirmed(false);
        },
      }),
    [form],
  );

  const onPreview = handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await previewShareAction(roundId, values);
      if (!result.ok) {
        applyServerErrors(result, setError);
        setMessage({ ok: false, text: result.error });
        return;
      }
      reset(result.data.draft);
      setPreview(result.data);
      setConfirmed(false);
      requestAnimationFrame(() =>
        document.getElementById("share-preview")?.scrollIntoView({ behavior: "smooth" }),
      );
    });
  });

  const onPublish = () => {
    if (!preview || !confirmed) return;
    startTransition(async () => {
      const result = await publishShareAction(roundId, preview.draft);
      if (!result.ok) {
        setPreview(null);
        setMessage({ ok: false, text: result.error });
        return;
      }
      setPreview(null);
      setMessage({
        ok: true,
        text: "Thanks for sharing! A moderator will review it before it appears in Interview Intel.",
      });
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6">
      {initiallyRemoved.length > 0 && (
        <Alert>
          <ShieldCheck aria-hidden />
          <AlertTitle>We already removed personal details</AlertTitle>
          <AlertDescription>
            Removed {describeRemoved(initiallyRemoved)}. People, salaries, contacts, notes, feedback
            and exact dates are never copied. Check the text below for anything else that could
            identify you or the interviewers.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={onPreview} className="grid gap-5" noValidate>
        <ReportDraftFields
          form={form}
          topicNames={topicNames}
          lockCompany
          onQuestionRemoved={() => {
            setPreview(null);
            setConfirmed(false);
          }}
        />

        {message && (
          <Alert variant={message.ok ? "default" : "destructive"}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-fit" disabled={pending}>
          {pending && !preview ? <Loader2 className="animate-spin" /> : <Eye />} Preview public
          version
        </Button>
      </form>

      {preview && (
        <section
          id="share-preview"
          className="grid gap-4 rounded-xl border-2 border-primary/40 p-4"
        >
          <div className="grid gap-1">
            <h2 className="text-base font-semibold">Exactly what others will see</h2>
            <p className="text-sm text-muted-foreground">
              {preview.removed.length > 0
                ? `We removed ${describeRemoved(preview.removed)} from your edits.`
                : "No further personal details found."}{" "}
              Your name, the interviewers and this round&apos;s private notes are not included, and
              nothing links this report back to you.
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4">
            <ReportView report={preview.draft} topicNames={topicNames} />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="share-confirm"
              checked={confirmed}
              onCheckedChange={(value) => setConfirmed(value === true)}
            />
            <Label htmlFor="share-confirm" className="leading-snug font-normal">
              I checked this report. It contains no names, contacts or other details that could
              identify me, the interviewers or anyone else.
            </Label>
          </div>
          <Button className="w-fit" onClick={onPublish} disabled={!confirmed || pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Send />} Publish anonymously
          </Button>
        </section>
      )}
    </div>
  );
}
