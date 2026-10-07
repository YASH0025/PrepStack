"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus } from "lucide-react";

import { FormField, applyServerErrors } from "@/components/rhf";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { addManualCardAction } from "../actions";
import { type ManualCardInput, ManualCardInputSchema } from "../schemas";

export function ManualCardForm() {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();
  const form = useForm<ManualCardInput>({
    resolver: zodResolver(ManualCardInputSchema),
    defaultValues: { prompt: "", answer: "" },
  });
  const errors = form.formState.errors;

  const submit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await addManualCardAction(values);
      if (!result.ok) {
        applyServerErrors(result, form.setError);
        return;
      }
      form.reset({ prompt: "", answer: "" });
      setAdded(true);
      router.refresh();
    }),
  );

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <FormField id="card-prompt" label="Prompt" error={errors.prompt}>
        {(c) => (
          <Textarea
            {...c}
            rows={2}
            placeholder="e.g. What does a CDN cache key include?"
            {...form.register("prompt")}
          />
        )}
      </FormField>
      <FormField id="card-answer" label="Answer" error={errors.answer}>
        {(c) => <Textarea {...c} rows={3} {...form.register("answer")} />}
      </FormField>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
          Add card
        </Button>
        {added && !form.formState.isDirty && (
          <span className="text-xs text-muted-foreground" role="status">
            Added. It is due today.
          </span>
        )}
      </div>
    </form>
  );
}
