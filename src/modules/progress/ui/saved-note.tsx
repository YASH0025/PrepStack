"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { updateSavedNoteAction } from "../actions";

const NoteFormSchema = z.object({ note: z.string().max(2000, "Keep notes under 2000 characters") });
type NoteForm = z.infer<typeof NoteFormSchema>;

/** Personal note on a saved question (React Hook Form + Zod). */
export function SavedNote({ questionId, note }: { questionId: string; note: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<NoteForm>({
    resolver: zodResolver(NoteFormSchema),
    defaultValues: { note },
  });

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await updateSavedNoteAction({ questionId, note: values.note });
      setMessage(result.ok ? "Saved" : result.error);
      if (result.ok) form.reset(values);
    }),
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-2">
      <label htmlFor={`note-${questionId}`} className="sr-only">
        Your note
      </label>
      <Textarea
        id={`note-${questionId}`}
        rows={2}
        placeholder="Your note: where you got stuck, an example to remember…"
        aria-invalid={form.formState.errors.note ? true : undefined}
        {...form.register("note")}
      />
      {form.formState.errors.note && (
        <p className="text-xs text-destructive">{form.formState.errors.note.message}</p>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={pending || !form.formState.isDirty}
        >
          {pending && <Loader2 className="animate-spin" />}
          Save note
        </Button>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>
    </form>
  );
}
