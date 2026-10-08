"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Copy, Link2, Link2Off, Loader2, RefreshCw } from "lucide-react";

import { FormField, applyServerErrors } from "@/components/rhf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  createPassportLinkAction,
  disablePassportAction,
  refreshPassportAction,
  setPassportNameAction,
} from "../actions";
import { PassportNameInputSchema } from "../schemas";

export function PassportControls({ url, enabled }: { url: string | null; enabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return;
    startTransition(async () => {
      setError(null);
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Something went wrong");
      router.refresh();
    });
  };
  return (
    <div className="grid gap-3">
      {enabled && url ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input readOnly value={url} aria-label="Share link" className="min-w-64 flex-1" />
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <Copy /> {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No share link yet. Anyone with the link can view your passport; it is not listed on search
          engines.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {enabled ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(refreshPassportAction)}
            >
              {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Update now
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  createPassportLinkAction,
                  "Create a new link? The current link will stop working.",
                )
              }
            >
              <Link2 /> New link
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={pending}
              onClick={() =>
                run(disablePassportAction, "Turn off sharing? The link will stop working.")
              }
            >
              <Link2Off /> Turn off sharing
            </Button>
          </>
        ) : (
          <Button disabled={pending} onClick={() => run(createPassportLinkAction)}>
            {pending && <Loader2 className="animate-spin" />} Create share link
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function PassportNameForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const form = useForm<{ displayName: string }>({
    resolver: zodResolver(PassportNameInputSchema),
    defaultValues: { displayName: defaultName },
  });
  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      setSaved(false);
      const result = await setPassportNameAction(values);
      if (!result.ok) {
        applyServerErrors(result, form.setError);
        return;
      }
      setSaved(true);
      router.refresh();
    }),
  );
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2" noValidate>
      <FormField
        id="passport-name"
        label="Name on the passport"
        error={form.formState.errors.displayName}
        className="min-w-56 flex-1"
      >
        {(props) => <Input {...props} {...form.register("displayName")} />}
      </FormField>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} {saved ? "Saved" : "Save"}
      </Button>
    </form>
  );
}
