"use client";

import * as React from "react";
import { useOptimistic, useTransition } from "react";

import { cn } from "@/lib/utils";

import { toggleSheetItemAction } from "../actions";

/** A checkable revision-sheet line. The check state is saved per round. */
export function CheckRow({
  roundId,
  itemKey,
  checked,
  children,
  className,
}: {
  roundId: string;
  itemKey: string;
  checked: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [, startTransition] = useTransition();
  const id = `check-${itemKey.replace(/[^a-z0-9]/gi, "-").slice(0, 80)}`;
  return (
    <div className={cn("flex break-inside-avoid items-start gap-2.5", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-1 size-4 shrink-0 accent-primary print:hidden"
        aria-labelledby={`${id}-text`}
        checked={optimistic}
        onChange={(event) => {
          const next = event.target.checked;
          startTransition(async () => {
            setOptimistic(next);
            await toggleSheetItemAction({ roundId, key: itemKey, checked: next });
          });
        }}
      />
      <span aria-hidden className="mt-0.5 hidden font-mono text-sm print:inline">
        {optimistic ? "☑" : "☐"}
      </span>
      {/* Not a <label>: items can contain links, lists and details, which labels may not. */}
      <div
        id={`${id}-text`}
        className={cn(
          "min-w-0 flex-1 text-sm",
          optimistic && "text-muted-foreground line-through decoration-muted-foreground/50",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-accent print:hidden"
    >
      Print or save as PDF
    </button>
  );
}
