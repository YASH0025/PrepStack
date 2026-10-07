"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { type z } from "zod";
import { Columns3, Loader2, Trash2 } from "lucide-react";

import { FormField } from "@/components/rhf";
import { TagInput } from "@/components/tag-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

import { createCustomFieldAction, deleteCustomFieldAction } from "../actions";
import { type CustomField, CustomFieldInputSchema } from "../schemas";

type Values = z.input<typeof CustomFieldInputSchema>;

const TYPE_LABELS: Record<CustomField["type"], string> = {
  TEXT: "Text",
  NUMBER: "Number",
  DATE: "Date",
  SELECT: "Dropdown",
  CHECKBOX: "Checkbox",
};

/** Manage the spreadsheet's custom columns. */
export function CustomFieldsDialog({ fields }: { fields: CustomField[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(CustomFieldInputSchema),
    defaultValues: { name: "", type: "TEXT", options: [] },
  });
  const type = form.watch("type");

  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      setError(null);
      const result = await createCustomFieldAction(values);
      if (!result.ok) return setError(result.error);
      form.reset({ name: "", type: "TEXT", options: [] });
      router.refresh();
    }),
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 /> Columns
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Custom columns</DialogTitle>
          <DialogDescription>Add your own fields to the spreadsheet (up to 20).</DialogDescription>
        </DialogHeader>
        <ul className="grid gap-2">
          {fields.length === 0 && (
            <li className="text-sm text-muted-foreground">No custom columns yet.</li>
          )}
          {fields.map((field) => (
            <li key={field.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
              <span className="flex-1">{field.name}</span>
              <Badge variant="muted">{TYPE_LABELS[field.type]}</Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete column ${field.name}`}
                onClick={() => {
                  if (!window.confirm(`Delete the "${field.name}" column and its values?`)) return;
                  startTransition(async () => {
                    await deleteCustomFieldAction(field.id);
                    router.refresh();
                  });
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <form onSubmit={submit} className="grid gap-3 rounded-lg border border-dashed p-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="cf-name" label="Column name" error={form.formState.errors.name}>
              {(c) => <Input {...c} {...form.register("name")} />}
            </FormField>
            <FormField id="cf-type" label="Type">
              {(c) => (
                <NativeSelect {...c} {...form.register("type")}>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </FormField>
          </div>
          {type === "SELECT" && (
            <Controller
              control={form.control}
              name="options"
              render={({ field }) => (
                <FormField id="cf-options" label="Options" hint="Press Enter after each option.">
                  {(c) => (
                    <TagInput id={c.id} value={field.value ?? []} onChange={field.onChange} />
                  )}
                </FormField>
              )}
            />
          )}
          <Button type="submit" size="sm" className="w-fit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Add column
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
