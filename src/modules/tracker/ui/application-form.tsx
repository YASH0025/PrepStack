"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { type z } from "zod";
import { Loader2 } from "lucide-react";

import { FormField, applyServerErrors } from "@/components/rhf";
import { TagInput } from "@/components/tag-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { saveApplicationAction } from "../actions";
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type Application,
  ApplicationInputSchema,
  SOURCES,
  SOURCE_LABELS,
} from "../schemas";

type Values = z.input<typeof ApplicationInputSchema>;

function defaults(application?: Application): Values {
  return {
    companyName: application?.companyName ?? "",
    jobTitle: application?.jobTitle ?? "",
    technologies: application?.technologies ?? [],
    jobLink: application?.jobLink ?? "",
    source: application?.source ?? "LINKEDIN",
    referrerName: application?.referrerName ?? "",
    agency: application?.agency ?? "",
    appliedOn: application?.appliedOn ?? "",
    status: application?.status ?? "APPLIED",
    expectedSalary: application?.expectedSalary ?? "",
    offeredSalary: application?.offeredSalary ?? "",
    offerJoiningDate: application?.offerJoiningDate ?? "",
    notes: application?.notes ?? "",
    followUpDate: application?.followUpDate ?? "",
    outcome: application?.outcome ?? "",
  };
}

/** Create/edit an application (React Hook Form + Zod, validated again on the server). */
export function ApplicationFormDialog({
  open,
  onOpenChange,
  application,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application?: Application;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<Values, unknown, z.output<typeof ApplicationInputSchema>>({
    resolver: zodResolver(ApplicationInputSchema),
    defaultValues: defaults(application),
  });
  const { register, control, formState } = form;
  const errors = formState.errors;

  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      setError(null);
      const result = await saveApplicationAction(application?.id ?? null, values);
      if (!result.ok) {
        setError(result.error);
        applyServerErrors(result, form.setError);
        return;
      }
      onOpenChange(false);
      form.reset(application ? values : defaults());
      router.refresh();
      onSaved?.(result.data.id);
    }),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) form.reset(defaults(application));
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{application ? "Edit application" : "New application"}</DialogTitle>
          <DialogDescription>
            Private to you. Salary, referrer, agency and notes are encrypted.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="companyName" label="Company" error={errors.companyName}>
              {(c) => <Input {...c} autoFocus {...register("companyName")} />}
            </FormField>
            <FormField id="jobTitle" label="Job title" error={errors.jobTitle}>
              {(c) => <Input {...c} {...register("jobTitle")} />}
            </FormField>
            <FormField id="status" label="Status" error={errors.status}>
              {(c) => (
                <NativeSelect {...c} {...register("status")}>
                  {APPLICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {APPLICATION_STATUS_LABELS[status]}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField id="source" label="Source" error={errors.source}>
              {(c) => (
                <NativeSelect {...c} {...register("source")}>
                  {SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {SOURCE_LABELS[source]}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField id="appliedOn" label="Applied on" error={errors.appliedOn}>
              {(c) => <Input {...c} type="date" {...register("appliedOn")} />}
            </FormField>
            <FormField id="jobLink" label="Job link" error={errors.jobLink}>
              {(c) => <Input {...c} type="url" placeholder="https://" {...register("jobLink")} />}
            </FormField>
          </div>
          <Controller
            control={control}
            name="technologies"
            render={({ field, fieldState }) => (
              <FormField id="technologies" label="Technologies" error={fieldState.error}>
                {(c) => (
                  <TagInput
                    id={c.id}
                    value={field.value ?? []}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="React, Node.js…"
                  />
                )}
              </FormField>
            )}
          />
          <details className="rounded-lg border p-4" open={Boolean(application)}>
            <summary className="cursor-pointer text-sm font-medium">
              More details (referrer, salary, follow-up, notes)
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FormField id="referrerName" label="Referrer" error={errors.referrerName}>
                {(c) => <Input {...c} {...register("referrerName")} />}
              </FormField>
              <FormField id="agency" label="Recruitment agency" error={errors.agency}>
                {(c) => <Input {...c} {...register("agency")} />}
              </FormField>
              <FormField id="expectedSalary" label="Expected salary" error={errors.expectedSalary}>
                {(c) => <Input {...c} placeholder="e.g. 30 LPA" {...register("expectedSalary")} />}
              </FormField>
              <FormField id="offeredSalary" label="Offered salary" error={errors.offeredSalary}>
                {(c) => <Input {...c} {...register("offeredSalary")} />}
              </FormField>
              <FormField
                id="offerJoiningDate"
                label="Offer joining date"
                error={errors.offerJoiningDate}
              >
                {(c) => <Input {...c} type="date" {...register("offerJoiningDate")} />}
              </FormField>
              <FormField id="followUpDate" label="Follow up on" error={errors.followUpDate}>
                {(c) => <Input {...c} type="date" {...register("followUpDate")} />}
              </FormField>
              <FormField
                id="outcome"
                label="Outcome"
                className="sm:col-span-2"
                error={errors.outcome}
              >
                {(c) => <Input {...c} {...register("outcome")} />}
              </FormField>
              <FormField
                id="notes"
                label="Private notes"
                className="sm:col-span-2"
                error={errors.notes}
              >
                {(c) => <Textarea {...c} rows={4} {...register("notes")} />}
              </FormField>
            </div>
          </details>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {application ? "Save changes" : "Add application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
