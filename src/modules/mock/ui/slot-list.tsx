"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarClock, Loader2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { bookSlotAction, cancelRequestAction, cancelSlotAction } from "../actions";
import { type PickerTopic, TopicPicker } from "./topic-picker";

export interface SlotRow {
  id: string;
  when: string;
  hostName: string;
  level: string;
  role: string;
  hostTopics: string[];
  note: string;
  hasLink: boolean;
}

/** Open slots to book. Booking asks which topics YOU want to be asked about. */
export function SlotList({ slots, topics }: { slots: SlotRow[]; topics: PickerTopic[] }) {
  const router = useRouter();
  const [booking, setBooking] = useState<SlotRow | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    booking &&
    startTransition(async () => {
      setError(null);
      const result = await bookSlotAction(booking.id, { topics: chosen });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/practice/mock/sessions/${result.data.sessionId}`);
    });

  return (
    <>
      <ul className="grid gap-3">
        {slots.map((slot) => (
          <li key={slot.id} className="flex flex-wrap items-start gap-3 rounded-lg border p-4">
            <CalendarClock className="mt-0.5 size-5 text-primary" aria-hidden />
            <div className="grid min-w-0 flex-1 gap-1">
              <p className="font-medium">{slot.when}</p>
              <p className="text-sm text-muted-foreground">
                {slot.hostName} · {slot.role} · {slot.level}
              </p>
              <ul className="flex flex-wrap gap-1" aria-label="Topics they want to be asked">
                {slot.hostTopics.map((topic) => (
                  <li key={topic}>
                    <Badge variant="secondary">{topic}</Badge>
                  </li>
                ))}
              </ul>
              {slot.note && <p className="text-sm">{slot.note}</p>}
            </div>
            <Button
              size="sm"
              onClick={() => {
                setChosen([]);
                setError(null);
                setBooking(slot);
              }}
            >
              Book
            </Button>
          </li>
        ))}
      </ul>
      <Dialog open={booking !== null} onOpenChange={(open) => !open && setBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book with {booking?.hostName}</DialogTitle>
            <DialogDescription>
              {booking?.when}. You take turns: 30 minutes each. Pick the topics you want to be asked
              about.
            </DialogDescription>
          </DialogHeader>
          <TopicPicker id="book-topics" topics={topics} value={chosen} onChange={setChosen} />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button onClick={confirm} disabled={pending || chosen.length === 0}>
              {pending && <Loader2 className="animate-spin" />} Confirm booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** My open slots and partner requests, each with a cancel button. */
export function MyOpenItems({
  slots,
  requests,
}: {
  slots: { id: string; when: string; topics: string[] }[];
  requests: { id: string; times: string[]; topics: string[] }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cancel = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Could not cancel");
      router.refresh();
    });
  if (slots.length === 0 && requests.length === 0) return null;
  return (
    <div className="grid gap-2">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <ul className="grid gap-2 text-sm">
        {slots.map((slot) => (
          <li key={slot.id} className="flex items-center gap-2 rounded-md border p-2">
            <Badge variant="info">Open slot</Badge>
            <span className="min-w-0 flex-1">
              {slot.when} · {slot.topics.join(", ")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => cancel(() => cancelSlotAction(slot.id))}
            >
              <X /> Cancel
            </Button>
          </li>
        ))}
        {requests.map((request) => (
          <li key={request.id} className="flex items-center gap-2 rounded-md border p-2">
            <Badge variant="warning">Looking for a partner</Badge>
            <span className="min-w-0 flex-1">
              {request.times.join(" · ")} · {request.topics.join(", ")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => cancel(() => cancelRequestAction(request.id))}
            >
              <X /> Cancel
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
