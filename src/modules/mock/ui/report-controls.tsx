"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

import { resolveMockReportAction } from "../moderation-actions";

export function MockReportControls({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [days, setDays] = useState("0");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          aria-label="Action"
          className="w-48"
          value={days}
          onChange={(event) => setDays(event.target.value)}
        >
          <option value="0">Dismiss</option>
          <option value="7">Pause booking 7 days</option>
          <option value="30">Pause booking 30 days</option>
          <option value="-1">Lift an existing pause</option>
        </NativeSelect>
        <Input
          aria-label="Note"
          placeholder="Note (optional)"
          className="w-60"
          maxLength={200}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await resolveMockReportAction(reportId, Number(days), note);
              if (!result.ok) setError(result.error);
              else router.refresh();
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />} Resolve
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
