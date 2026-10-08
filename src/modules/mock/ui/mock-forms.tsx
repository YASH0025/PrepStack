"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, type Resolver, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { FormField, applyServerErrors } from "@/components/rhf";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { BAND_LABELS, EXPERIENCE_BANDS } from "@/lib/domain";

import { joinMockAction, postSlotAction, requestMatchAction } from "../actions";
import { JoinMockInputSchema, MatchRequestInputSchema, PostSlotInputSchema } from "../schemas";
import { type PickerTopic, TopicPicker } from "./topic-picker";

type Message = { ok: boolean; text: string } | null;

function FormMessage({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <Alert variant={message.ok ? "success" : "destructive"}>
      <AlertDescription>{message.text}</AlertDescription>
    </Alert>
  );
}

/* --------------------------------- join --------------------------------- */

/** Same rules as the server, but `agree` starts unchecked. */
const JoinFormSchema = JoinMockInputSchema.extend({
  agree: z.boolean().refine((value) => value, "Please accept the guidelines"),
});
type JoinValues = z.input<typeof JoinFormSchema>;

export function JoinMockForm({
  defaults,
  roles,
  isEdit,
}: {
  defaults: Omit<JoinValues, "agree">;
  roles: { id: string; name: string }[];
  isEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message>(null);
  const form = useForm<JoinValues>({
    resolver: zodResolver(JoinFormSchema) as unknown as Resolver<JoinValues>,
    defaultValues: { ...defaults, agree: isEdit },
  });
  const errors = form.formState.errors;
  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await joinMockAction(values);
      if (!result.ok) {
        applyServerErrors(result, form.setError);
        setMessage({ ok: false, text: result.error });
        return;
      }
      router.push("/practice/mock");
      router.refresh();
    }),
  );
  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-4" noValidate>
      <FormField
        id="mock-name"
        label="Display name"
        hint="What partners see. Your email is never shown."
        error={errors.displayName}
      >
        {(props) => <Input {...props} {...form.register("displayName")} />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="mock-role" label="Role you are preparing for" error={errors.roleId}>
          {(props) => (
            <NativeSelect {...props} {...form.register("roleId")}>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="mock-band" label="Experience" error={errors.band}>
          {(props) => (
            <NativeSelect {...props} {...form.register("band")}>
              {EXPERIENCE_BANDS.map((band) => (
                <option key={band} value={band}>
                  {BAND_LABELS[band]}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
      </div>
      <input type="hidden" {...form.register("timezone")} />
      <Controller
        control={form.control}
        name="showScore"
        render={({ field }) => (
          <div className="flex items-start gap-2">
            <Checkbox
              id="mock-show-score"
              checked={field.value}
              onCheckedChange={(value) => field.onChange(value === true)}
            />
            <Label htmlFor="mock-show-score" className="leading-snug font-normal">
              Show my peer score on my readiness passport (only after 3 sessions; written feedback
              is never shown).
            </Label>
          </div>
        )}
      />
      {!isEdit && (
        <Controller
          control={form.control}
          name="agree"
          render={({ field }) => (
            <div className="grid gap-1">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="mock-agree"
                  checked={field.value}
                  onCheckedChange={(value) => field.onChange(value === true)}
                  aria-describedby={errors.agree ? "mock-agree-error" : undefined}
                />
                <Label htmlFor="mock-agree" className="leading-snug font-normal">
                  I will be respectful, join on time or cancel at least 2 hours ahead, and keep what
                  my partner shares private.
                </Label>
              </div>
              {errors.agree && (
                <p id="mock-agree-error" className="text-xs text-destructive" role="alert">
                  {errors.agree.message}
                </p>
              )}
            </div>
          )}
        />
      )}
      <FormMessage message={message} />
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {isEdit ? "Save" : "Join mock interviews"}
      </Button>
    </form>
  );
}

/* ------------------------------- post slot ------------------------------- */

type SlotValues = z.input<typeof PostSlotInputSchema>;

export function PostSlotForm({ topics, today }: { topics: PickerTopic[]; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message>(null);
  const form = useForm<SlotValues>({
    resolver: zodResolver(PostSlotInputSchema) as unknown as Resolver<SlotValues>,
    defaultValues: { date: "", time: "19:00", topics: [], meetingLink: "", note: "" },
  });
  const errors = form.formState.errors;
  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      setMessage(null);
      const result = await postSlotAction(values);
      if (!result.ok) {
        applyServerErrors(result, form.setError);
        setMessage({ ok: false, text: result.error });
        return;
      }
      form.reset();
      setMessage({ ok: true, text: "Slot posted. You will be notified when someone books it." });
      router.refresh();
    }),
  );
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="slot-date" label="Date" error={errors.date}>
          {(props) => <Input {...props} type="date" min={today} {...form.register("date")} />}
        </FormField>
        <FormField id="slot-time" label="Start time (60 minutes)" error={errors.time}>
          {(props) => <Input {...props} type="time" step={900} {...form.register("time")} />}
        </FormField>
      </div>
      <FormField
        id="slot-topics"
        label="Topics you want to be asked about"
        error={errors.topics as { message?: string } | undefined}
      >
        {(props) => (
          <Controller
            control={form.control}
            name="topics"
            render={({ field }) => (
              <TopicPicker
                id={props.id}
                topics={topics}
                value={field.value}
                onChange={field.onChange}
                invalid={props["aria-invalid"]}
                describedBy={props["aria-describedby"]}
              />
            )}
          />
        )}
      </FormField>
      <FormField
        id="slot-link"
        label="Meeting link (optional)"
        hint="Google Meet or Zoom. You can add it later."
        error={errors.meetingLink}
      >
        {(props) => (
          <Input
            {...props}
            type="url"
            placeholder="https://meet.google.com/…"
            {...form.register("meetingLink")}
          />
        )}
      </FormField>
      <FormField id="slot-note" label="Note (optional)" error={errors.note}>
        {(props) => <Input {...props} maxLength={200} {...form.register("note")} />}
      </FormField>
      <FormMessage message={message} />
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Post slot
      </Button>
    </form>
  );
}

/* ----------------------------- find partner ----------------------------- */

type MatchValues = z.input<typeof MatchRequestInputSchema>;

export function FindPartnerForm({ topics, today }: { topics: PickerTopic[]; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message>(null);
  const form = useForm<MatchValues>({
    resolver: zodResolver(MatchRequestInputSchema) as unknown as Resolver<MatchValues>,
    defaultValues: { times: [{ date: "", time: "19:00" }], topics: [], meetingLink: "" },
  });
  const times = useFieldArray({ control: form.control, name: "times" });
  const errors = form.formState.errors;
  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      setMessage(null);
      const result = await requestMatchAction(values);
      if (!result.ok) {
        applyServerErrors(result, form.setError);
        setMessage({ ok: false, text: result.error });
        return;
      }
      if (result.data.sessionId) {
        router.push(`/practice/mock/sessions/${result.data.sessionId}`);
        return;
      }
      form.reset();
      setMessage({
        ok: true,
        text: "We are looking for a partner. You will get a notification as soon as someone matches.",
      });
      router.refresh();
    }),
  );
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">
          Times that work for you (more times, faster match)
        </legend>
        {times.fields.map((field, index) => (
          <div key={field.id} className="flex flex-wrap items-end gap-2">
            <FormField id={`match-date-${index}`} label="Date" error={errors.times?.[index]?.date}>
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  min={today}
                  {...form.register(`times.${index}.date`)}
                />
              )}
            </FormField>
            <FormField id={`match-time-${index}`} label="Start" error={errors.times?.[index]?.time}>
              {(props) => (
                <Input
                  {...props}
                  type="time"
                  step={900}
                  {...form.register(`times.${index}.time`)}
                />
              )}
            </FormField>
            {times.fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove time ${index + 1}`}
                onClick={() => times.remove(index)}
              >
                <Trash2 />
              </Button>
            )}
          </div>
        ))}
        {times.fields.length < 10 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => times.append({ date: "", time: "19:00" })}
          >
            <Plus /> Add another time
          </Button>
        )}
        {errors.times?.message && (
          <p className="text-xs text-destructive" role="alert">
            {errors.times.message}
          </p>
        )}
      </fieldset>
      <FormField
        id="match-topics"
        label="Topics you want to be asked about"
        error={errors.topics as { message?: string } | undefined}
      >
        {(props) => (
          <Controller
            control={form.control}
            name="topics"
            render={({ field }) => (
              <TopicPicker
                id={props.id}
                topics={topics}
                value={field.value}
                onChange={field.onChange}
                invalid={props["aria-invalid"]}
                describedBy={props["aria-describedby"]}
              />
            )}
          />
        )}
      </FormField>
      <FormField
        id="match-link"
        label="Meeting link (optional)"
        hint="If you add one, it is used for the session. Either partner can add it later."
        error={errors.meetingLink}
      >
        {(props) => (
          <Input
            {...props}
            type="url"
            placeholder="https://meet.google.com/…"
            {...form.register("meetingLink")}
          />
        )}
      </FormField>
      <FormMessage message={message} />
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Find a partner
      </Button>
    </form>
  );
}
